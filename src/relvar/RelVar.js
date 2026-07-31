import {EventHub, eql, pushHandles} from '../lib.js';

// TupleType

// Models a tuple type: a set of named attributes with certain required functions as per the RDB literature.
//
// defines
//     * a set of attribute names
//     * a set of functions for each attribute, namely an accessor, collator, comparator, and mutator
//     * a "tupleVar" type, which abstracts an instance of a tuple of the given tuple type
//
export class TupleType {
    constructor(kwargs) {
        const attributeDefs = this._attributeDefs = {};
        const attrNames = this._attrNames = [];
        const accessors = this._accessors = {};
        const collators = this._collators = {};
        const comparators = this._comparators = {};
        const mutators = this._mutators = {};
        kwargs.attributes.map(attribute => {
            const name = attribute.name;
            if (attributeDefs[name]) {
                throw new Error(`TupleType: duplicate attribute name (${name})`);
            }
            attributeDefs[name] = attribute;
            attrNames.push(name);
            const accessor = attribute.accessor;
            if (!accessor) {
                throw new Error(`TupleType:missing accessor for attribute (${name})`);
            }
            accessors[name] = accessor;
            const collator = collators[name] = attribute.collator || function (lhs, rhs) {
                lhs = accessor(lhs);
                rhs = accessor(rhs);
                return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
            };
            comparators[name] = attribute.eql || (
                attribute.collator
                    ? function (lhs, rhs) {
                        return collator(lhs, rhs) === 0;
                    }
                    : function (lhs, rhs) {
                        return lhs === rhs;
                    }
            );

            // mutator is not required
            mutators[name] = attribute.mutator;
        });

        // tupleVar
        //
        // Models a single tuple variable--a set of (attribute, value) pairs--iaw the RDB literature. It provides
        // an interface to read and write individual attribute values.
        //
        const TupleVarType = class {
            constructor(rawRow) {
                this._rawRow = rawRow instanceof TupleVarType ? rawRow.copyRaw() : rawRow;
            }

            get(name) {
                return accessors[name](this._rawRow);
            }

            set(name, value) {
                mutators[name](this._rawRow, value);
            }

            getValues(...names) {
                const rawRow = this._rawRow;
                return names.map(name => accessors[name](rawRow));
            }

            setValues(values) {
                const rawRow = this._rawRow;
                Object.keys(values).forEach(name => mutators[name](rawRow, values[name]));
            }

            eql(otherRow) {
                const row = this._rawRow;
                otherRow = otherRow._rawRow;
                return attrNames.every(name => comparators[name](row, otherRow));
            }

            diff(otherRow) {
                const result = [];
                const thisRow = this._rawRow;
                otherRow = otherRow._rawRow;
                attrNames.forEach(name => {
                    if (!comparators[name](thisRow, otherRow)) {
                        result.push({[name]: accessor[name](otherRow)});
                    }
                });
                return result;
            }

            _copyRaw() {
                return this._rawRow.slice();
            }
        };

        this._tupleVarType = kwargs.tupleVarTypeFactory
            ? kwargs.tupleVarTypeFactory(TupleVarType)
            : TupleVarType;
    }

    get attributeDefs() {
        return this._attributeDefs;
    }

    get attrNames() {
        return this._attrNames;
    }

    get accessors() {
        return this._accessors;
    }

    get collators() {
        return this._collators;
    }

    get comparators() {
        return this._comparators;
    }

    get mutators() {
        return this._mutators;
    }

    get tupleVarType() {
        return this._tupleVarType;
    }

    getOrderDefs(order) {
        if (!order) {
            order = this.attrNames;
        }
        order = order.slice();

        const seen = {};
        order.forEach(name => {
            if (!this.attributeDefs[name]) {
                throw new Error(`TupleType:getOrderDefs: unknown attribute name (${name})`);
            }
            seen[name] = true
        });
        this._lastOrder && this._lastOrder.forEach(name => {
            if (!seen[name]) {
                seen[name] = true;
                order.push(name);
            }
        });
        this.attrNames.forEach(name => {
            if (!seen[name]) {
                seen[name] = true;
                order.push(name);
            }
        });
        if (this._lastOrder && this._lastOrder.every((name, i) => name === order[i])) {
            // no change
            return [order, this._lastRowComparator];
        }

        const collators = order.map(name => this.collators[name]);
        const comparatorLength = this.comparators.length;
        const rowComparator = function (lhs, rhs) {
            let i = 0;
            while (i < comparatorLength) {
                const relativeOrder = collators[i++](lhs, rhs);
                if (relativeOrder) {
                    return relativeOrder;
                }
            }
            return 0;
        };
        return [(this._lastOrder = order), (this._lastRowComparator = rowComparator)];
    }
}

