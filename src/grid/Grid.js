import {
    Component,
    e,
    connect,
    create,
    getStyle,
    setStyle,
    setPosit,
    insert,
    getPosit,
    Element,
    CANCEL_MUTATION
} from '../lib.js';

export default class Grid extends Component.withWatchables('topVisibleRowIndex', 'columnOrder', 'sort') {
    constructor(kwargs) {
        super(kwargs);
        this._maxNodeCount = kwargs.maxNodeCount || Grid.maxNodeCount;
        this._relVar = kwargs.relVar;
        this._tableMetadata = this.bdTableMetadata();
        this._columnOrder = Object.keys(this._tableMetadata);
        this._rowClass = kwargs.RowClass || Grid.getRowClass(this);
        this._topVisibleRow = kwargs.topRow || 0;
        this._ruidToRowComponent = new Map();
    }

    get tableMetadata() {
        return this._tableMetadata;
    }

    set maxNodeCount(value) {
        this._maxNodeCount = value;
    }

    get relVar() {
        return this._relVar;
    }

    // protected API...

    onMutateBeforeColumnOrder(columnOrder) {
        if (!Array.isArray(columnOrder) && !columnOrder.every(name => typeof name === 'string' && this._tableMetadata[name])) {
            return CANCEL_MUTATION;
        }
        const seen = {};
        columnOrder.forEach(name => (seen[name] = true));
        columnOrder = columnOrder.concat(this._columnOrder.filter(name => !seen[name]));

        if (this._columnOrder.every((name, i) => columnOrder[i] === name)) {
            return CANCEL_MUTATION;
        }
        return columnOrder;
    }

    onMutateColumnOrder(columnOrder, oldOrder) {
        const currentColumnOrder = {};
        oldOrder.forEach((name, i) => currentColumnOrder[name] = i);
        const columnCount = columnOrder.length;

        // the header
        const trNode = this.headerNode.firstChild;
        const ths = [...trNode.childNodes.values()];
        for (let node = trNode.firstChild, i = 0; i < columnCount - 1; i++) {
            node = trNode.insertBefore(ths[currentColumnOrder[columnOrder[i]]], node).nextSibling;
        }
        trNode.appendChild(ths[currentColumnOrder[columnOrder[columnCount - 1]]]);

        // the rows
        this._ruidToRowComponent.forEach(row => {
            if (row.rendered) {
                const root = row.bdDom.root;
                const tds = [...root.childNodes.values()];
                for (let node = root.firstChild, i = 0; i < columnCount - 1; i++) {
                    node = root.insertBefore(tds[currentColumnOrder[columnOrder[i]]], node).nextSibling;
                }
                root.appendChild(tds[currentColumnOrder[columnOrder[columnCount - 1]]]);
            }
        });
    }

    onMutateBeforeSort(sort) {
        // TODO: validate
        return sort
    }

    onMutateColumnSort(sort) {
        this._relVar.sort(sort);
    }

    bdElements() {
        return e.div({className: 'bd-grid', bdOn_scroll: this._checkRenderPosit.bind(this)},
            e.table({bdAttach: 'tableNode'},
                e.caption({bdAttach: 'captionNode'}),
                e.thead({bdAttach: 'headerNode'},
                    e.tr({}, this._columnOrder.map(columnName => e.th({}, this._tableMetadata[columnName].header)))),
                e.tbody({bdAttach: 'bodyNode'},
                    e.tr({className: 'topBuffer', bdAttach: '_topBufferRowNode'},
                        e.td({bdAttach: '_topBufferColNode'})),
                    e.tr({className: 'bottomBuffer', bdAttach: '_bottomBufferRowNode'},
                        e.td({bdAttach: '_bottomBufferColNode'}))),
                e.tfoot({bdAttach: 'footerNode'})),
        );
    }

    postRender() {
        const kwargs = this.kwargs;
    }

    onMutateAttachedToDoc(attached) {
        if (attached) {
            this.resize();
            if (this.sort) {
                relVar.sort(this.sort);
            }
            this._renderData(this._topVisibleRow);
        } else {
            this._resizeObserve.disconnect();
            delete this._resizeObserve;
        }
    }

