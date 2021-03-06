export * from './bd-core.js';
export {default as VStat} from './VStat.js';
export {default as keys} from './keys.js';

function defGetter(name) {
    // eslint-disable-next-line func-names
    return function () {
        return name in this.kwargs ?
            this.kwargs[name] :
            this.constructor[name];
    };
}

function defGetterWithPrivate(name, pName) {
    // eslint-disable-next-line func-names
    return function () {
        return pName in this ?
            this[pName] :
            (name in this.kwargs ?
                this.kwargs[name] :
                this.constructor[name]);
    };
}

function defSetter(name, pName) {
    // eslint-disable-next-line func-names
    return function (value) {
        if (this[name] !== value) {
            this.bdMutate(name, pName, value);
        }
    };
}

export function defProps(theClass, props) {
    const propDefinitions = {};
    props.forEach(config => {
        const [type, name, pName] = config;
        if (type === 'rw') {
            propDefinitions[name] = {
                get: defGetterWithPrivate(name, pName),
                set: defSetter(name, pName)
            };
        } else if (pName) {
            propDefinitions[name] = {
                get: defGetterWithPrivate(name, pName)
            };
        } else {
            propDefinitions[name] = {
                get: defGetter(name)
            };
        }
    });
    Object.defineProperties(theClass.prototype, propDefinitions);
}