// RelDefTupleType
//
// Extends a TupleType to include the notion of a set of attributes that define a candidate key.
//
class RelDefTupleType extends TupleType {
    constructor(kwargs) {
        super({...kwargs, tupleVarTypeFactory: undefined});
        if (!kwargs.keys) {
            throw new Error(`RelDefTupleType: missing keys`);
        }
        const simpleKeyGetters = this._simpleKeyGetters = [];
        const udtKeyGetters = this._udtKeyGetters = [];
        const keyMap = this._keyMap = {};
        this._keys = kwargs.keys;
        this._keys.forEach(key => {
            this._keyMap[key] = true;
            const attributeDef = this.attributeDefs[key];
            if (!attributeDef) {
                throw new Error(`RelDefTupleType: unknown key(${key})`);
            }
            const keyValueGetter = attributeDef.asKeyComponent || this.accessors[key];
            attributeDef.keyType === 'udt'
                ? udtKeyGetters.push(keyValueGetter)
                : simpleKeyGetters.push(keyValueGetter);
        });
        this._hasUdtKeys = udtKeyGetters.length;
        const nonkeyMap = this._nonkeyMap = {};
        this.attrNames.forEach(name => !keyMap[name] && (nonkeyMap[name] = true));
        const nonkeys = this._nonkeys = Object.keys(nonkeyMap);

        let getSimpleKey = kwargs.getSimpleKey || function (rawRow) {
            return simpleKeyGetters.map(getter => getter(rawRow)).join('\x1f');
        };
        let getUdtKey = kwargs.getUdtKey || function (row) {
            return udtKeyGetters.map(getter => getter(row));
        };
        let getKey = this._hasUdtKeys
            ? rawRow => [getSimpleKey(rawRow), ...(getUdtKey(this._rawRow))]
            : rawRow => getSimpleKey(rawRow);

        const comparators = this.comparators;
        const accessors = this.accessors;
        const TupleVar = class extends this.tupleVarType {
            get simpleKey() {
                return getSimpleKey(this._rawRow);
            }

            get udtKey() {
                return getUdtKey(this._rawRow);
            }

            get key() {
                return getKey(this._rawRow);
            }

            nonkeyDiff(otherRow) {
                const result = [];
                const thisRow = this._rawRow;
                otherRow = otherRow._rawRow;
                nonkeys.forEach(name => {
                    if (!comparators[name](thisRow, otherRow)) {
                        result.push({[name]: accessors[name](otherRow)});
                    }
                });
                return result;
            }
        };

        this._tupleVarType = kwargs.tupleVarTypeFactory
            ? kwargs.tupleVarTypeFactory(TupleVar)
            : TupleVar;
    }

    get keys() {
        return this._keys;
    }

    get nonkeys() {
        return this._nonkeys;
    }

    get keyMap() {
        return this._keyMap;
    }

    get nonkeyMap() {
        return this._nonkeyMap;
    }

    isKey(name) {
        return this._keyMap[name];
    }

    get simpleKeyGetters() {
        return this._simpleKeyGetters;
    }

    get udtKeyGetters() {
        return this._udtKeyGetters;
    }

    get hasUdtKeys() {
        return this._hasUdtKeys;
    }
}