    resize() {
    }

    // private API...

    _checkRenderPosit() {
        const posit = this.posit;
        const topBufferPosit = getPosit(this._topBufferRowNode);
        const bottomBufferPosit = getPosit(this._bottomBufferRowNode);

        const rerender = () => {
            const top = posit.t;
            console.log('rerender');
            if (topBufferPosit.b > posit.b) {
                // the top buffer is covering the visible part of the grid
                console.log('in top buffer');
                this._renderData(Math.round((posit.t - topBufferPosit.t / this._pixelsPerRow)));
                const delta = this.topRow.posit.t - posit.t;
                this.bdDom.root.scrollTop = this.bdDom.root.scrollTop + delta;
            } else if (bottomBufferPosit.t < posit.t) {
                // the bottom buffer is covering the visible part of the grid
                console.log('in bottom buffer');
                const countOfRowsInBottomBufferAboveGridTop = Math.round((posit.t - bottomBufferPosit.t / this._pixelsPerRow));
                const topRowIndex = this.bottomRow.rowIndex + countOfRowsInBottomBufferAboveGridTop;
                this._renderData(topRowIndex);
                const delta = this.topRow.posit.t - posit.t;
                this.bdDom.root.scrollTop = this.bdDom.root.scrollTop + delta;
            } else {
                // otherwise, there must be some visible rows => find the top, visible row
                const rows = this.qsa('tr');
                // take off the top and bottom buffers
                rows.shift();
                rows.pop();
                rows.find(rowNode => {
                    if (getPosit(rowNode).t > top) {
                        const holdRow = this._ruidToRowComponent.get(rowNode.bdRuid);
                        const holdTop = holdRow.posit.t;
                        this._renderData(holdRow.rowIndex);
                        const delta = holdRow.posit.t - holdTop;
                        this.bdDom.root.scrollTop = this.bdDom.root.scrollTop + delta;
                        console.log('found row');
                        return true;
                    }
                    return false;
                });
            }
        };

        if (
            // the top buffer exists
            this.topRow && this.topRow.rowIndex > 0
            &&
            // is getting close or has slid into the visible rows
            posit.t - topBufferPosit.b < posit.h
        ) {
            rerender();
            return;
        }
        if (
            // the bottom buffer exists
            this.bottomRow && this.bottomRow.rowIndex < this._relVar.length - 1
            &&
            // is getting close or has slid into the visible rows
            bottomBufferPosit.t - posit.b < posit.h
        ) {
            rerender();
        }
    }