export class RelVar extends EventHub {
    constructor(kwargs) {
        super(kwargs);
        const relDef = kwargs.relDef;
        const tupleType = this._tupleType = relDef.tupleType instanceof RelDefTupleType
            ? relDef.tupleType
            : relDef.tupleDefTypeFactory
                ? relDef.tupleDefTypeFactory(new RelDefTupleType(relDef))
                : new RelDefTupleType(relDef);

        const [order, rowComparator] = tupleType.getOrderDefs(kwargs.order || tupleType.attrNames);
        this._order = order;
        this._rowComparator = rowComparator;

        const owningRelVar = this;
        const keyMap = tupleType.keyMap;
        const comparators = tupleType.comparators;
        const accessors = tupleType.accessors;
        const mutators = tupleType.mutators;
        const simpleKeyGetters = tupleType.simpleKeyGetters;
        const udtKeyGetters = tupleType.udtKeyGetters;
        const TupleVar = class extends tupleType.tupleVarType {
            constructor(rawRow, uid) {
                super(rawRow);
                this._ruid = uid;
            }

            get owningRelvar() {
                return this._ruid && owningRelVar;
            }

            get ruid() {
                return this._ruid;
            }

            get index() {
                if (!this._ruid) {
                    return undefined;
                }
                return owningRelVar && owningRelVar._ruidToOrder.get(this._ruid);
            }

            advise(initialize, name, handler) {
                if (!this._ruid) {
                    throw new Error('RelVar:advise: row was destroyed');
                }

                // arg juggle
                if (!handler) {
                    handler = name;
                    name = initialize;
                }

                if (name === 'updated') {
                    name = 'u';
                } else if (name === 'deleted') {
                    name = 'd';
                } else {
                    throw new Error('RelVar:Row:advise:unknown event name');
                }
                if (initialize) {
                    handler(this);
                }
                pushHandles(this._listeners || (this._listeners = []), owningRelVar.advise(`${name}${this._ruid}`, handler));
            }

            set(name, value) {
                if (!this._ruid) {
                    super.set(name, value);
                    return;
                }

                if (keyMap[name]) {
                    throw new Error(`RelVar:Row:set:attempt to mutate key (${name})`);
                }

                if (comparators[name](this._rawRow, value)) {
                    return;
                }

                const oldValue = accessors[name](this._rawRow);
                mutators[name](this._rawRow, value);
                const attributes= [{[name]: oldValue}];
                owningRelVar.bdNotify({type: `u${this._ruid}`, attributes, row: this});
                owningRelVar.bdNotify({type: 'update-row', attributes, row: this});
            }

            setValues(values) {
                if (!this._ruid) {
                    super.setValues(values);
                    return;
                }

                const rawRow = this._rawRow;
                Object.keys(values).forEach(name => {
                    if (keyMap[name]) {
                        throw new Error(`RelVar:Row:set: attempt to mutate key (${name})`);
                    }
                    if (comparators[name](this.get(name), values[name])) {
                        values.delete(key);
                    }
                });
                const attributes = Object.keys(values).map(name => {
                    const oldValue = accessors[name](rawRow);
                    mutators[name](rawRow, values[name]);
                    return {[name]: oldValue};
                });
                this.bdNotify({type: `u${this._ruid}`, mutatedAttributes, row: this});
                this.bdNotify({type: 'update-row', mutatedAttributes, row: this});
            }

            _disconnect() {
                delete this._ruid;
                this._listeners && this._listeners.forEach(listener => listener.destroy());
                delete this._listeners;
            }
        };

        this._tupleVar = relDef.tupleVarTypeFactory
            ? relDef.tupleVarTypeFactory(TupleVar)
            : TupleVar;

        // the first slot is never used so that real ruids are always nonzero
        this._data = [null];
        this._garbage = [];
        this._primaryIndex = new Map();
        this._ruidToOrder = new Map();
        this._orderToRuid = [];
        this.data = kwargs.data;
    }

    set data(rows) {
        this.bdNotify({type: 'before-clear'});
        this._data.splice(1, this._data.length);
        this._garbage = [];
        this._primaryIndex.clear();
        this._ruidToOrder.clear();
        this._orderToRuid = [];
        if (!rows) {
            this.bdNotify({type: 'init', newRows: [], updatedRows: [], duplicateRows: []});
            return;
        }
        const {newRows, updatedRows, duplicateRows} = this._ins(rows);
        this.bdNotify({type: 'init', newRows, updatedRows, duplicateRows});
    }

    get length() {
        return this._orderToRuid.length;
    }

    getRows(start, count) {
        [start, count] = this._toValidRange(start, count);
        if (start === undefined) {
            return [];
        }
        const orderToRuid = this._orderToRuid;
        const result = [];
        for (let i = start, end = start + count; i < end; i++) {
            result.push(this._data[orderToRuid[i]]);
        }
        return result;
    }

    getRowByOrder(index) {
        if (0 <= index && index < this._orderToRuid.length) {
            return this._data[this._orderToRuid[index]];
        }
        return undefined;
    }

    getRowByUid(ruid) {
        return this._data[ruid];
    }

    getRowByKey(key) {
        if (this._hasUdtKeys) {
            let indexValue = this._primaryIndex.get(key);
            return indexValue ? this._data[indexValue] : undefined;
        }

        let indexValue = this._primaryIndex.get(key[0]);
        let udtKey = key.slice(1);
        if (Number.isInteger(indexValue)) {
            return eql(udtKey, this._data[indexValue].udtKey)
                ? this._data[indexValue]
                : undefined;
        }

        const ruid = indexValue.find(ruid => eql(udtKey, this._data[ruid].udtKey));
        return ruid ? this._data[ruid] : undefined;
    }

    ins(rows) {
        this.bdNotify({type: 'before-insert', rows});
        const {newRows, updatedRows, duplicateRows} = this._ins(rows);
        updatedRows.forEach(pair => {
            const [row, mutatedAttributes] = pair;
            this.bdNotify({type: `u${row.ruid}`, mutatedAttributes, row})
            this.bdNotify({type: 'update-row', mutatedAttributes, row})
        });
        this.bdNotify({type: 'after-insert', newRows, updatedRows, duplicateRows});
    }

    del(start, count) {
        [start, count] = this._toValidRange(start, count);
        if(start===undefined) {
            return [];
        }

        const data = this._data;
        let error = false;
        const deletedRows = this._orderToRuid.slice(start, count).map(ruid => {
            const row = data[ruid];
            if (!row) {
                error = true;
            }
            return row;
        });
        if (error) {
            this._recover(() => true, this.del.bind(this, start, count));
            return;
        }

        this.bdNotify({type: 'before-delete', start, count, deletedRows});
        deletedRows.forEach(this._delRow.bind(this));
        this.bdNotify({type: 'after-delete', start, count, deletedRows});
        return deletedRows;
    }

    sort(_order) {
        const [order, rowComparator] = this._relDef.getOrderDefs(_order, this._order);
        if (order) {
            this._order = order;
            this._rowComparator = rowComparator;
        } else {
            return;
        }

        this.bdNotify({type: 'before-sort', order});
        const data = this._data;
        this._orderToRuid.sort((lhs, rhs) => rowComparator(data[lhs]._rawRow, data[rhs]._rawRow));
        const ruidToOrder = this._ruidToOrder;
        ruidToOrder.clear();
        this._orderToRuid.forEach((ruid, order) => ruidToOrder.set(ruid, order));
        this.bdNotify({type: 'after-sort', order: order});
    }

    _toValidRange(start, count) {
        if (start === undefined) {
            start = 0;
        }
        const length = this.length;
        if (!Number.isInteger(start) || start<0 || start>=length){
            return [];
        }
        if (count === undefined) {
            count = length - start;
        } else if(!Number.isInteger(count)) {
            return [];
        } else {
            count = Math.min(length - start, count);
        }
        return [start, count];
    }