    _renderData(topVisibleRowIndex) {
        // render the set of rows from [m..topVisibleRowIndex-1][topVisibleRowIndex..n] such that the node count of all rows
        // is approximately this._maxNodeCount and topVisibleRowIndex is scrolled to the top.

        this._renderingRows = true;

        const relVar = this._relVar;
        const rowCount = relVar.length;

        if (!rowCount) {
            // no rows to render; make sure the table is cleared
            this._clear();
            this._renderingRows = false;
            return;
        }

        // there is at least one row to render

        this._topVisibleRow = topVisibleRowIndex = Math.max(0, Math.min(topVisibleRowIndex || 0, rowCount - 1));

        const ruidToRowComponentMap = this._ruidToRowComponent;
        const insRow = (rowIndex, insPoint, insPosit) => {
            const row = relVar.getRowByOrder(rowIndex);
            let rowComponent = ruidToRowComponentMap.get(row.ruid);
            if (rowComponent) {
                // just moving the row within the table
                rowComponent.rowIndex = rowIndex;
                if (insPoint[insPosit === 'before' ? 'previousSibling' : 'nextSibling'] !== rowComponent.bdDom.root) {
                    insert(rowComponent.bdDom.root, insPoint, insPosit);
                }
            } else {
                // inserting the row for the first time
                rowComponent = this._createRow(row, rowIndex);
                ruidToRowComponentMap.set(row.ruid, rowComponent);
                this.insChild(rowComponent, insPoint, insPosit);
            }
            return rowComponent;
        };

        // render the first row
        const topVisibleRow = insRow(topVisibleRowIndex, this._getInsertPoint(topVisibleRowIndex), 'after');

        // render enough rows to fill the visible space...
        const h = this.posit.h;
        let totalHeight = topVisibleRow.posit.h;
        let visibleChunkNodeCount = topVisibleRow.nodeCount;
        let insPoint = topVisibleRow.bdDom.root;
        let rowIndex = topVisibleRowIndex + 1;
        let bottomVisibleRow = topVisibleRow;
        while (0 <= rowIndex && rowIndex < rowCount && totalHeight < h) {
            bottomVisibleRow = insRow(rowIndex++, insPoint, 'after');
            totalHeight += bottomVisibleRow.posit.h;
            visibleChunkNodeCount += bottomVisibleRow.nodeCount;
            insPoint = bottomVisibleRow.bdDom.root;
        }

        // topRow/bottomRow may be updated as we fill in the buffers
        let topRow = topVisibleRow;
        let bottomRow = bottomVisibleRow;
        console.log(`visible slice: [${topRow.rowIndex}, ${bottomRow.rowIndex}]`);

        // keep filling the bottom buffer with until 1/2 of the remaining nodes are used up
        const targetButtomBufferNodeCount = (this._maxNodeCount - visibleChunkNodeCount) / 2;
        let bottomBufferNodeCount = 0;
        while (0 <= rowIndex && rowIndex < rowCount && bottomBufferNodeCount < targetButtomBufferNodeCount) {
            bottomRow = insRow(rowIndex++, insPoint, 'after');
            bottomBufferNodeCount += bottomRow.nodeCount;
            insPoint = bottomRow.bdDom.root;
        }
        console.log(`bottom buffer(1): ${bottomRow.rowIndex}`);

        // fill the top buffer with any remaining nodes left
        let nodeCount = visibleChunkNodeCount + bottomBufferNodeCount;
        rowIndex = topVisibleRowIndex - 1;
        insPoint = topVisibleRow.bdDom.root;
        while (0 <= rowIndex && rowIndex < rowCount && nodeCount < this._maxNodeCount) {
            topRow = insRow(rowIndex--, insPoint, 'before');
            nodeCount += topRow.nodeCount;
            insPoint = topRow.bdDom.root;
        }
        console.log(`top buffer starts at: ${topRow.rowIndex}`);

        // maybe there weren't enough rows in the top buffer to use all the nodes
        if (bottomRow) {
            rowIndex = bottomRow.rowIndex + 1;
            insPoint = bottomRow.bdDom.root;
            while (0 <= rowIndex && rowIndex < rowCount && nodeCount < this._maxNodeCount) {
                bottomRow = insRow(rowIndex++, insPoint, 'after');
                nodeCount += bottomRow.nodeCount;
                insPoint = bottomRow.bdDom.root;
            }
        }// else, there was only one row => nothing to do
        console.log(`bottom buffer(2): ${bottomRow.rowIndex}`);


        // delete all the rows before topRow
        let node = this._topBufferRowNode.nextSibling;
        let topRowNode = topRow.bdDom.root;
        while (node !== topRowNode) {
            const ruid = node.bdRuid;
            const rowComponent = ruidToRowComponentMap.get(ruid);
            node = rowComponent.bdDom.root.nextSibling;
            ruidToRowComponentMap.delete(ruid);
            rowComponent.destroy();
        }

        // delete all the rows after lastRowComponent
        node = bottomRow.bdDom.root.nextSibling;
        let bottomBufferNode = this._bottomBufferRowNode;
        while (node !== bottomBufferNode) {
            const ruid = node.bdRuid;
            const rowComponent = ruidToRowComponentMap.get(ruid);
            node = node.nextSibling;
            ruidToRowComponentMap.delete(ruid);
            rowComponent.destroy();
        }

        const realChange = this.topRow !== topRow | this.bottomRow !== bottomRow;
        this.topRow = topRow;
        this.bottomRow = bottomRow;
        if (realChange) {
            this._setBuffersHeights(topRow, bottomRow);
        }

        console.log(`final rendered slice: [${topRow.rowIndex}, ${bottomRow.rowIndex}]`);
        this._renderingRows = false;
    }