    _ins(rows) {
        const data = this._data;
        const primaryIndex = this._primaryIndex;
        const getSimpleKey = this._getSimpleKey;
        const getUdtKey = this._getUdtKey;
        const hasUdtKeys = this._hasUdtKeys;
        const comparators = this._tupleType.comparators;
        const tupleVar = this._tupleVar;

        const newRows = [];
        const updatedRows = [];
        const duplicateRows = [];
        rows.forEach(newRow => {
            newRow = new tupleVar(newRow);
            const simpleKey = newRow.simpleKey;
            let indexValue = primaryIndex.get(simpleKey);
            if (indexValue === undefined) {
                // newRow does not already exist => simple insert
                this._insRow(newRow);
                primaryIndex.set(simpleKey, newRow.ruid);
                newRows.push(newRow);
            } else if (!hasUdtKeys) {
                // indexValue was defined and no udt keys => same logical row
                const existingRow = data[indexValue];
                this._updateRow(existingRow, newRow, duplicateRows, updatedRows);
            } else if (Number.isInteger(indexValue)) {
                // indexValue was defined and has udt keys => gotta look at those keys
                const existingRow = data[indexValue];
                if (eql(existingRow.udtKey, newRow.udtKey)) {
                    // simple key and udt match => same logical row
                    this._updateRow(existingRow, newRow, duplicateRows, updatedRows);
                } else {
                    // simple key match, but udt did not match => newRow refs different key than single existing with this simple key
                    this._insRow(newRow);
                    primaryIndex.set(simpleKey, [indexValue, newRow.ruid]);
                    newRows.push(newRow);
                }
            } else {
                // simple key points to multiple different udts...
                const newUdtKey = newRow.udtKey;
                if (!indexValue.some(rowIndex => {
                    const existingRow = data[rowIndex];
                    if (eql(existingRow.udtKey, newUdtKey)) {
                        this._updateRow(existingRow, newRow, duplicateRows, updatedRows);
                        return true;
                    }
                    return false;
                })) {
                    this._insRow(newRow);
                    indexValue.push(newRow.ruid);
                    newRows.push(newRow);
                }
            }
        });

        const rowComparator = this._rowComparator;
        this._orderToRuid.sort((lhs, rhs) => rowComparator(data[lhs]._rawRow, data[rhs]._rawRow));
        const ruidToOrder = this._ruidToOrder;
        ruidToOrder.clear();
        this._orderToRuid.forEach((ruid, order) => ruidToOrder.set(ruid, order));

        return {newRows, updatedRows, duplicateRows};
    }

    _insRow(row) {
        if (this._garbage.length) {
            const ruid = this._garbage.pop();
            row._ruid = ruid;
            this._data[ruid] = row;
        } else {
            row._ruid = this._data.length;
            this._data.push(row);
        }
        // TODO: sorted insert
        this._orderToRuid.push(row.ruid);
    }

    _updateRow(existingRow, newRow, duplicateRows, updatedRows) {
        const mutatedAttributes = newRow.nonkeyDiff(existingRow);
        if (mutatedAttributes.length) {
            existingRow._rawRow = newRow.copyRaw();
            updatedRows.push([existingRow, mutatedAttributes]);
        } else {
            // identical row; ignore it
            duplicateRows.push(newRow);
        }
    }

    _delRow(row, data) {
        const simpleKey = row.simpleKey;
        const indexValue = this._primaryIndex.get(simpleKey);

        if (!indexValue) {
            this._recover(() => data[row.ruid], this._delRow.bind(this, row, data));
            return;
        }

        if (this._hasUdtKeys) {
            if (Number.isInteger(indexValue)) {
                if (row.ruid === indexValue) {
                    this._primaryIndex.delete(simpleKey);
                } else {
                    this._recover(() => data[row.ruid], this._delRow.bind(this, row, data));
                    return;

                }
            } else {
                const udtKey = row.udtKey;
                const indexToDelete = indexValue.findIndex(ruid => eql(udtKey, this._data[ruid].udtKey));
                if (indexToDelete !== -1) {
                    indexValue.splice(indexToDelete, 1);
                } else {
                    this._recover(() => data[row.ruid], this._delRow.bind(this, row, data));
                    return;

                }
            }
        } else {
            if (row.ruid === indexValue) {
                this._primaryIndex.delete(simpleKey);
            } else {
                this._recover(() => data[row.ruid], this._delRow.bind(this, row, data));
                return;

            }
        }

        const ruid = row.ruid;
        this._data[ruid] = undefined;
        this._garbage.push(ruid);
        const order = this._ruidToOrder(ruid);
        this._orderToRuid.splice(order, 1);
        this._ruidToOrder.delete(ruid);
        row._disconnect();
    }

    _recover(test, retryProc) {
        if (this._recovering) {
            throw new Error('Relvar:corrupt');
        }

        this._recovering = true;
        try {
            // TODO: the recovery
            if (test()) {
                retryProc();
            } else {
                throw new Error('Relvar:corrupt');
            }
        } catch (e) {
            this._recovering = false;
            throw e;
        }
        this._recovering = true;
    }
}