    _getInsertPoint(rowIndex) {
        // return the tr node just before where row with rowIndex should be inserted

        const bottomBufferRowNode = this._bottomBufferRowNode;
        let node = this._topBufferRowNode.nextSibling;
        if (node == bottomBufferRowNode || node.bdRowIndex >= rowIndex) {
            return this._topBufferRowNode;
        }

        while (node !== bottomBufferRowNode && node.bdRowIndex < rowIndex) {
            node = node.nextSibling;
        }
        return node.previousSibling;
    }

    _createRow(row, rowIndex) {
        const rowComponent = new this._rowClass({row});
        rowComponent.rowIndex = rowIndex;
        this._ruidToRowComponent.set(row.ruid, rowComponent);
        rowComponent.render();
        return rowComponent;
    }

    _setBuffersHeights() {
        if (this.attachedToDoc) {
            this._topBufferColNode.colSpan =
                this._bottomBufferColNode.colSpan =
                    this._columnOrder.length;


            const needTopBuffer = this.topRow.rowIndex !== 0;
            if (!needTopBuffer) {
                setStyle(this._topBufferRowNode, 'display', 'none');
                setPosit(this._topBufferColNode, {h: 0});

            }

            const needBottomBuffer = this.bottomRow.rowIndex !== this._relVar.length - 1;
            if (!needBottomBuffer) {
                setStyle(this._bottomBufferRowNode, 'display', 'none');
                setPosit(this._bottomBufferColNode, {h: 0});

            }

            if (needTopBuffer || needBottomBuffer) {
                // intentionally not including the last row in the calc to make the calc easier
                const topRowIndex = this.topRow.rowIndex;
                const bottomRowIndex = this.bottomRow.rowIndex;
                const pixelsPerRow = this._pixelsPerRow = (this.bottomRow.posit.t - this.topRow.posit.t) / (bottomRowIndex - topRowIndex);

                if (needTopBuffer) {
                    setStyle(this._topBufferRowNode, 'display', '');
                    const h = Math.round(topRowIndex * pixelsPerRow);
                    setPosit(this._topBufferColNode, {h});
                }
                if (needBottomBuffer) {
                    setStyle(this._bottomBufferRowNode, 'display', '');
                    const h = Math.round((this._relVar.length - bottomRowIndex - 1) * pixelsPerRow);
                    setPosit(this._bottomBufferColNode, {h});
                }
            }

        }
    }
}

Grid.getRowClass = function (owningGrid) {
    const columnMetadata = owningGrid.tableMetadata;
    return class extends Component {
        get ruid() {
            return this.kwargs.row.ruid;
        }

        get rowIndex() {
            return this._rowIndex;
        }

        set rowIndex(value) {
            this.bdDom && (this.bdDom.root.bdRowIndex = value);
            return this._rowIndex = value;
        }

        get nodeCount() {
            return this.qsa('*').length;
        }

        bdElements() {
            return e.tr({});
        }

        postRender() {
            const root = this.bdDom.root;
            root.bdRuid = this.ruid;
            root.bdRowIndex = this.rowIndex;
            const row = this.kwargs.row;
            owningGrid._columnOrder.map(columnName => {
                let {content, connector} = columnMetadata[columnName];
                let isTdNode;
                if (content instanceof Element) {
                    isTdNode = (typeof content.type === 'string') && /th/i.test(content.type);
                } else {
                    content = new content({});
                    content.render();
                    isTdNode = content.bdDom.root.tagName === 'TH'
                }
                let insertPoint = isTdNode
                    ? root
                    : root.appendChild(create('td'));
                const component = this.insChild(content, insertPoint, 'last');
                connector && connector(row, component, this);
            });
        }
    };
};

Grid.genericCompare = function (lhs, rhs) {
    return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
};

Grid.watchables = [].concat(Component.watchables);
Grid.events = [].concat(Component.events);
Grid.maxNodeCount = 5000;

Grid.simpleConnector = function(propName, attrName) {
    return (row, component) =>
        component.ownWhileRendered(
            row.advise(true, 'updated', () => component[propName] = row.get(attrName)),
            component.watch(['value'], value => row.set(attrName, value)));
}
