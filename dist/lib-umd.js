(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.bd = {}));
}(this, (function (exports) { 'use strict';

    let _global = 0;
    let watchers = [];

    function setGlobal(theGlobal) {
        if (!_global) {
            _global = theGlobal;
            watchers.forEach(handler => handler(theGlobal));
            watchers = null;
        } else {
            throw new Error('illegal to mutate global space');
        }
    }

    function adviseGlobal(handler) {
        if (_global) {
            handler(_global);
        } else {
            watchers.push(handler);
        }
    }

    const postProcessingFuncs = Object.create(null);

    function insPostProcessingFunction(name, transform, func) {
        if (typeof transform === 'string') {
            // transform is an alias for name
            if (!postProcessingFuncs[name]) {
                throw Error(`cannot alias to a non-existing post-processing function: ${name}`);
            }
            postProcessingFuncs[transform] = postProcessingFuncs[name];
            return;
        }
        if (arguments.length === 3) {
            if (typeof transform !== 'function') {
                transform = (prop, value) => prop ? {[prop]: value} : value;
            }
        } else {
            func = transform;
            transform = (prop, value) => value;
        }
        func.bdTransform = transform;
        if (postProcessingFuncs[name]) {
            throw Error(`duplicate postprocessing function name: ${name}`);
        }
        postProcessingFuncs[name] = func;
    }

    function getPostProcessingFunction(name) {
        return postProcessingFuncs[name];
    }

    function noop() {
        // do nothing
    }

    class Destroyable {
        constructor(proc, container, onEmpty) {
            const result = this;
            result.proc = proc;
            if (container) {
                result.destroy = () => {
                    result.destroy = result.proc = noop;
                    const index = container.indexOf(result);
                    if (index !== -1) {
                        container.splice(index, 1);
                    }
                    !container.length && onEmpty && onEmpty();
                };
                container.push(result);
            } else {
                result.destroy = () => {
                    result.destroy = result.proc = noop;
                };
            }
        }

        static destroyAll(container) {
            // deterministic and robust algorithm to destroy handles:
            //   * deterministic even when handle destructors insert handles (though the new handles will not be destroyed)
            //   * robust even when handle destructors cause other handles to be destroyed
            if (Array.isArray(container)) {
                container.slice().forEach(h => h.destroy());
            }// else container was likely falsy and never used
        }
    }

    const STAR = Symbol('bd-star');

    const eqlComparators = new Map();

    function eql(refValue, otherValue) {
        if (!refValue) {
            return otherValue === refValue;
        }
        if (refValue instanceof Object) {
            const comparator = eqlComparators.get(refValue.constructor);
            if (comparator) {
                return comparator(refValue, otherValue);
            }
        }
        if (otherValue instanceof Object) {
            const comparator = eqlComparators.get(otherValue.constructor);
            if (comparator) {
                return comparator(otherValue, refValue);
            }
        }
        return refValue === otherValue;
    }

    const watcherCatalog = new WeakMap();
    const OWNER = Symbol('bd-owner');
    const UNKNOWN_OLD_VALUE = {
        value: 'UNKNOWN_OLD_VALUE'
    };

    const pWatchableWatchers = Symbol('bd-pWatchableWatchers');
    const pWatchableHandles = Symbol('bd-pWatchableHandles');
    const pWatchableSetup = Symbol('bd-pWatchableSetup');

    class WatchableRef {
        constructor(referenceObject, prop, formatter) {
            if (typeof prop === 'function') {
                // no prop,...star watcher
                formatter = prop;
                prop = STAR;
            }

            Object.defineProperty(this, 'value', {
                enumerable: true,
                // eslint-disable-next-line func-names
                get: ((function () {
                    if (formatter) {
                        if (prop === STAR) {
                            return () => formatter(referenceObject);
                        } else {
                            return () => formatter(referenceObject[prop]);
                        }
                    } else if (prop === STAR) {
                        return () => referenceObject;
                    } else {
                        return () => referenceObject[prop];
                    }
                })())
            });

            // if (referenceObject[OWNER] && prop === STAR), then we cValue===newValue===referenceObject...
            // therefore can't detect internal mutations to referenceObject, so don't try
            const cannotDetectMutations = prop === STAR && referenceObject[OWNER];

            this[pWatchableWatchers] = [];

            let cValue;
            const callback = (newValue, oldValue, target, referenceProp) => {
                if (formatter) {
                    oldValue = oldValue === UNKNOWN_OLD_VALUE ? oldValue : formatter(oldValue);
                    newValue = formatter(newValue);
                }
                if (cannotDetectMutations || oldValue === UNKNOWN_OLD_VALUE || !eql(cValue, newValue)) {
                    this[pWatchableWatchers].slice().forEach(
                        destroyable => destroyable.proc((cValue = newValue), oldValue, target, referenceProp)
                    );
                }
            };

            this[pWatchableSetup] = () => {
                cValue = this.value;
                if (referenceObject[OWNER]) {
                    this[pWatchableHandles] = [watch(referenceObject, prop, (newValue, oldValue, receiver, _prop) => {
                        if (prop === STAR) {
                            callback(referenceObject, UNKNOWN_OLD_VALUE, referenceObject, _prop);
                        } else {
                            callback(newValue, oldValue, referenceObject, _prop);
                        }
                    })];
                } else if (referenceObject.watch) {
                    this[pWatchableHandles] = [
                        referenceObject.watch(prop, (newValue, oldValue, target) => {
                            callback(newValue, oldValue, target, prop);
                            if (this[pWatchableHandles].length === 2) {
                                this[pWatchableHandles].pop().destroy();
                            }
                            if (newValue && newValue[OWNER]) {
                                // value is a watchable
                                // eslint-disable-next-line no-shadow
                                this[pWatchableHandles].push(watch(newValue, (newValue, oldValue, receiver, referenceProp) => {
                                    callback(receiver, UNKNOWN_OLD_VALUE, referenceObject, referenceProp);
                                }));
                            }
                        })
                    ];
                    const value = referenceObject[prop];
                    if (value && value[OWNER]) {
                        // value is a watchable
                        this[pWatchableHandles].push(watch(value, (newValue, oldValue, receiver, referenceProp) => {
                            callback(receiver, UNKNOWN_OLD_VALUE, referenceObject, referenceProp);
                        }));
                    }
                    referenceObject.own && referenceObject.own(this);
                } else {
                    throw new Error("don't know how to watch referenceObject");
                }
            };
        }

        destroy() {
            Destroyable.destroyAll(this[pWatchableWatchers]);
        }

        watch(watcher) {
            this[pWatchableHandles] || this[pWatchableSetup]();
            return new Destroyable(watcher, this[pWatchableWatchers], () => {
                Destroyable.destroyAll(this[pWatchableHandles]);
                delete this[pWatchableHandles];
            });
        }
    }

    WatchableRef.pWatchableWatchers = pWatchableWatchers;
    WatchableRef.pWatchableHandles = pWatchableHandles;
    WatchableRef.pWatchableSetup = pWatchableSetup;
    WatchableRef.UNKNOWN_OLD_VALUE = UNKNOWN_OLD_VALUE;
    WatchableRef.STAR = STAR;

    function getWatchableRef(referenceObject, referenceProp, formatter) {
        // (referenceObject, referenceProp, formatter)
        // (referenceObject, referenceProp)
        // (referenceObject, formatter) => (referenceObject, STAR, formatter)
        // (referenceObject) => (referenceObject, STAR)
        if (typeof referenceProp === 'function') {
            // no referenceProp,...star watcher
            formatter = referenceProp;
            referenceProp = STAR;
        }
        return new WatchableRef(referenceObject, referenceProp || STAR, formatter);
    }

    function watch(watchable, name, watcher) {
        if (typeof name === 'function') {
            watcher = name;
            name = STAR;
        }

        let variables = watcherCatalog.get(watchable);
        if (!variables) {
            watcherCatalog.set(watchable, (variables = {}));
        }

        // eslint-disable-next-line no-shadow
        const insWatcher = (name, watcher) => new Destroyable(watcher, variables[name] || (variables[name] = []));
        if (!watcher) {
            const hash = name;
            // eslint-disable-next-line no-shadow
            return Reflect.ownKeys(hash).map(name => insWatcher(name, hash[name]));
        } else if (Array.isArray(name)) {
            // eslint-disable-next-line no-shadow
            return name.map(name => insWatcher(name, watcher));
        } else {
            return insWatcher(name, watcher);
        }
    }

    const onMutateBeforeNames = {};
    const onMutateNames = {};

    function mutate(owner, name, privateName, newValue) {
        const oldValue = owner[privateName];
        if (eql(oldValue, newValue)) {
            return false;
        } else {
            let onMutateBeforeName,
                onMutateName;
            if (typeof name !== 'symbol') {
                onMutateBeforeName = onMutateBeforeNames[name];
                if (!onMutateBeforeName) {
                    const suffix = name.substring(0, 1).toUpperCase() + name.substring(1);
                    onMutateBeforeName = onMutateBeforeNames[name] = `onMutateBefore${suffix}`;
                    onMutateName = onMutateNames[name] = `onMutate${suffix}`;
                } else {
                    onMutateName = onMutateNames[name];
                }
            }

            if (onMutateBeforeName && owner[onMutateBeforeName]) {
                if (owner[onMutateBeforeName](newValue, oldValue) === false) {
                    // the proposed mutation is illegal
                    return false;
                }
            }
            if (owner.hasOwnProperty(privateName)) {
                owner[privateName] = newValue;
            } else {
                // not enumerable or configurable
                Object.defineProperty(owner, privateName, {writable: true, value: newValue});
            }
            onMutateName && owner[onMutateName] && owner[onMutateName](newValue, oldValue);
            return [name, newValue, oldValue];
        }
    }

    function getWatcher(owner, watcher) {
        return typeof watcher === 'function' ? watcher : owner[watcher].bind(owner);
    }

    function watchHub(superClass) {
        return class extends (superClass || class {
        }) {
            // protected interface...
            bdMutateNotify(name, newValue, oldValue) {
                const variables = watcherCatalog.get(this);
                if (!variables) {
                    return;
                }
                if (Array.isArray(name)) {
                    // each element in name is either a triple ([name, oldValue, newValue]) or false
                    let doStar = false;
                    name.forEach(p => {
                        if (p) {
                            doStar = true;
                            const watchers = variables[p[0]];
                            if (watchers) {
                                newValue = p[1];
                                oldValue = p[2];
                                watchers.slice().forEach(destroyable => destroyable.proc(newValue, oldValue, this, name));
                            }
                        }
                    });
                    if (doStar) {
                        const watchers = variables[STAR];
                        if (watchers) {
                            watchers.slice().forEach(destroyable => destroyable.proc(this, oldValue, this, name));
                        }
                    }
                } else {
                    let watchers = variables[name];
                    if (watchers) {
                        watchers.slice().forEach(destroyable => destroyable.proc(newValue, oldValue, this, name));
                    }
                    watchers = variables[STAR];
                    if (watchers) {
                        watchers.slice().forEach(destroyable => destroyable.proc(newValue, oldValue, this, name));
                    }
                }
            }

            bdMutate(name, privateName, newValue) {
                if (arguments.length > 3) {
                    let i = 0;
                    const results = [];
                    let mutateOccurred = false;
                    while (i < arguments.length) {
                        // eslint-disable-next-line prefer-rest-params
                        const mutateResult = mutate(this, arguments[i++], arguments[i++], arguments[i++]);
                        mutateOccurred = mutateOccurred || mutateResult;
                        results.push(mutateResult);
                    }
                    if (mutateOccurred) {
                        this.bdMutateNotify(results);
                        return results;
                    }
                    return false;
                } else {
                    const result = mutate(this, name, privateName, newValue);
                    if (result) {
                        this.bdMutateNotify(...result);
                        return result;
                    }
                    return false;
                }
            }

            // public interface...
            get isBdWatchHub() {
                return true;
            }

            watch(...args) {
                // possible sigs:
                // 1: name, watcher
                // 2: name[], watcher
                // 3: hash: name -> watcher
                // 4: watchable, name, watcher
                // 5: watchable, name[], watcher
                // 6: watchable, hash: name -> watcher
                // 7: watchable, watcher // STAR watcher

                if (arguments.length === 1) {
                    // sig 3
                    const hash = args[0];
                    return Reflect.ownKeys(hash).map(name => this.watch(name, hash[name]));
                }
                if (args[0][OWNER]) {
                    // sig 4-6
                    let result;
                    if (arguments.length === 2) {
                        if (typeof args[1] === 'object') {
                            // sig 6
                            const hash = args[1];
                            Reflect.ownKeys(hash).map(name => (hash[name] = getWatcher(this, hash[name])));
                            result = watch(args[0], hash);
                        } else {
                            // sig 7
                            result = watch(args[0], STAR, getWatcher(this, args[1]));
                        }
                    } else {
                        // sig 4 or 5
                        result = watch(args[0], args[1], getWatcher(this, args[2]));
                    }
                    this.own && this.own(result);
                    return result;
                }
                if (Array.isArray(args[0])) {
                    // sig 2
                    return args[0].map(name => this.watch(name, getWatcher(this, args[1])));
                }
                // sig 1
                const name = args[0];
                const watcher = getWatcher(this, args[1]);
                let variables = watcherCatalog.get(this);
                if (!variables) {
                    watcherCatalog.set(this, (variables = {}));
                }
                const result = new Destroyable(watcher, variables[name] || (variables[name] = []));
                this.own && this.own(result);
                return result;
            }

            destroyWatch(name) {
                const variables = watcherCatalog.get(this);

                function destroyList(list) {
                    if (list) {
                        while (list.length) list.shift().destroy();
                    }
                }

                if (variables) {
                    if (name) {
                        destroyList(variables[name]);
                        delete variables[name];
                    } else {
                        Reflect.ownKeys(variables).forEach(k => destroyList(variables[k]));
                        watcherCatalog.delete(this);
                    }
                }
            }

            getWatchableRef(name, formatter) {
                const result = new WatchableRef(this, name, formatter);
                this.own && this.own(result);
                return result;
            }
        };
    }

    const WatchHub = watchHub();

    function withWatchables(superClass, ...args) {
        const publicPropNames = [];

        function def(name) {
            let pname;
            if (Array.isArray(name)) {
                pname = name[1];
                name = name[0];
            } else {
                pname = `_${name}`;
            }
            publicPropNames.push(name);
            // eslint-disable-next-line no-use-before-define
            Object.defineProperty(prototype, name, {
                enumerable: true,
                get() {
                    return this[pname];
                },
                set(value) {
                    this.bdMutate(name, pname, value);
                }
            });
        }

        function init(owner, kwargs) {
            publicPropNames.forEach(name => {
                if (kwargs.hasOwnProperty(name)) {
                    owner[name] = kwargs[name];
                }
            });
        }

        const result = class extends superClass {
            constructor(kwargs) {
                kwargs = kwargs || {};
                super(kwargs);
                init(this, kwargs);
            }
        };
        const prototype = result.prototype;
        args.forEach(def);
        result.watchables = publicPropNames.concat(superClass.watchables || []);
        return result;
    }

    let window$1 = 0;
    let document$1 = 0;
    adviseGlobal(global => {
        window$1 = global;
        document$1 = window$1.document;
    });

    function setAttr(node, name, value) {
        if (arguments.length === 2) {
            // name is a hash
            Object.keys(name).forEach(n => setAttr(node, n, name[n]));
        } else if (name === 'style') {
            setStyle(node, value);
        } else if (name === 'innerHTML' || (name in node && node instanceof HTMLElement)) {
            node[name] = value;
        } else {
            node.setAttribute(name, value);
        }
    }

    function getAttr(node, name) {
        if (name in node && node instanceof HTMLElement) {
            return node[name];
        } else {
            return node.getAttribute(name);
        }
    }

    let lastComputedStyleNode = 0;
    let lastComputedStyle = 0;

    function getComputedStyle(node) {
        if (lastComputedStyleNode !== node) {
            lastComputedStyle = window$1.getComputedStyle((lastComputedStyleNode = node));
        }
        return lastComputedStyle;
    }

    function getStyle(node, property) {
        if (lastComputedStyleNode !== node) {
            lastComputedStyle = window$1.getComputedStyle((lastComputedStyleNode = node));
        }
        const result = lastComputedStyle[property];
        return (typeof result === 'string' && /px$/.test(result)) ? parseFloat(result) : result;
    }

    function getStyles(node, ...styleNames) {
        if (lastComputedStyleNode !== node) {
            lastComputedStyle = window$1.getComputedStyle((lastComputedStyleNode = node));
        }

        let styles = [];
        styleNames.forEach(styleName => {
            if (Array.isArray(styleName)) {
                styles = styles.concat(styleName);
            } else if (typeof styleName === 'string') {
                styles.push(styleName);
            } else {
                // styleName is a hash
                Object.keys(styleName).forEach(p => styles.push(p));
            }
        });

        const result = {};
        styles.forEach(property => {
            const value = lastComputedStyle[property];
            result[property] = (typeof value === 'string' && /px$/.test(value)) ? parseFloat(value) : value;
        });
        return result;
    }

    function setStyle(node, property, value) {
        if (arguments.length === 2) {
            if (typeof property === 'string') {
                node.style = property;
            } else {
                // property is a hash
                Object.keys(property).forEach(p => {
                    node.style[p] = property[p];
                });
            }
        } else {
            node.style[property] = value;
        }
    }

    function getPosit(node) {
        const result = node.getBoundingClientRect();
        result.t = result.top;
        result.b = result.bottom;
        result.l = result.left;
        result.r = result.right;
        result.h = result.height;
        result.w = result.width;
        return result;
    }

    function positStyle(v) {
        return v === false ? '' : `${v}px`;
    }

    function setPosit(node, posit) {
        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        Object.keys(posit).forEach(p => {
            switch (p) {
                case 't':
                    node.style.top = positStyle(posit.t);
                    break;
                case 'b':
                    node.style.bottom = positStyle(posit.b);
                    break;
                case 'l':
                    node.style.left = positStyle(posit.l);
                    break;
                case 'r':
                    node.style.right = positStyle(posit.r);
                    break;
                case 'h':
                    node.style.height = positStyle(posit.h);
                    break;
                case 'w':
                    node.style.width = positStyle(posit.w);
                    break;
                case 'maxH':
                    node.style.maxHeight = positStyle(posit.maxH);
                    break;
                case 'maxW':
                    node.style.maxWidth = positStyle(posit.maxW);
                    break;
                case 'minH':
                    node.style.minHeight = positStyle(posit.minH);
                    break;
                case 'minW':
                    node.style.minWidth = positStyle(posit.minW);
                    break;
                case 'z':
                    node.style.zIndex = posit.z === false ? '' : posit.z;
                    break;
                // ignore...this allows clients to stuff other properties into posit for other reasons
            }
        });
    }

    function insertBefore(node, refNode) {
        refNode.parentNode.insertBefore(node, refNode);
    }

    function insertAfter(node, refNode) {
        const parent = refNode.parentNode;
        if (parent.lastChild === refNode) {
            parent.appendChild(node);
        } else {
            parent.insertBefore(node, refNode.nextSibling);
        }
    }

    function insert(node, refNode, position) {
        if (position === undefined || position === 'last') {
            // short circuit the common case
            refNode.appendChild(node);
        } else {
            switch (position) {
                case 'before':
                    insertBefore(node, refNode);
                    break;
                case 'after':
                    insertAfter(node, refNode);
                    break;
                case 'replace':
                    refNode.parentNode.replaceChild(node, refNode);
                    return (refNode);
                case 'only': {
                    const result = [];
                    while (refNode.firstChild) {
                        result.push(refNode.removeChild(refNode.firstChild));
                    }
                    refNode.appendChild(node);
                    return result;
                }
                case 'first':
                    if (refNode.firstChild) {
                        insertBefore(node, refNode.firstChild);
                    } else {
                        refNode.appendChild(node);
                    }
                    break;
                default:
                    if (typeof position === 'number') {
                        const children = refNode.childNodes;
                        if (!children.length || children.length <= position) {
                            refNode.appendChild(node);
                        } else {
                            insertBefore(node, children[position < 0 ? Math.max(0, children.length + position) : position]);
                        }
                    } else {
                        throw new Error('illegal position');
                    }
            }
        }
        return 0;
    }

    function create(tag, props) {
        const result = Array.isArray(tag) ? document$1.createElementNS(`${tag[0]}`, tag[1]) : document$1.createElement(tag);
        if (props) {
            Reflect.ownKeys(props).forEach(p => setAttr(result, p, props[p]));
        }
        return result;
    }

    function getMaxZIndex(parent) {
        const children = parent.childNodes;
        const end = children.length;
        let node,
            cs,
            max = 0,
            i = 0;
        while (i < end) {
            node = children[i++];
            cs = node && node.nodeType === 1 && getComputedStyle(node);
            max = Math.max(max, (cs && cs.zIndex && Number(cs.zIndex)) || 0);
        }
        return max;
    }

    function connect(target, type, listener, useCapture) {
        let destroyed = false;
        useCapture = !!useCapture;
        target.addEventListener(type, listener, useCapture);
        return {
            destroy() {
                if (!destroyed) {
                    destroyed = true;
                    target.removeEventListener(type, listener, useCapture);
                }
            }
        };
    }

    function stopEvent(event) {
        if (event && event.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    function flattenChildren(children) {
        // children can be falsey, single children (of type Element or string), or arrays of single children, arbitrarily deep
        const result = [];

        function flatten_(child) {
            if (Array.isArray(child)) {
                child.forEach(flatten_);
            } else if (child) {
                result.push(child);
            }
        }

        flatten_(children);
        return result;
    }

    class Element {
        constructor(type, props, ...children) {
            if (type instanceof Element) {
                // copy constructor
                this.type = type.type;
                type.isComponentType && (this.isComponentType = type.isComponentType);
                type.ctorProps && (this.ctorProps = type.ctorProps);
                type.ppFuncs && (this.ppFuncs = type.ppFuncs);
                type.children && (this.children = type.children);
            } else {
                // type must either be a constructor (a function) or a string; guarantee that as follows...
                if (type instanceof Function) {
                    this.isComponentType = true;
                    this.type = type;
                } else if (type) {
                    // leave this.isComponentType === undefined
                    this.type = Array.isArray(type) ? type : `${type}`;
                } else {
                    throw new Error('type is required');
                }

                // if the second arg is an Object and not an Element or and Array, then it is props...
                if (props) {
                    if (props instanceof Element || Array.isArray(props)) {
                        children.unshift(props);
                        this.ctorProps = {};
                    } else if (props instanceof Object) {
                        const ctorProps = {};
                        const ppFuncs = {};
                        let ppFuncsExist = false;
                        let match,
                            ppf;
                        const setPpFuncs = (ppKey, value) => {
                            if (ppFuncs[ppKey]) {
                                const dest = ppFuncs[ppKey];
                                Reflect.ownKeys(value).forEach(k => (dest[k] = value[k]));
                            } else {
                                ppFuncsExist = true;
                                ppFuncs[ppKey] = value;
                            }
                        };
                        Reflect.ownKeys(props).forEach(k => {
                            if ((ppf = getPostProcessingFunction(k))) {
                                const value = ppf.bdTransform(null, props[k]);
                                setPpFuncs(k, value);
                            } else if ((match = k.match(/^([A-Za-z0-9$]+)_(.+)$/)) && (ppf = getPostProcessingFunction(match[1]))) {
                                const ppKey = match[1];
                                const value = ppf.bdTransform(match[2], props[k]);
                                setPpFuncs(ppKey, value);
                            } else {
                                ctorProps[k] = props[k];
                            }
                        });
                        this.ctorProps = Object.freeze(ctorProps);
                        if (ppFuncsExist) {
                            this.ppFuncs = Object.freeze(ppFuncs);
                        }
                    } else {
                        children.unshift(props);
                        this.ctorProps = {};
                    }
                } else {
                    this.ctorProps = {};
                }

                const flattenedChildren = flattenChildren(children);
                if (flattenedChildren.length === 1) {
                    const child = flattenedChildren[0];
                    this.children = child instanceof Element ? child : `${child}`;
                } else if (flattenedChildren.length) {
                    this.children = flattenedChildren.map(child => (child instanceof Element ? child : `${child}`));
                    Object.freeze(this.children);
                }// else children.length===0; therefore, no children
            }
            Object.freeze(this);
        }
    }

    function element(type, props, ...children) {
        // make elements without having to use new
        return new Element(type, props, children);
    }

    element.addElementType = function addElementType(type) {
        // type is either a constructor (a function) or a string
        if (typeof type === 'function') {
            if (type.name in element) {
                // eslint-disable-next-line no-console
                console.error(type.name, 'already in element');
            } else {
                element[type.name] = (props, ...children) => new Element(type, props, children);
            }
        } else {
            // eslint-disable-next-line no-lonely-if
            if (type in element) {
                // eslint-disable-next-line no-console
                console.error(type, 'already in element');
            } else {
                element[type] = (props, ...children) => new Element(type, props, children);
            }
        }
    };

    'a.abbr.address.area.article.aside.audio.base.bdi.bdo.blockquote.br.button.canvas.caption.cite.code.col.colgroup.data.datalist.dd.del.details.dfn.div.dl.dt.em.embed.fieldset.figcaption.figure.footer.form.h1.head.header.hr.html.i.iframe.img.input.ins.kbd.label.legend.li.link.main.map.mark.meta.meter.nav.noscript.object.ol.optgroup.option.output.p.param.picture.pre.progress.q.rb.rp.rt.rtc.ruby.s.samp.script.section.select.slot.small.source.span.strong.style.sub.summary.sup.table.tbody.td.template.textarea.tfoot.th.thead.time.title.tr.track.u.ul.var.video.wbr'.split('.').forEach(element.addElementType);

    const SVG = Object.create(null, {
        toString: {
            value: () => 'http://www.w3.org/2000/svg'
        }
    });
    Object.freeze(SVG);

    const listenerCatalog = new WeakMap();

    function eventHub(superClass) {
        return class extends (superClass || class {
        }) {
            // protected interface...
            bdNotify(e) {
                const events = listenerCatalog.get(this);
                if (!events) {
                    return;
                }

                let handlers;
                if (e instanceof Event) {
                    handlers = events[e.type];
                } else {
                    // eslint-disable-next-line no-lonely-if
                    if (e.type) {
                        handlers = events[e.type];
                        e.target = this;
                    } else if (!e.name) {
                        handlers = events[e];
                        e = {type: e, name: e, target: this};
                    } else {
                        // eslint-disable-next-line no-console
                        console.warn('event.name is deprecated; use event.type');
                        handlers = events[e.name];
                        e.type = e.name;
                        e.target = this;
                    }
                }

                if (handlers) {
                    handlers.slice().forEach(theDestroyable => theDestroyable.proc(e));
                }
                if ((handlers = events[STAR])) {
                    handlers.slice().forEach(theDestroyable => theDestroyable.proc(e));
                }
            }

            // public interface...
            get isBdEventHub() {
                return true;
            }

            advise(eventName, handler) {
                if (!handler) {
                    const hash = eventName;
                    return Reflect.ownKeys(hash).map(key => this.advise(key, hash[key]));
                } else if (Array.isArray(eventName)) {
                    return eventName.map(name => this.advise(name, handler));
                } else {
                    let events = listenerCatalog.get(this);
                    if (!events) {
                        listenerCatalog.set(this, (events = {}));
                    }
                    const result = new Destroyable(handler, events[eventName] || (events[eventName] = []));
                    this.own && this.own(result);
                    return result;
                }
            }

            destroyAdvise(eventName) {
                const events = listenerCatalog.get(this);
                if (!events) {
                    return;
                }
                if (eventName) {
                    const handlers = events[eventName];
                    if (handlers) {
                        handlers.forEach(h => h.destroy());
                        delete events[eventName];
                    }
                } else {
                    // eslint-disable-next-line no-shadow
                    Reflect.ownKeys(events).forEach(eventName => {
                        events[eventName].forEach(h => h.destroy());
                    });
                    listenerCatalog.delete(this);
                }
            }
        };
    }

    const EventHub = eventHub();

    let document$2 = 0;
    adviseGlobal(window => {
        document$2 = window.document;
    });

    function cleanClassName(s) {
        return s.replace(/\s{2,}/g, ' ').trim();
    }

    function conditionClassNameArgs(args) {
        return args.reduce((acc, item) => {
            if (item instanceof RegExp) {
                acc.push(item);
            } else if (item) {
                acc = acc.concat(cleanClassName(item).split(' '));
            }
            return acc;
        }, []);
    }

    function classValueToRegExp(v, args) {
        return v instanceof RegExp ? v : RegExp(` ${v} `, args);
    }

    function calcDomClassName(component) {
        const staticClassName = component.staticClassName;
        const className = component.bdClassName;
        return staticClassName && className ? (`${staticClassName} ${className}`) : (staticClassName || className);
    }

    function addChildToDomNode(parent, domNode, child, childIsComponent) {
        if (childIsComponent) {
            const childDomRoot = child.bdDom.root;
            if (Array.isArray(childDomRoot)) {
                childDomRoot.forEach(node => insert(node, domNode));
            } else {
                insert(childDomRoot, domNode);
            }
            parent.bdAdopt(child);
        } else {
            insert(child, domNode);
        }
    }

    function validateElements(elements) {
        if (Array.isArray(elements)) {
            elements.forEach(validateElements);
        } else if (elements.isComponentType) {
            throw new Error('Illegal: root element(s) for a Component cannot be Components');
        }
    }

    function postProcess(ppFuncs, owner, target) {
        Reflect.ownKeys(ppFuncs).forEach(ppf => {
            const args = ppFuncs[ppf];
            if (Array.isArray(args)) {
                getPostProcessingFunction(ppf)(owner, target, ...args);
            } else {
                getPostProcessingFunction(ppf)(owner, target, args);
            }
        });
    }

    function noop$1() {
        // do nothing
    }

    function pushHandles(dest, ...handles) {
        handles.forEach(h => {
            if (Array.isArray(h)) {
                pushHandles(dest, ...h);
            } else if (h) {
                const destroy = h.destroy.bind(h);
                h.destroy = () => {
                    destroy();
                    const index = dest.indexOf(h);
                    if (index !== -1) {
                        dest.splice(index, 1);
                    }
                    h.destroy = noop$1;
                };
                dest.push(h);
            }
        });
    }

    const ownedHandlesCatalog = new WeakMap();
    const domNodeToComponent = new Map();

    class Component extends eventHub(WatchHub) {
        constructor(kwargs = {}) {
            // notice that this class requires only the per-instance data actually used by its subclass/instance
            super();

            if (!this.constructor.noKwargs) {
                this.kwargs = kwargs;
            }

            // id, if provided, is read-only
            if (kwargs.id) {
                Object.defineProperty(this, 'id', { value: `${kwargs.id}`, enumerable: true });
            }

            if (kwargs.className) {
                Array.isArray(kwargs.className) ? this.addClassName(...kwargs.className) : this.addClassName(kwargs.className);
            }

            if (kwargs.tabIndex !== undefined) {
                this.tabIndex = kwargs.tabIndex;
            }

            if (kwargs.title) {
                this.title = kwargs.title;
            }

            if (kwargs.disabled || (kwargs.enabled !== undefined && !kwargs.enabled)) {
                this.disabled = true;
            }

            if (kwargs.visible !== undefined) {
                this.visible = kwargs.visible;
            }

            if (kwargs.elements) {
                if (typeof kwargs.elements === 'function') {
                    this.bdElements = kwargs.elements;
                } else {
                    this.bdElements = () => kwargs.elements;
                }
            }

            if (kwargs.postRender) {
                this.postRender = kwargs.postRender;
            }

            if (kwargs.mix) {
                Reflect.ownKeys(kwargs.mix).forEach(p => (this[p] = kwargs.mix[p]));
            }

            if (kwargs.callbacks) {
                const events = this.constructor.events;
                Reflect.ownKeys(kwargs.callbacks).forEach(key => {
                    if (events.indexOf(key) !== -1) {
                        this.advise(key, kwargs.callbacks[key]);
                    } else {
                        this.watch(key, kwargs.callbacks[key]);
                    }
                });
            }
        }

        destroy() {
            if (!this.destroyed) {
                this.destroyed = 'in-prog';
                this.unrender();
                const handles = ownedHandlesCatalog.get(this);
                if (handles) {
                    Destroyable.destroyAll(handles);
                    ownedHandlesCatalog.delete(this);
                }
                this.destroyWatch();
                this.destroyAdvise();
                delete this.kwargs;
                this.destroyed = true;
            }
        }

        render(
            proc // [function, optional] called after this class's render work is done, called in context of this
        ) {
            if (!this.bdDom) {
                const dom = this.bdDom = this._dom = {};
                const elements = this.bdElements();
                validateElements(elements);
                const root = dom.root = this.constructor.renderElements(this, elements);
                if (Array.isArray(root)) {
                    root.forEach(node => domNodeToComponent.set(node, this));
                } else {
                    domNodeToComponent.set(root, this);
                    if (this.id) {
                        root.id = this.id;
                    }
                    this.addClassName(root.getAttribute('class') || '');
                    const className = calcDomClassName(this);
                    if (className) {
                        root.setAttribute('class', className);
                    }

                    if (this.bdDom.tabIndexNode) {
                        if (this.bdTabIndex === undefined) {
                            this.bdTabIndex = this.bdDom.tabIndexNode.tabIndex;
                        } else {
                            this.bdDom.tabIndexNode.tabIndex = this.bdTabIndex;
                        }
                    } else if (this.bdTabIndex !== undefined) {
                        (this.bdDom.tabIndexNode || this.bdDom.root).tabIndex = this.bdTabIndex;
                    }
                    if (this.bdTitle !== undefined) {
                        (this.bdDom.titleNode || this.bdDom.root).title = this.bdTitle;
                    }
                    this[this.bdDisabled ? 'addClassName' : 'removeClassName']('bd-disabled');
                    if (!this.visible) {
                        this._hiddenDisplayStyle = root.style.display;
                        root.style.display = 'none';
                    }
                }
                this.ownWhileRendered(this.postRender());
                proc && proc.call(this);
                this.bdMutateNotify('rendered', true, false);
            }
            return this.bdDom.root;
        }

        postRender() {
            // no-op
        }

        bdElements() {
            return new Element('div', {});
        }

        unrender() {
            if (this.rendered) {
                if (this.bdParent) {
                    this.bdParent.delChild(this, true);
                }

                if (this.children) {
                    this.children.slice().forEach(child => {
                        child.destroy();
                    });
                }
                delete this.children;

                const root = this.bdDom.root;
                if (Array.isArray(root)) {
                    root.forEach(node => {
                        domNodeToComponent.delete(node);
                        node.parentNode && node.parentNode.removeChild(node);
                    });
                } else {
                    domNodeToComponent.delete(root);
                    root.parentNode && root.parentNode.removeChild(root);
                }
                Destroyable.destroyAll(this.bdDom.handles);
                delete this.bdDom;
                delete this._dom;
                delete this._hiddenDisplayStyle;
                this.bdAttachToDoc(false);
                this.bdMutateNotify('rendered', false, true);
            }
        }

        get rendered() {
            return !!(this.bdDom && this.bdDom.root);
        }

        own(...handles) {
            let _handles = ownedHandlesCatalog.get(this);
            if (!_handles) {
                ownedHandlesCatalog.set(this, (_handles = []));
            }
            pushHandles(_handles, ...handles);
        }

        ownWhileRendered(...handles) {
            pushHandles(this.bdDom.handles || (this.bdDom.handles = []), ...handles);
        }

        get parent() {
            return this.bdParent;
        }

        bdAdopt(child) {
            if (child.bdParent) {
                throw new Error('unexpected');
            }
            (this.children || (this.children = [])).push(child);

            child.bdMutate('parent', 'bdParent', this);
            child.bdAttachToDoc(this.bdAttachedToDoc);
        }

        bdAttachToDoc(value) {
            if (this.bdMutate('attachedToDoc', 'bdAttachedToDoc', !!value)) {
                if (value && this.resize) {
                    this.resize();
                }
                this.children && this.children.forEach(child => child.bdAttachToDoc(value));
                return true;
            } else {
                return false;
            }
        }

        get attachedToDoc() {
            return !!this.bdAttachedToDoc;
        }

        insChild(...args) {
            if (!this.rendered) {
                throw new Error('parent component must be rendered before explicitly inserting a child');
            }
            let { src, attachPoint, position } = decodeRender(args);
            let child;
            if (src instanceof Component) {
                child = src;
                if (child.parent) {
                    child.parent.delChild(child, true);
                }
                child.render();
            } else { // child instanceof Element
                if (!src.isComponentType) {
                    src = new Element(Component, { elements: src });
                }
                child = this.constructor.renderElements(this, src);
            }

            if (/before|after|replace|only|first|last/.test(attachPoint) || typeof attachPoint === 'number') {
                position = attachPoint;
                attachPoint = 0;
            }

            if (attachPoint) {
                if (attachPoint in this) {
                    // node reference
                    attachPoint = this[attachPoint];
                } else if (typeof attachPoint === 'string') {
                    attachPoint = document$2.getElementById(attachPoint);
                    if (!attachPoint) {
                        throw new Error('unexpected');
                    }
                } else if (position !== undefined) {
                    // attachPoint must be a child Component
                    const index = this.children ? this.children.indexOf(attachPoint) : -1;
                    if (index !== -1) {
                        // attachPoint is a child
                        attachPoint = attachPoint.bdDom.root;
                        if (Array.isArray(attachPoint)) {
                            switch (position) {
                                case 'replace':
                                case 'only':
                                case 'before':
                                    attachPoint = attachPoint[0];
                                    break;
                                case 'after':
                                    attachPoint = attachPoint[attachPoint.length - 1];
                                    break;
                                default:
                                    throw new Error('unexpected');
                            }
                        }
                    } else {
                        throw new Error('unexpected');
                    }
                } else {
                    // attachPoint without a position must give a node reference
                    throw new Error('unexpected');
                }
            } else if (child.bdParentAttachPoint) {
                // child is telling the parent where it wants to go; this is more specific than pChildrenAttachPoint
                if (child.bdParentAttachPoint in this) {
                    attachPoint = this[child.bdParentAttachPoint];
                } else {
                    throw new Error('unexpected');
                }
            } else {
                attachPoint = this.bdChildrenAttachPoint || this.bdDom.root;
                if (Array.isArray(attachPoint)) {
                    throw new Error('unexpected');
                }
            }

            const childRoot = child.bdDom.root;
            if (Array.isArray(childRoot)) {
                const firstChildNode = childRoot[0];
                unrender(insert(firstChildNode, attachPoint, position));
                childRoot.slice(1).reduce((prevNode, node) => {
                    insert(node, prevNode, 'after');
                    return node;
                }, firstChildNode);
            } else {
                unrender(insert(childRoot, attachPoint, position));
            }

            this.bdAdopt(child);
            return child;
        }

        delChild(child, preserve) {
            const index = this.children ? this.children.indexOf(child) : -1;
            if (index !== -1) {
                const root = child.bdDom && child.bdDom.root;
                const removeNode = node => {
                    node.parentNode && node.parentNode.removeChild(node);
                };
                Array.isArray(root) ? root.forEach(removeNode) : removeNode(root);
                child.bdMutate('parent', 'bdParent', null);
                child.bdAttachToDoc(false);
                this.children.splice(index, 1);
                if (!preserve) {
                    child.destroy();
                    child = false;
                } else if (preserve === 'unrender') {
                    child.unrender();
                }
                return child;
            }
            return false;
        }

        delChildren(preserve) {
            return this.children.slice().map(child => this.delChild(child, preserve));
        }

        reorderChildren(children) {
            if (children === this.children) {
                children = this.children.slice();
            }
            const thisChildren = this.children;
            if (thisChildren && thisChildren.length) {
                const node = children.bdDom.root.parentNode;
                children.forEach((child, i) => {
                    if (thisChildren[i] !== child) {
                        const index = thisChildren.indexOf(child, i + 1);
                        thisChildren.splice(index, 1);
                        node.insertBefore(child.bdDom.root, thisChildren[i].bdDom.root);
                        thisChildren.splice(i, 0, child);
                    }
                });
            }
        }

        get staticClassName() {
            return this.kwargs.hasOwnProperty('staticClassName') ?
                this.kwargs.staticClassName : (this.constructor.className || '');
        }

        get className() {
            // WARNING: if a staticClassName was given as a constructor argument, then that part of node.className is NOT returned
            if (this.rendered) {
                // if rendered, then look at what's actually in the document...maybe client code _improperly_ manipulated directly
                let root = this.bdDom.root;
                if (Array.isArray(root)) {
                    root = root[0];
                }
                let className = root.className;
                const staticClassName = this.staticClassName;
                if (staticClassName) {
                    staticClassName.split(' ').forEach(s => (className = className.replace(s, '')));
                }
                return cleanClassName(className);
            } else {
                return this.bdClassName || '';
            }
        }

        set className(value) {
            // WARNING: if a staticClassName was given as a constructor argument, then that part of node.className is NOT affected

            // clean up any space sloppiness, sometimes caused by client-code algorithms that manipulate className
            value = cleanClassName(value);
            if (!this.bdClassName) {
                this.bdSetClassName(value, '');
            } else if (!value) {
                this.bdSetClassName('', this.bdClassName);
            } else if (value !== this.bdClassName) {
                this.bdSetClassName(value, this.bdClassName);
            }
        }

        containsClassName(value) {
            // WARNING: if a staticClassName was given as a constructor argument, then that part of node.className is NOT considered

            value = cleanClassName(value);
            return (` ${this.bdClassName || ''} `).indexOf(value) !== -1;
        }

        addClassName(...values) {
            const current = this.bdClassName || '';
            this.bdSetClassName(conditionClassNameArgs(values).reduce((className, value) => {
                return classValueToRegExp(value).test(className) ? className : `${className + value} `;
            }, ` ${current} `).trim(), current);
            return this;
        }

        removeClassName(...values) {
            // WARNING: if a staticClassName was given as a constructor argument, then that part of node.className is NOT considered
            const current = this.bdClassName || '';
            this.bdSetClassName(conditionClassNameArgs(values).reduce((className, value) => {
                return className.replace(classValueToRegExp(value, 'g'), ' ');
            }, ` ${current} `).trim(), current);
            return this;
        }

        toggleClassName(...values) {
            // WARNING: if a staticClassName was given as a constructor argument, then that part of node.className is NOT considered
            const current = this.bdClassName || '';
            this.bdSetClassName(conditionClassNameArgs(values).reduce((className, value) => {
                if (classValueToRegExp(value).test(className)) {
                    return className.replace(classValueToRegExp(value, 'g'), ' ');
                } else {
                    return `${className + value} `;
                }
            }, ` ${current} `).trim(), current);
            return this;
        }

        get classList() {
            if (!this._classList) {
                const self = this;
                this._classList = {
                    get() {
                        return self.className;
                    },

                    set(value) {
                        return (self.className = value);
                    },

                    add(...values) {
                        return self.addClassName(...values);
                    },

                    ins(...values) {
                        return self.addClassName(...values);
                    },

                    remove(...values) {
                        return self.removeClassName(...values);
                    },

                    del(...values) {
                        return self.removeClassName(...values);
                    },

                    toggle(...values) {
                        return self.toggleClassName(...values);
                    },

                    contains(...values) {
                        return self.containsClassName(...values);
                    },

                    has(...values) {
                        return self.containsClassName(...values);
                    }
                };
            }
            return this._classList;
        }

        bdSetClassName(newValue, oldValue) {
            if (newValue !== oldValue) {
                this.bdClassName = newValue;
                if (this.rendered) {
                    this.bdDom.root.setAttribute('class', calcDomClassName(this));
                }
                if (this.rendered && !Array.isArray(this.bdDom.root)) {
                    this.bdDom.root.setAttribute('class', calcDomClassName(this));
                }
                this.bdMutateNotify('className', newValue, oldValue);
                const oldVisibleValue = oldValue ? oldValue.indexOf('bd-hidden') === -1 : true,
                    newVisibleValue = newValue ? newValue.indexOf('bd-hidden') === -1 : true;
                if (oldVisibleValue !== newVisibleValue) {
                    this.bdMutateNotify('visible', newVisibleValue, oldVisibleValue);
                }
            }
        }

        bdOnFocus() {
            this.addClassName('bd-focused');
            this.bdMutate('hasFocus', 'bdHasFocus', true);
        }

        bdOnBlur() {
            this.removeClassName('bd-focused');
            this.bdMutate('hasFocus', 'bdHasFocus', false);
        }

        get hasFocus() {
            return !!this.bdHasFocus;
        }

        focus() {
            if (this.bdDom) {
                (this.bdDom.tabIndexNode || this.bdDom.root).focus();
            }
        }

        setItem(...args) {
            let data = this.bdData || {};
            let i = 0;
            const end = args.length - 2;
            while (i < end) {
                data = data[args[i]] || (data[args[i]] = {});
                i++;
            }
            data[args[i]] = args[i + 1];
        }

        getItem(...args) {
            let data = this.bdData;
            for (let i = 0, end = args.length; data !== undefined && i < end;) {
                data = data[args[i++]];
            }
            return data;
        }

        removeItem(...args) {
            let data = this.bdData;
            const i = 0;
            for (const end = args.length - 1; data !== undefined && i < end;) {
                data = data[args[i]++];
            }
            if (data) {
                const result = data[args[i]];
                delete data[args[i]];
                return result;
            } else {
                return undefined;
            }
        }

        getAttr(name) {
            return getAttr(this.bdDom.root, name);
        }

        setAttr(name, value) {
            return setAttr(this.bdDom.root, name, value);
        }

        getStyle(property) {
            return getStyle(this.bdDom.root, property);
        }

        getStyles(...styleNames) {
            return getStyles(this.bdDom.root, styleNames);
        }

        setStyle(property, value) {
            return setStyle(this.bdDom.root, property, value);
        }

        animate(className, onComplete) {
            if (this.rendered) {
                const h = connect(this.bdDom.root, 'animationend', e => {
                    if (e.animationName === className) {
                        h.destroy();
                        !this.destroyed && this.removeClassName(className);
                        if (onComplete) {
                            onComplete.destroy ? onComplete.destroy() : onComplete();
                        }
                    }
                });
                if (!this.containsClassName(className)) {
                    this.addClassName(className);
                }
            }
        }

        getPosit() {
            return getPosit(this.bdDom.root);
        }

        setPosit(posit) {
            setPosit(this.bdDom.root, posit);
        }

        get uid() {
            return this.bdUid || (this.bdUid = Symbol('component-instance-uid'));
        }

        get tabIndex() {
            if (this.rendered) {
                // unconditionally make sure this.bdTabIndex and the dom is synchronized on each get
                return (this.bdTabIndex = (this.bdDom.tabIndexNode || this.bdDom.root).tabIndex);
            } else {
                return this.bdTabIndex;
            }
        }

        set tabIndex(value) {
            if (!value && value !== 0) {
                value = '';
            }
            if (value !== this.bdTabIndex) {
                this.rendered && ((this.bdDom.tabIndexNode || this.bdDom.root).tabIndex = value);
                this.bdMutate('tabIndex', 'bdTabIndex', value);
            }
        }

        get enabled() {
            return !this.bdDisabled;
        }

        set enabled(value) {
            this.disabled = !value;
        }

        get disabled() {
            return !!this.bdDisabled;
        }

        set disabled(value) {
            value = !!value;
            if (this.bdDisabled !== value) {
                this.bdDisabled = value;
                this.bdMutateNotify([['disabled', value, !value], ['enabled', !value, value]]);
                this[value ? 'addClassName' : 'removeClassName']('bd-disabled');
            }
        }

        get visible() {
            return !this.containsClassName('bd-hidden');
        }

        set visible(value) {
            value = !!value;
            if (value !== !this.containsClassName('bd-hidden')) {
                if (value) {
                    this.removeClassName('bd-hidden');
                    const node = this.bdDom && this.bdDom.root;
                    if (this._hiddenDisplayStyle !== undefined) {
                        node && (node.style.display = this._hiddenDisplayStyle);
                        delete this._hiddenDisplayStyle;
                    }
                    this.resize && this.resize();
                } else {
                    this.addClassName('bd-hidden');
                    const node = this.bdDom && this.bdDom.root;
                    if (node) {
                        this._hiddenDisplayStyle = node.style.display;
                        node.style.display = 'none';
                    }
                }
                this.bdMutateNotify('visible', value, !value);
            }
        }

        get title() {
            if (this.rendered) {
                return (this.bdDom.titleNode || this.bdDom.root).title;
            } else {
                return this.bdTitle;
            }
        }

        set title(value) {
            if (this.bdMutate('title', 'bdTitle', value)) {
                this.rendered && ((this.bdDom.titleNode || this.bdDom.root).title = value);
            }
        }

        static get(domNode) {
            return domNodeToComponent.get(domNode);
        }

        static renderElements(owner, e) {
            if (Array.isArray(e)) {
                // eslint-disable-next-line no-shadow
                return e.map(e => Component.renderElements(owner, e));
            } else if (e instanceof Element) {
                const { type, ctorProps, ppFuncs, children } = e;
                let result;
                if (e.isComponentType) {
                    // eslint-disable-next-line new-cap
                    const componentInstance = result = new type(ctorProps);
                    componentInstance.render();
                    ppFuncs && postProcess(ppFuncs, owner, componentInstance);
                    if (children) {
                        const renderedChildren = Component.renderElements(owner, children);
                        if (Array.isArray(renderedChildren)) {
                            renderedChildren.forEach(child => result.insChild(child));
                        } else {
                            result.insChild(renderedChildren);
                        }
                    }
                } else {
                    const domNode = result = create(type, ctorProps);
                    if ('tabIndex' in ctorProps && ctorProps.tabIndex !== false) {
                        owner.bdDom.tabIndexNode = domNode;
                    }
                    ppFuncs && postProcess(ppFuncs, owner, domNode);
                    if (children) {
                        const renderedChildren = Component.renderElements(owner, children);
                        if (Array.isArray(renderedChildren)) {
                            renderedChildren.forEach(
                                (child, i) => addChildToDomNode(owner, domNode, child, children[i].isComponentType)
                            );
                        } else {
                            addChildToDomNode(owner, domNode, renderedChildren, children.isComponentType);
                        }
                    }
                }
                return result;
            } else {
                // e must be convertible to a string
                return document$2.createTextNode(e);
            }
        }
    }

    Component.watchables = ['rendered', 'parent', 'attachedToDoc', 'className', 'hasFocus', 'tabIndex', 'enabled', 'visible', 'title'];
    Component.events = [];
    Component.withWatchables = (...args) => withWatchables(Component, ...args);

    function isComponentDerivedCtor(f) {
        return f === Component || (f && isComponentDerivedCtor(Object.getPrototypeOf(f)));
    }

    const prototypeOfObject = Object.getPrototypeOf({});

    function decodeRender(args) {
        // eight signatures...
        // Signatures 1-2 render an element, 3-6 render a Component, 7-8 render an instance of a Component
        //
        // Each of the above groups may or may not have the args node:domNode[, position:Position="last"]
        // which indicate where to attach the rendered Component instance (or not).
        //
        // when this decode routine is used by Component::insertChild, then node can be a string | symbol, indicating
        // an instance property that holds the node
        //
        // 1. render(e:Element)
        // => isComponentDerivedCtor(e.type), then render e.type(e.props); otherwise, render Component({elements:e})
        //
        // 2. render(e:Element, node:domNode[, position:Position="last"])
        //    => [1] with attach information
        //
        // 3. render(C:Component)
        // => render(C, {})
        //
        // 4. render(C:Component, args:kwargs)
        // => render(C, args)
        // // note: args is kwargs for C's constructor; therefore, postprocessing instructions are meaningless unless C's
        // // construction defines some usage for them (atypical)
        //
        // 5. render(C:Component, node:domNode[, position:Position="last"])
        // => [3] with attach information
        //
        // 6. render(C:Component, args:kwargs, node:domNode[, position:Position="last"])
        // => [4] with attach information
        //
        // 7. render(c:instanceof Component)
        // => c.render()
        //
        // 8. render(c:instanceof Component, node:domNode[, position:Position="last"])
        //    => [7] with attach information
        //
        // Position one of "first", "last", "before", "after", "replace", "only"; see dom::insert
        //
        // returns {
        //        src: instanceof Component | Element
        //        attachPoint: node | string | undefined
        //        position: string | undefined
        // }
        //
        // for signatures 3-6, an Element is manufactured given the arguments

        const [arg1, arg2, arg3, arg4] = args;
        if (arg1 instanceof Element || arg1 instanceof Component) {
            // [1] or [2] || [7] or [8]
            return { src: arg1, attachPoint: arg2, position: arg3 };
        } else {
            if (!isComponentDerivedCtor(arg1)) {
                throw new Error('first argument must be an Element, Component, or a class derived from Component');
            }
            if (args.length === 1) {
                // [3]
                return { src: new Element(arg1) };
            } else {
                // more than one argument; the second argument is either props or not
                // eslint-disable-next-line no-lonely-if
                if (Object.getPrototypeOf(arg2) === prototypeOfObject) {
                    // [4] or [6]
                    // WARNING: this signature requires kwargs to be a plain Javascript Object (which is should be!)
                    return { src: new Element(arg1, arg2), attachPoint: arg3, position: arg4 };
                } else {
                    // [5]
                    return { src: new Element(arg1), attachPoint: arg2, position: arg3 };
                }
            }
        }
    }

    function unrender(node) {
        function unrender_(n) {
            const component = domNodeToComponent.get(n);
            if (component) {
                component.destroy();
            }
        }

        Array.isArray(node) ? node.forEach(unrender_) : (node && unrender_(node));
    }

    function render(...args) {
        let result;
        let { src, attachPoint, position } = decodeRender(args);
        if (src instanceof Element) {
            if (src.isComponentType) {
                // eslint-disable-next-line new-cap
                result = new src.type(src.ctorProps);
            } else {
                result = new Component({ elements: src });
            }
            result.render();
        } else { // src instanceof Component
            result = src;
            result.render();
        }

        if (typeof attachPoint === 'string') {
            attachPoint = document$2.getElementById(attachPoint);
        }

        if (attachPoint) {
            const root = result.bdDom.root;
            if (Array.isArray(root)) {
                const firstChildNode = root[0];
                unrender(insert(firstChildNode, attachPoint, position));
                root.slice(1).reduce((prevNode, node) => {
                    insert(node, prevNode, 'after');
                    return node;
                }, firstChildNode);
            } else {
                unrender(insert(root, attachPoint, position));
            }
            result.bdAttachToDoc(document$2.body.contains(attachPoint));
        }
        return result;
    }

    insPostProcessingFunction(
        'bdAttach',
        (ppfOwner, ppfTarget, name) => {
            if (typeof name === 'function') {
                ppfOwner.ownWhileRendered(name(ppfTarget, ppfOwner));
            } else {
                ppfOwner[name] = ppfTarget;
                ppfOwner.ownWhileRendered({
                    destroy() {
                        delete ppfOwner[name];
                    }
                });
            }
        }
    );

    insPostProcessingFunction(
        'bdWatch', true,
        (ppfOwner, ppfTarget, watchers) => {
            Reflect.ownKeys(watchers).forEach(eventType => {
                let watcher = watchers[eventType];
                if (typeof watcher !== 'function') {
                    watcher = ppfOwner[eventType].bind(ppfOwner);
                }
                ppfTarget.ownWhileRendered(ppfTarget.watch(eventType, watcher));
            });
        }
    );

    insPostProcessingFunction(
        'bdExec',
        (ppfOwner, ppfTarget, ...args) => {
            for (let i = 0; i < args.length;) {
                const f = args[i++];
                if (typeof f === 'function') {
                    f(ppfOwner, ppfTarget);
                } else if (typeof f === 'string') {
                    if (!(typeof ppfTarget[f] === 'function')) {
                        // eslint-disable-next-line no-console
                        console.error('unexpected');
                    }
                    if (i < args.length && Array.isArray(args[i])) {
                        ppfTarget[f](...args[i++], ppfOwner, ppfTarget);
                    } else {
                        ppfTarget[f](ppfOwner, ppfTarget);
                    }
                } else {
                    // eslint-disable-next-line no-console
                    console.error('unexpected');
                }
            }
        }
    );

    insPostProcessingFunction(
        'bdTitleNode',
        (ppfOwner, ppfTarget) => {
            ppfOwner.bdDom.titleNode = ppfTarget;
        }
    );

    insPostProcessingFunction(
        'bdParentAttachPoint',
        (ppfOwner, ppfTarget, propertyName) => {
            ppfTarget.bdParentAttachPoint = propertyName;
        }
    );

    insPostProcessingFunction(
        'bdChildrenAttachPoint',
        (ppfOwner, ppfTarget) => {
            ppfOwner.bdChildrenAttachPoint = ppfTarget;
        }
    );

    insPostProcessingFunction(
        'bdReflectClass',
        (ppfOwner, ppfTarget, ...args) => {
            // args is a list of ([owner, ] property, [, formatter])...
            // very much like bdReflect, except we're adding/removing components (words) from this.classname

            function normalize(value) {
                return !value ? '' : `${value}`;
            }

            function install(owner, prop, formatter) {
                const watchable = getWatchableRef(owner, prop, formatter);
                ppfOwner.ownWhileRendered(watchable);
                const value = normalize(watchable.value);
                if (value) {
                    if (ppfOwner.bdDom.root === ppfTarget) {
                        // mutating className on the root node of a component
                        ppfOwner.addClassName(value);
                    } else {
                        ppfTarget.classList.add(value);
                    }
                }
                ppfOwner.ownWhileRendered(watchable.watch((newValue, oldValue) => {
                    newValue = normalize(newValue);
                    oldValue = normalize(oldValue);
                    if (newValue !== oldValue) {
                        if (ppfOwner.bdDom.root === ppfTarget) {
                            // mutating className on the root node of a component
                            oldValue && ppfOwner.removeClassName(oldValue);
                            newValue && ppfOwner.addClassName(newValue);
                        } else {
                            oldValue && ppfTarget.classList.remove(oldValue);
                            newValue && ppfTarget.classList.add(newValue);
                        }
                    }
                }));
            }

            args = args.slice();
            let owner,
                prop;
            while (args.length) {
                owner = args.shift();
                if (typeof owner === 'string' || typeof owner === 'symbol') {
                    prop = owner;
                    owner = ppfOwner;
                } else {
                    prop = args.shift();
                }
                install(owner, prop, typeof args[0] === 'function' ? args.shift() : null);
            }
        }
    );

    insPostProcessingFunction(
        'bdReflect',
        (prop, value) => {
            if (prop === null && value instanceof Object && !Array.isArray(value)) {
                // e.g., bdReflect:{p1:"someProp", p2:[refObject, "someOtherProp", someFormatter]}
                return value;
            } else if (prop) {
                // e.g., bdReflect_someProp: [refObject, ] prop [, someFormatter]
                return {[prop]: value};
            } else {
                // e.g., bdReflect: [refObject, ] prop [, someFormatter]
                return {innerHTML: value};
            }
        },
        (ppfOwner, ppfTarget, props) => {
            // props is a hash from property in ppfTarget to a list of ([refObject, ] property, [, formatter])...
            let install,
                watchable;
            if (ppfTarget instanceof Component) {
                install = (destProp, refObject, prop, formatter) => {
                    ppfOwner.ownWhileRendered((watchable = getWatchableRef(refObject, prop, formatter)));
                    ppfTarget[destProp] = watchable.value;
                    ppfOwner.ownWhileRendered(watchable.watch(newValue => {
                        ppfTarget[destProp] = newValue;
                    }));
                };
            } else {
                install = (destProp, refObject, prop, formatter) => {
                    ppfOwner.ownWhileRendered((watchable = getWatchableRef(refObject, prop, formatter)));
                    setAttr(ppfTarget, destProp, watchable.value);
                    ppfOwner.ownWhileRendered(watchable.watch(newValue => {
                        setAttr(ppfTarget, destProp, newValue);
                    }));
                };
            }

            Reflect.ownKeys(props).forEach(destProp => {
                const args = Array.isArray(props[destProp]) ? props[destProp].slice() : [props[destProp]];
                let refObject,
                    prop;
                while (args.length) {
                    refObject = args.shift();
                    if (typeof refObject === 'string' || typeof refObject === 'symbol') {
                        prop = refObject;
                        refObject = ppfOwner;
                    } else {
                        prop = args.shift();
                    }
                    install(destProp, refObject, prop, typeof args[0] === 'function' ? args.shift() : null);
                }
            });
        }
    );

    insPostProcessingFunction(
        'bdAdvise', true,
        (ppfOwner, ppfTarget, listeners) => {
            Reflect.ownKeys(listeners).forEach(eventType => {
                let listener = listeners[eventType];
                if (typeof listener !== 'function') {
                    listener = ppfOwner[listener].bind(ppfOwner);
                }
                ppfOwner.ownWhileRendered(
                    ppfTarget instanceof Component ?
                        ppfTarget.advise(eventType, listener) :
                        connect(ppfTarget, eventType, listener)
                );
            });
        }
    );
    insPostProcessingFunction('bdAdvise', 'bdOn');

    let focusedNode = null;
    let previousFocusedNode = null;
    let focusedComponent = null;
    let previousFocusedComponent = null;
    let nextFocusedComponent = null;
    const focusStack = [];

    class FocusManager extends watchHub(EventHub) {
        get focusedNode() {
            return focusedNode;
        }

        get previousFocusedNode() {
            return previousFocusedNode;
        }

        get focusedComponent() {
            return focusedComponent;
        }

        get previousFocusedComponent() {
            return previousFocusedComponent;
        }

        get focusStack() {
            return focusStack.slice();
        }

        get nextFocusedComponent() {
            return nextFocusedComponent;
        }
    }

    const focusManager = new FocusManager();

    function processNode(node) {
        const previousPreviousFocusedNode = previousFocusedNode;
        previousFocusedNode = focusedNode;
        focusedNode = node;
        if (previousFocusedNode === focusedNode) {
            return;
        }
        focusManager.bdMutateNotify([['focusedNode', focusedNode, previousFocusedNode], ['previousFocusedNode', previousFocusedNode, previousPreviousFocusedNode]]);

        // find the focused component, if any
        nextFocusedComponent = 0;
        while (node && (!(nextFocusedComponent = Component.get(node)))) {
            node = node.parentNode;
        }

        const stack = [];
        if (nextFocusedComponent) {
            let p = nextFocusedComponent;
            while (p) {
                stack.unshift(p);
                p = p.parent;
            }
        }

        const newStackLength = stack.length;
        const oldStackLength = focusStack.length;
        let i = 0,
            j,
            component;
        while (i < newStackLength && i < oldStackLength && stack[i] === focusStack[i]) {
            i++;
        }
        // at this point [0..i-1] are identical in each stack

        // signal blur from the path end to the first identical component (not including the first identical component)
        for (j = i; j < oldStackLength; j++) {
            component = focusStack.pop();
            if (!component.destroyed) {
                component.bdOnBlur();
                focusManager.bdNotify({type: 'blurComponent', component});
            }
        }

        // signal focus for all new components that just gained the focus
        for (j = i; j < newStackLength; j++) {
            focusStack.push(component = stack[j]);
            component.bdOnFocus();
            focusManager.bdNotify({type: 'focusComponent', component});
        }

        previousFocusedComponent = focusedComponent;
        focusedComponent = nextFocusedComponent;
        focusManager.bdMutateNotify([['focusedComponent', focusedComponent, previousFocusedComponent], ['previousFocusedComponent', previousFocusedComponent, 0]]);
        nextFocusedComponent = 0;
    }


    adviseGlobal(window => {
        const document = window.document;

        let focusWatcher = 0;

        connect(document.body, 'focusin', e => {
            const node = e.target;
            if (!node || !node.parentNode || node === focusedNode) {
                return;
            }

            if (focusWatcher) {
                clearTimeout(focusWatcher);
                focusWatcher = 0;
            }
            processNode(node);
        });

        // eslint-disable-next-line no-unused-vars
        connect(document.body, 'focusout', () => {
            // If the blur event isn't followed by a focus event, it means the focus left the document

            // set up a new focus watcher each time the focus changes...
            if (focusWatcher) {
                clearTimeout(focusWatcher);
            }
            focusWatcher = setTimeout(processNode.bind(null, null), 5);
        });
    });

    let vh = 0;
    let vw = 0;

    class ViewportWatcher extends watchHub(EventHub) {
        constructor(throttle) {
            super({});
            this.throttle = throttle || 300;
        }

        get vh() {
            return vh;
        }

        get vw() {
            return vw;
        }
    }

    const viewportWatcher = new ViewportWatcher();

    adviseGlobal(window => {
        const document = window.document;

        vh = document.documentElement.clientHeight;
        vw = document.documentElement.clientWidth;

        let scrollTimeoutHandle = 0;

        connect(window, 'scroll', () => {
            if (scrollTimeoutHandle) {
                return;
            }
            scrollTimeoutHandle = setTimeout(() => {
                scrollTimeoutHandle = 0;
                viewportWatcher.bdNotify({type: 'scroll'});
            }, viewportWatcher.throttle);
        }, true);


        let resizeTimeoutHandle = 0;

        connect(window, 'resize', () => {
            if (resizeTimeoutHandle) {
                return;
            }
            resizeTimeoutHandle = setTimeout(() => {
                resizeTimeoutHandle = 0;
                const vhOld = vh;
                const vwOld = vw;
                vh = document.documentElement.clientHeight;
                vw = document.documentElement.clientWidth;
                viewportWatcher.bdMutateNotify([['vh', vh, vhOld], ['vw', vw, vwOld]]);
                viewportWatcher.bdNotify({type: 'resize', vh, vw});
            }, viewportWatcher.throttle);
        }, true);
    });

    setGlobal(window);

    const VALID = 0;
    const CONTEXT_INFO = 1;
    const SCALAR_INFO = 2;
    const CONTEXT_WARN = 3;
    const SCALAR_WARN = 4;
    const CONTEXT_ERROR = 5;
    const SCALAR_ERROR = 6;

    // privates...
    const pLevel = Symbol('pLevel');
    const pMessages = Symbol('pMessages');
    const pMutate = Symbol('pMutate');
    const pValidateParams = Symbol('pValidateParams');
    const pClassName = Symbol('pClassName');
    const pAddMessage = Symbol('pAddMessage');
    const pDelMessage = Symbol('pDelMessage');
    let qlock = 0;
    const eventQ = [];

    function pushQ(type, level, message, target) {
        eventQ.push({type, level, message, messages: target[pMessages], target});
    }

    class Base {
        [pValidateParams](level, message) {
            level = Number(level);
            if (level < this.constructor.MIN_LEVEL || this.constructor.MAX_LEVEL < level) {
                throw new Error('level must be minimum and maxium level');
            }
            return [level, message ? (`${message}`).trim() : ''];
        }

        [pMutate](proc) {
            try {
                qlock++;
                proc();
            } finally {
                qlock--;
                let e = 0;
                while (!qlock && eventQ.length) {
                    const event = eventQ.pop();
                    try {
                        event.target.bdNotify(event);
                    } catch (_e) {
                        e = _e;
                    }
                }
                if (e) {
                    // eslint-disable-next-line no-unsafe-finally
                    throw (e);
                }
            }
        }

        [pAddMessage](level, message) {
            // no duplicates allowed
            // empty message is converted to default message given by ctor
            const levelMessages = this[pMessages][level];
            if (!levelMessages) {
                this[pMessages][level] = message;
                return true;
            } else {
                if (Array.isArray(levelMessages)) {
                    if (levelMessages.indexOf(message) === -1) {
                        levelMessages.push(message);
                        return true;
                    }
                } else if (levelMessages !== message) {
                    this[pMessages][level] = [levelMessages, message];
                    return true;
                }
                return false;
            }
        }

        [pDelMessage](level, message) {
            const messages = this[pMessages];
            const levelMessages = messages[level];
            if (levelMessages) {
                if (Array.isArray(levelMessages)) {
                    const index = levelMessages.indexOf(message);
                    if (index !== -1) {
                        levelMessages.splice(index, 1);
                        if (!levelMessages.length) {
                            delete messages[level];
                        }
                        return true;
                    }// else no-op
                } else if (levelMessages === message) {
                    delete messages[level];
                    return true;
                }
            }
            return false;
        }
    }

    //
    // VStat - validation status
    //
    // manages a validation status and associated messages and className
    //
    class VStat extends eventHub(watchHub(Base)) {
        constructor(level, message) {
            super();
            this[pMessages] = [];
            if (level === undefined) {
                // default ctor
                level = this[pLevel] = this.constructor.MIN_LEVEL;
                this[pMessages][level] = this.constructor.levels[level].message;
            } else if (typeof level === 'string') {
                message = level.trim();
                level = this.constructor.MAX_LEVEL;
                this[pLevel] = level = this.constructor.MAX_LEVEL;
                this[pMessages][level] = message || this.constructor.levels[level].message;
            } else if (level instanceof this.constructor) {
                // copy constructor
                const src = level;
                this[pLevel] = src[pLevel];
                this[pMessages] = src[pMessages].map(item => Array.isArray(item) ? item.slice() : item);
            } else if (level instanceof Object) {
                let src = level;
                const args = 'level' in src ? [src.level, src.message] : [src.message];
                src = new this.constructor(...args);
                this[pLevel] = src[pLevel];
                this[pMessages] = src[pMessages];
            } else {
                level = Number(level);
                if (this.constructor.MIN_LEVEL <= level && level <= this.constructor.MAX_LEVEL) {
                    if (message) {
                        message = (`${message}`).trim();
                    }
                    message = message || this.constructor.levels[level].message;
                } else {
                    throw new Error('level must be MIN_LEVEL<=level<=MAX_LEVEL');
                }
                this[pLevel] = level;
                this[pMessages][level] = message;
            }
        }

        get level() {
            return this[pLevel];
        }

        get message() {
            const msg = this[pMessages][this[pLevel]];
            if (!msg) {
                return '';
            } else if (Array.isArray(msg)) {
                return msg.join('\n');
            } else {
                return msg;
            }
        }

        get className() {
            return this.constructor.levels[this[pLevel]].className;
        }

        get isLegal() {
            return this[pLevel] < this.constructor.ERROR_LEVEL;
        }

        get isScalarLegal() {
            return this[pLevel] < this.constructor.SCALAR_ERROR_LEVEL;
        }

        get isError() {
            return this[pLevel] >= this.constructor.ERROR_LEVEL;
        }

        get isValid() {
            return this[pLevel] === VALID;
        }

        get isContextInfo() {
            return this[pLevel] === CONTEXT_INFO;
        }

        get isScalarInfo() {
            return this[pLevel] === SCALAR_INFO;
        }

        get isContextWarn() {
            return this[pLevel] === CONTEXT_WARN;
        }

        get isScalarWarn() {
            return this[pLevel] === SCALAR_WARN;
        }

        get isContextError() {
            return this[pLevel] === CONTEXT_ERROR;
        }

        get isScalarError() {
            return this[pLevel] === SCALAR_ERROR;
        }

        get hasValidMessages() {
            return !!this[pMessages][VALID];
        }

        get hasContextInfoMessages() {
            return !!this[pMessages][CONTEXT_INFO];
        }

        get hasScalarInfoMessages() {
            return !!this[pMessages][SCALAR_INFO];
        }

        get hasContextWarnMessages() {
            return !!this[pMessages][CONTEXT_WARN];
        }

        get hasScalarWarnMessages() {
            return !!this[pMessages][SCALAR_WARN];
        }

        get hasContextErrorMessages() {
            return !!this[pMessages][CONTEXT_ERROR];
        }

        get hasScalarErrorMessages() {
            return !!this[pMessages][SCALAR_ERROR];
        }

        getMessages(level, separator) {
            const m = this[pMessages][level];
            return !m ? '' : (Array.isArray(m) ? m.join(separator || '\n') : m);
        }

        getMessagesRaw(level) {
            // guaranteed to return an array
            const m = this[pMessages] && this[pMessages][level];
            return (Array.isArray(m) ? m : (m ? [m] : [])).slice();
        }


        set(level, message) {
            // forces exactly message at level; if message is missing, then the default message is provided
            [level, message] = this[pValidateParams](level, message);
            this[pMutate](() => {
                if (!message) {
                    message = this.constructor.levels[level].message;
                }
                const current = this[pMessages][level];
                if (Array.isArray(current)) {
                    current.forEach(msg => {
                        if (msg !== message) {
                            pushQ('messageDel', level, msg, this);
                        }
                    });
                    if (current.indexOf(message) === -1) {
                        pushQ('messageIns', level, message, this);
                    }
                    this[pMessages][level] = message;
                } else if (current !== message) {
                    if (current) {
                        pushQ('messageDel', level, current, this);
                    }
                    pushQ('messageIns', level, message, this);
                    this[pMessages][level] = message;
                }// else current!==message; therefore, no change
                if (level > this[pLevel]) {
                    this.bdMutate('level', pLevel, level);
                }// else no level change
            });
        }

        addMessage(level, message) {
            [level, message] = this[pValidateParams](level, message);
            if (!message) {
                return;
            }
            this[pMutate](() => {
                if (level > this[pLevel]) {
                    this.set(level, message);
                } else if (this[pAddMessage](level, message)) {
                    pushQ('messageIns', level, message, this);
                }
            });
        }

        delMessage(level, message) {
            [level, message] = this[pValidateParams](level, message);
            if (!message) {
                return;
            }
            this[pMutate](() => {
                if (this[pDelMessage](level, message)) {
                    pushQ('messageDel', level, message, this);
                    if (!this[pMessages].some(x => x)) {
                        // always must have at least this...
                        message = this.constructor.levels[VStat.VALID].message;
                        this[pMessages][VStat.VALID] = message;
                        pushQ('messageIns', VStat.VALID, message, this);
                    }
                    const maxLevel = this[pMessages].reduce((acc, item, level_) => item ? level_ : acc, VALID);
                    if (maxLevel !== this[pLevel]) {
                        this.bdMutate('level', pLevel, maxLevel);
                    }
                }
            });
        }

        static eql(lhs, rhs) {
            if (!(lhs instanceof VStat) || !(rhs instanceof VStat)) {
                return false;
            }
            if (lhs[pLevel] !== rhs[pLevel]) {
                return false;
            }
            const lhsMessages = lhs[pMessages];
            const rhsMessages = rhs[pMessages];
            for (let i = 0, end = lhsMessages.length; i < end; i++) {
                const lhsLevelMessages = lhsMessages[i];
                const rhsLevelMessages = rhsMessages[i];
                // either undefined, string or array
                if (lhsLevelMessages === undefined || typeof lhsLevelMessages === 'string') {
                    if (lhsLevelMessages !== rhsLevelMessages) {
                        return false;
                    }
                }
                // lhsLevelMessages is an array
                if (!Array.isArray(rhsLevelMessages) || lhsLevelMessages.length !== rhsLevelMessages.length) {
                    return false;
                }
                // both arrays of the same size; see if there is a string in the left not in the right
                if (lhsLevelMessages.some(lMessage => !rhsLevelMessages.some(rMessage => lMessage === rMessage))) {
                    return false;
                }
            }
            return true;
        }

        static valid(message) {
            return new VStat(VALID, message);
        }

        static contextInfo(message) {
            return new VStat(CONTEXT_INFO, message);
        }

        static scalarInfo(message) {
            return new VStat(SCALAR_INFO, message);
        }

        static contextWarn(message) {
            return new VStat(CONTEXT_WARN, message);
        }

        static scalarWarn(message) {
            return new VStat(SCALAR_WARN, message);
        }

        static contextError(message) {
            return new VStat(CONTEXT_ERROR, message);
        }

        static scalarError(message) {
            return new VStat(SCALAR_ERROR, message);
        }
    }

    eqlComparators.set(VStat, VStat.eql);

    Object.assign(VStat, {
        MIN_LEVEL: VALID,
        VALID,
        CONTEXT_INFO,
        SCALAR_INFO,
        CONTEXT_WARN,
        SCALAR_WARN,
        CONTEXT_ERROR,
        SCALAR_ERROR,
        MAX_LEVEL: SCALAR_ERROR,

        ERROR_LEVEL: CONTEXT_ERROR,
        SCALAR_ERROR_LEVEL: SCALAR_ERROR,

        // remember: a level *must* have at least one message to stay at that level
        // therefore, define one such default message for each level
        levels: [
            {id: 'valid', className: 'bd-vStat-valid', message: 'valid'},
            {id: 'contextInfo', className: 'bd-vStat-contextInfo', message: 'information in context'},
            {id: 'scalarInfo', className: 'bd-vStat-scalarInfo', message: 'information'},
            {id: 'contextWarn', className: 'bd-vStat-contextWarn', message: 'warning in context'},
            {id: 'scalarWarn', className: 'bd-vStat-scalarWarn', message: 'warning'},
            {id: 'contextError', className: 'bd-vStat-contextError', message: 'error in context'},
            {id: 'scalarError', className: 'bd-vStat-scalarError', message: 'error'}
        ],

        // privates...
        pLevel,
        pMessages,
        pClassName,
        pMutate,
        pValidateParams,
        pAddMessage,
        pDelMessage
    });

    var keys = {
        backspace: 8,
        tab: 9,
        clear: 12,
        enter: 13,
        shift: 16,
        ctrl: 17,
        alt: 18,
        pause: 19,
        capsLock: 20,
        escape: 27,
        space: 32,
        pageUp: 33,
        pageDown: 34,
        end: 35,
        home: 36,
        left: 37,
        up: 38,
        right: 39,
        down: 40,
        insert: 45,
        delete: 46,
        help: 47,
        leftWindow: 91,
        rightWindow: 92,
        select: 93,
        numpad_0: 96,
        numpad_1: 97,
        numpad_2: 98,
        numpad_3: 99,
        numpad_4: 100,
        numpad_5: 101,
        numpad_6: 102,
        numpad_7: 103,
        numpad_8: 104,
        numpad_9: 105,
        numpad_multiply: 106,
        numpad_plus: 107,
        numpad_enter: 108,
        numpad_minus: 109,
        numpad_period: 110,
        numpad_divide: 111,
        f1: 112,
        f2: 113,
        f3: 114,
        f4: 115,
        f5: 116,
        f6: 117,
        f7: 118,
        f8: 119,
        f9: 120,
        f10: 121,
        f11: 122,
        f12: 123,
        f13: 124,
        f14: 125,
        f15: 126,
        numLock: 144,
        scrollLock: 145,
        dpadUp: 175,
        dpadDown: 176,
        dpadLeft: 177,
        dpadRight: 178
    };

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

    function defProps(theClass, props) {
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

    class Button extends Component.withWatchables('label') {
        constructor(kwargs) {
            super(kwargs);
            if (this.label === undefined) {
                this.label = '';
            }
            kwargs.handler && (this.handler = kwargs.handler);
        }

        // protected API...

        bdElements() {
            //
            // 1  div.bd-button [bd-disabled] [bd-focused] [bd-hidden]
            // 2      div
            // 3          <this.label>
            //
            return element.div({className: 'bd-button', bdAdvise: {click: 'bdOnClick', mousedown: 'bdOnMouseDown'}},
                element.div({tabIndex: 0, bdReflect: 'label'}));
        }

        // private API...

        bdOnFocus() {
            if (!this.bdKeyHandler) {
                // eslint-disable-next-line no-shadow
                this.bdKeyHandler = connect(this._dom.root, 'keydown', e => {
                    if (e.key === ' ') {
                        // space bar => click
                        this.bdOnClick(e);
                    }
                });
            }
            super.bdOnFocus();
        }

        bdOnBlur() {
            super.bdOnBlur();
            this.bdKeyHandler && this.bdKeyHandler.destroy();
            delete this.bdKeyHandler;
        }

        bdOnClick(event) {
            stopEvent(event);
            if (this.enabled) {
                if (!this.hasFocus) {
                    this.focus();
                }
                this.handler && this.handler();
                this.bdNotify({name: 'click', nativeEvent: event});
            }
        }

        bdOnMouseDown(event) {
            if (this.hasFocus) {
                // pressing the left mouse down outside of the label (the focus node) inside the containing div causes
                // the focus to leave the label; we don't want that when we have the focus...
                stopEvent(event);
            }
        }
    }

    Button.watchables = ['label'].concat(Component.watchables);
    Button.events = ['click'].concat(Component.events);

    const VALUE = 0;
    const TEXT = 1;
    const SIFTED = 2;

    class ComboList extends Array {
        constructor(kwargs) {
            super();
            const list = kwargs.list || [];
            if (Array.isArray(list[0])) {
                list.forEach(item => this.push([item[VALUE], `${item[TEXT]}`]));
            } else {
                list.forEach(item => this.push([item, `${item}`]));
            }

            const sift = this._sift = kwargs.sift || (kwargs.noCase && (s => s.trim().toLowerCase()));
            if (sift) {
                this.forEach(item => (item[SIFTED] = sift(item[TEXT])));
            }

            function lexicalSort(lhs, rhs) {
                if (lhs[TEXT] < rhs[TEXT]) {
                    return -1;
                } else if (lhs[TEXT] > rhs[TEXT]) {
                    return 1;
                } else {
                    return 0;
                }
            }

            const sortFunc = this.sortFunc = typeof kwargs.sort === 'function' ? kwargs.sort : (kwargs.sort === false ? false : lexicalSort);
            if (sortFunc) {
                this.sort(sortFunc);
            }

            if (kwargs.default) {
                this._defaultValue = this.geByValue(kwargs.default);
                if (this._defaultValue[0] === undefined) {
                    throw new Error('default value does not exist in ComboList');
                }
            }

            this._valueEq = kwargs.valueEq;
        }

        sift(text) {
            return this._sift ? this._sift(text) : text.trim();
        }

        get defaultValue() {
            return this._defaultValue || (this.length && this[0][VALUE]) || null;
        }

        getByValue(value) {
            if (this._valueEq) {
                const eq = this._valueEq;
                // eslint-disable-next-line no-restricted-syntax
                for (const item of this) {
                    if (eq(value, item[VALUE])) return item;
                }
            } else {
                // eslint-disable-next-line no-restricted-syntax
                for (const item of this) {
                    if (value === item[VALUE]) return item;
                }
            }
            return [undefined, undefined];
        }

        getByText(text) {
            if (this._sift) {
                text = this._sift(text.trim());
                // eslint-disable-next-line no-restricted-syntax
                for (const item of this) {
                    if (text === item[SIFTED]) return item;
                }
            } else {
                text = text.trim();
                // eslint-disable-next-line no-restricted-syntax
                for (const item of this) {
                    if (text === item[TEXT]) return item;
                }
            }
            return [undefined, undefined];
        }

        match(text) {
            const siftedTarget = this.sift(text);
            const siftedLength = siftedTarget.length;
            if (!siftedLength) {
                return false;
            }
            let match = false;
            if (this._sift) {
                // eslint-disable-next-line no-restricted-syntax
                for (const item of this) {
                    if (item[SIFTED].substring(0, siftedLength) === siftedTarget) {
                        match = item;
                        break;
                    }
                }
            } else {
                // eslint-disable-next-line no-restricted-syntax
                for (const item of this) {
                    if (item[TEXT].substring(0, siftedLength) === siftedTarget) {
                        match = item;
                        break;
                    }
                }
            }
            if (match) {
                match = {
                    value: match[VALUE],
                    text: match[TEXT],
                    perfect: match[this._sift ? SIFTED : TEXT] === siftedTarget
                };
                if (!match.perfect) {
                    // figure out what suffix to put on text to make it a perfect match; to understand, how this can be
                    // hard, consider SSNs. Let's say the client design considers 123-45-6789 equal to 123456789 (or, even,
                    // the "-" could be any non-digit); then,
                    //     sifted("123-45")===sifted("123-45-")===sifted("123 45")===sifted("123.45")==="12345".
                    // Now the problem...what should the suffix hint be for text="123-45" compared to "123-45-" when the
                    // actual entry of "123-45-6789" exists?! Notice "123-45", "123-45-", and "123-45-6789" all have the
                    // same sifted prefix, namely "12345". For "123-45", we want the hint "-6789" for "123-45-" we want the
                    // hint "6789". Here's how we proceed:
                    //
                    // 1. Note that "123-45" doesn't contain any sifted characters at the end.
                    // 2. Note that "123-45-" does contain sifted characters at the end ("-").
                    // 3. Note that the sifted prefix "12345" of the matched value ("123-45-6789") does contain sifted
                    //    characters at the end ("-").
                    //
                    // THEREFORE
                    //
                    // * Since [1] doesn't and [3] does, choose to include [3]'s sifted characters in the hint.
                    // * Since [2] does and [3] does, prefer to user's meaningless characters and do not include [3]'s
                    //   sifted characters in the hint

                    // find the minimal  match[TEXT] substring which sifted value === siftedTarget
                    let i = siftedLength - 1;
                    const matchText = match.text;
                    while (i < matchText.length) {
                        if (this.sift(matchText.substring(0, i + 1)) !== siftedTarget) {
                            break;
                        }
                        i++;
                    }
                    // matchText[0..i] is the minimal prefix that matches the  prefix that sifted text gives
                    // matchText[i+1..length-1] is the maximal suffix that can be added to text to make a perfect match

                    // find any characters after the minimal substring above that are sifted
                    let j = i;
                    while (j < matchText.length && this.sift(matchText.substring(0, j + 1)) === siftedTarget) j++;
                    // [i+1..j] are the characters in matchText that are actually sifted out (meaningless)
                    // matchText[j+1..length-1] is the minimal suffix that can be added to text to make a perfect match

                    if (j > i) {
                        // there are characters in matchText that are actually sifted out after prefix that matches sifted(text)
                        // are there any such characters in text?
                        if (siftedLength < text.length && this.sift(text.substring(0, siftedLength - 1)) === siftedTarget) {
                            // there is at least one character at the end of text that would be sifted
                            // there are actually sifted out (meaningless) at the end of text
                            // BOTH text AND matchText have sifted characters between the prefixes that match
                            // and the suffixes that don't; therefore, do not add matchText's sifted characters to the hint
                            match.suffix = matchText.substring(j, matchText.length);
                        } else {
                            // no meaningless characters at the end of text; therefore give the hint of everything
                            match.suffix = matchText.substring(i, matchText.length);
                        }
                    } else {
                        // no meaningless characters at the end of matchText that matches the prefix that text gives
                        match.suffix = matchText.substring(i, matchText.length);
                    }
                }
            }
            return match;
        }

        getListBoxParams(text) {
            const list = this.map(item => item[TEXT]);
            const match = this.match(text);
            return { list, focusedItem: match ? match.text : null };
        }
    }

    ComboList.VALUE = VALUE;
    ComboList.TEXT = TEXT;
    ComboList.SIFTED = SIFTED;

    function twiddleClass(className, item, oldItem) {
        let index = this.bdMap.get(oldItem);
        if (index !== undefined) {
            this.children[index].removeClassName(className);
        }
        index = this.bdMap.get(item);
        if (index !== undefined) {
            this.children[index].addClassName(className);
        }
    }

    class ListBox extends Component {
        constructor(kwargs) {
            super(kwargs);
            this.bdList = [];
            this.bdMap = new Map();
            this.setList(kwargs.list, kwargs.selectedItem, kwargs.focusedItem);
        }

        setList(list, selectedItem, focusedItem) {
            this.focusedItem = null;
            this.selectedItem = null;
            this.bdMutate('mouseOverItem', 'bdMouseOverItem', null);
            this.bdUnrenderList();

            list = this.bdList = this.bdConditionList(list);
            selectedItem = this.bdMap.has(selectedItem) ? selectedItem : null;
            focusedItem = this.bdMap.has(focusedItem) ? focusedItem : selectedItem;
            this[list.length ? 'removeClassName' : 'addClassName']('no-data');
            this.rendered && this.bdRenderList();
            this.selectedItem = selectedItem;
            this.focusedItem = focusedItem;
        }

        splice(start, deleteCount, insertItems) {
            // note: unlike Array.splice, insertItems is _always_ an array of zero to many items to insert at start

            // juggle for optional deleteCount
            if (Array.isArray(deleteCount)) {
                insertItems = deleteCount;
                deleteCount = 0;
            }

            // start===-1 is sugar for this.bdList.length
            const list = this.bdList;
            if (start === -1) {
                start = list.length;
            }

            // check args; don' to anything is args irrational
            if (start < 0 || list.length < start) {
                throw new Error('start must be in [0..list.length] (start===-1 implies list.length) in ListBox::splice');
            }
            if (deleteCount && start + deleteCount > list.length) {
                throw new Error("trying to delete items that don't exist in ListBox::splice");
            }

            const children = this.children;
            const childrenStart = this.bdUpArrow ? start + 1 : start;
            for (let count = 0; count < deleteCount; count++) {
                const item = list[start];
                if (item === this.bdSelectedItem) {
                    this.selectedItem = null;
                }
                if (item === this.bdFocusedItem) {
                    this.focusedItem = null;
                }
                list.splice(start, 1);
                if (children) {
                    const child = children[childrenStart];
                    delete child.bdItem;
                    super.delChild(child, !child.bdListBoxCreated);
                }
            }

            if (insertItems) {
                const itemComponentType = this.kwargs.itemComponentType || this.constructor.itemComponentType;
                let ref,
                    posit;
                if (children) {
                    if (children && children[childrenStart]) {
                        ref = children[childrenStart].bdDom.root;
                        posit = 'before';
                    } else {
                        ref = this.bdItemAttachPoint;
                        posit = 'last';
                    }
                }
                insertItems.forEach((item, i) => {
                    list.splice(start + i, 0, item);
                    if (children) {
                        const child = this.bdInsChild(item, ref, posit, itemComponentType);
                        children.pop();
                        children.splice(childrenStart + i, 0, child);
                    }
                });
            }

            const itemMap = this.bdMap;
            itemMap.clear();
            children.forEach((child, i) => itemMap.set(child.bdItem, i));

            if (list.length) {
                this.removeClassName('no-data');
                let focusIndex = start < list.length ? start : list.length - 1;
                this.focusedItem = children[this.bdUpArrow ? ++focusIndex : focusIndex].bdItem;
                if (!this.isInView(this.focusedItem)) {
                    this.scrollToItem(this.focusedItem, 'top');
                }
            } else {
                this.addClassName('no-data');
            }
        }

        get selectedItem() {
            return this.bdSelectedItem;
        }

        set selectedItem(target) {
            if (this.selectable) {
                this.bdMutate('selectedItem', 'bdSelectedItem', this.bdMap.has(target) ? target : null);
            } else {
                throw new Error("can't select item in ListBox that was created with selectable false");
            }
        }

        get focusedItem() {
            const focusedItem = this.bdFocusedItem;
            return focusedItem === this.bdUpArrow || focusedItem === this.bdDownArrow ? null : focusedItem;
        }

        set focusedItem(target) {
            const oldValue = this.bdFocusedItem;
            const normalizedOldValue = this.focusedItem;
            const newValue = this.bdFocusedItem = this.bdMap.has(target) ? target : null;
            const normalizedNewValue = this.focusedItem;
            if (normalizedOldValue !== normalizedNewValue) {
                this.bdMutateNotify('focusedItem', normalizedNewValue, normalizedOldValue);
            }
            if (this.rendered && oldValue !== newValue) {
                twiddleClass.call(this, 'focusedItem', newValue, oldValue);
            }
        }

        get mouseOverItem() {
            return this.bdMouseOverItem;
        }

        // illegal to set mouseOverItem

        scrollToItem(item, location) {
            const root = this.bdDom.root;
            const scrollHeight = root.scrollHeight;
            const scrollTop = root.scrollTop;
            if (scrollHeight <= root.clientHeight) {
                // everything is visible; therefore nothing to scroll
                root.scrollTop = 0;
                return false;
            }

            const children = this.children;
            const posit = getPosit(root);
            const targetPosit = children.byItem(item).getPosit();
            let delta = location === 'top' ? targetPosit.t - posit.t : targetPosit.b - posit.b;
            delta = Math.min(Math.max(-scrollTop, delta), scrollHeight - scrollTop - posit.h);
            const newScrollTop = scrollTop + delta;

            // delta = Math.min(delta, getPosit(children[children.length - 1]).b - posit.b);
            // newScrollTop = Math.min(scrollHeight - posit.h + 1, Math.max(0, scrollTop + delta));

            if (scrollTop !== newScrollTop) {
                // eslint-disable-next-line no-undef
                anime({
                    targets: root,
                    scrollTop: newScrollTop,
                    duration: 300,
                    easing: 'easeOutQuad'
                });
                this.bdMutate('mouseOverItem', 'bdMouseOverItem', null);
                return Math.abs(delta) > 1;
            } else {
                return false;
            }
        }

        down() {
            if (!this.rendered || !this.children || !this.bdList.length) return;
            if (this.bdFocusedItem === this.bdList.last) {
                if (this.bdDownArrow) {
                    if (this.scrollToItem(this.bdDownArrow, 'bottom')) ; else {
                        // the top arrow was already in view, so get more items
                        this.bdOnClickArrow({}, 'down');
                    }
                }// else, already at the top; nothing to do
                return;
            } else {
                let index = this.bdMap.get(this.bdFocusedItem);
                if (index !== undefined) {
                    // if the up arrow exists, then the map indexes are +1 of the list indexes
                    this.bdUpArrow && (--index);
                    this.focusedItem = this.bdList[Math.min(index + 1, this.bdList.length - 1)];
                } else {
                    this.focusedItem = this.bdList[0];
                }
            }
            if (!this.isInView(this.bdFocusedItem)) {
                this.scrollToItem(this.bdFocusedItem, 'bottom');
            }
        }

        up() {
            if (!this.rendered || !this.children) return;
            if (this.bdFocusedItem === this.bdList[0]) {
                if (this.bdUpArrow) {
                    if (this.scrollToItem(this.bdUpArrow, 'top')) ; else {
                        // the top arrow was already in view, so get more items
                        this.bdOnClickArrow({}, 'up');
                    }
                }// else, already at the top; nothing to do
                return;
            } else {
                let index = this.bdMap.get(this.bdFocusedItem);
                if (index !== undefined) {
                    // if the up arrow exists, then the map indexes are +1 of the list indexes
                    this.bdUpArrow && (--index);
                    this.focusedItem = this.bdList[Math.max(index - 1, 0)];
                } else {
                    this.focusedItem = this.bdList[this.bdList.length - 1];
                }
            }
            if (!this.isInView(this.bdFocusedItem)) {
                this.scrollToItem(this.bdFocusedItem, 'top');
            }
        }

        pageDown() {
            if (!this.rendered || !this.children) return;
            const posit = this.getPosit();
            let newTopChild;
            for (const child of this.children) {
                const childPosit = child.getPosit();
                if (childPosit.b > posit.b) break;
                newTopChild = child;
            }
            const newTopItem = newTopChild.bdItem;
            if (this.scrollToItem(newTopItem, 'top')) {
                this.focusedItem = newTopItem;
            } else {
                this.focusedItem = this.bdList.last;
            }
        }

        pageUp() {
            if (!this.rendered || !this.children) return;
            const posit = this.getPosit();
            let newBottomChild;
            for (let i = this.children.length - 1; i >= 0; i--) {
                const child = this.children[i];
                const childPosit = child.getPosit();
                if (childPosit.t < posit.t) break;
                newBottomChild = child;
            }
            const newBottomItem = newBottomChild.bdItem;
            if (this.scrollToItem(newBottomItem, 'bottom')) {
                this.focusedItem = newBottomItem;
            } else {
                this.focusedItem = this.bdList[0];
            }
        }

        isInView(item) {
            const posit = getPosit(this.bdDom.root);
            const targetPosit = this.children.byItem(item).getPosit();
            const result = posit.t <= targetPosit.t && targetPosit.b <= posit.b;
            return result;
        }

        // public overrides...

        insChild() {
            throw new Error('insChild is private in ListBox');
        }

        delChild() {
            throw new Error('delChild is private in ListBox');
        }

        render(proc) {
            return super.render(() => {
                this.bdRenderList();
                twiddleClass.call(this, 'selectedItem', this.bdSelectedItem, null);
                twiddleClass.call(this, 'focusedItem', this.bdFocusedItem, null);
                this.bdMouseOverItem = null;
                this.ownWhileRendered(
                    this.watch('selectedItem', twiddleClass.bind(this, 'selectedItem')),
                    this.watch('mouseOverItem', twiddleClass.bind(this, 'mouseOverItem'))
                );
                proc && proc();
            });
        }

        unrender() {
            this.bdUnrenderList();
            super.unrender();
        }

        // protected methods...

        bdElements() {
            //
            // 1  div.bd-listBox [bd-disabled] [bd-focused] [bd-hidden]
            // 2      div
            // 3          div.up-arrow
            // 4          div
            // 5          div.down-arrow
            // 6      div.no-items
            //
            // [1] Component root with Component's capabilities
            // [2, 6] one of [2] or [6] is visible depending on whether or not there are items in the list
            // [3, 5] are visible only if the list is dynamic
            // [4] holds items
            //
            return element.div({
                className: 'bd-listBox unselectable',
                tabIndex: 0,
                bdAdvise: {keydown: 'bdOnKeyDown', mousedown: 'bdOnMouseDown', mouseover: 'bdOnMouseOver'}
            },
            element.div(
                element.div({className: 'items', bdAttach: 'bdItemAttachPoint'}),
            ),
            element.div({className: 'no-items', bdReflect: 'noItemsMessage'}));
        }

        bdAttachToDoc(attach) {
            if (super.bdAttachToDoc(attach)) {
                if (attach && this.bdFocusedItem) {
                    this.scrollToItem(this.bdFocusedItem, 'top');
                }
                return true;
            }
            return false;
        }

        // private API...

        bdInsChild(item, ref, posit, itemComponentType) {
            let child;
            if (item instanceof Component) {
                child = item;
                if (child.parent) {
                    child.parent.delChild(child, true);
                }
                // child.bdListBoxCreated remains undefined
            } else {
                // eslint-disable-next-line new-cap
                child = new itemComponentType(item);
                child.bdListBoxCreated = true;
            }
            child.bdItem = item;
            child.render();
            Component.insertNode(child.bdDom.root, ref, posit);
            this.bdAdopt(child);
            return child;
        }

        bdConditionList(list) {
            // this guarantees that list is a *private*, *array* with getter for "last"; initializes pMap
            let result;
            if (!list) {
                result = [];
            } else if (!Array.isArray(list)) {
                throw new Error('a list provided to ListBox must be an array or false');
            } else if (!list.length) {
                result = [];
            } else {
                result = list.slice();
            }

            const map = this.bdMap;
            const offset = this.kwargs.get ? 1 : 0;
            map.clear();
            result.forEach((item, i) => map.set(item, i + offset));

            Object.defineProperty(result, 'last', {
                get() {
                    return this.length ? this[this.length - 1] : undefined;
                }
            });

            return result;
        }

        bdRenderList() {
            this.children = [];
            this.children.byItem = item => {
                return this.children[this.bdMap.get(item)];
            };

            const itemComponentType = this.kwargs.itemComponentType || this.constructor.itemComponentType;
            const arrowComponent = this.kwargs.arrowComponent || this.constructor.arrowComponent;
            const createArrow = direction => {
                // eslint-disable-next-line new-cap
                const arrow = new arrowComponent({direction});
                arrow.bdItem = arrow;
                arrow.bdListBoxCreated = true;
                arrow.render();
                Component.insertNode(arrow.bdDom.root, this.bdItemAttachPoint, direction === 'up' ? 'first' : 'last');
                this.bdMap.set(arrow, this.children.length);
                this.bdAdopt(arrow);
                return arrow;
            };
            this.kwargs.get && (this.bdUpArrow = createArrow('up'));
            this.bdList.forEach(item => this.bdInsChild(item, this.bdItemAttachPoint, 'last', itemComponentType));
            this.kwargs.get && (this.bdDownArrow = createArrow('down'));
        }

        bdUnrenderList() {
            if (this.children) {
                for (const child of this.children.slice()) {
                    delete child.bdItem;
                    super.delChild(child, !child.bdListBoxCreated);
                }
            }
            delete this.bdUpArrow;
            delete this.bdDownArrow;
        }

        bdItemFromNode(node) {
            const itemAttachPoint = this.bdItemAttachPoint;
            while (node) {
                if (node.parentNode === itemAttachPoint) {
                    const item = Component.get(node).bdItem;
                    return item === this.bdUpArrow || item === this.bdDownArrow ? null : item;
                }
                node = node.parentNode;
            }
            return null;
        }

        bdOnFocus() {
            super.bdOnFocus();
            if (!this.bdFocusedItem && this.bdList.length) {
                this.focusedItem = this.bdList[0];
            }
        }

        bdOnKeyDown(event) {
            switch (event.keyCode) {
                case keys.down:
                    this.down();
                    break;
                case keys.up:
                    this.up();
                    break;
                case keys.pageDown:
                    this.pageDown();
                    break;
                case keys.pageUp:
                    this.pageUp();
                    break;
                case keys.enter:
                    if (this.focusedItem && this.selectable) {
                        this.selectedItem = this.focusedItem === this.selectedItem ? null : this.focusedItem;
                    }
                    break;
                default:
                    return;
            }
            stopEvent(event);
        }

        bdOnMouseDown(event) {
            stopEvent(event);
            if (event.button !== 0) {
                return;
            }
            if (this.kwargs.multiSelect) ; else {
                const item = this.bdItemFromNode(event.target);
                if (item) {
                    this.focusedItem = item;
                    if (this.selectable) {
                        this.selectedItem = item === this.selectedItem ? null : item;
                    }
                }
            }
        }

        bdOnClickArrow(event, direction) {
            stopEvent(event);
            this.focusedItem = direction === 'up' ? this.bdUpArrow : this.bdDownArrow;
            if (this.kwargs.get) {
                const up = direction === 'up';
                if ((up && this.bdMoreBeforePromise) || (!up && this.bdMoreAfterPromise)) {
                    // already waiting for data...
                    return;
                }
                const ref = up ? 'bdMoreBeforePromise' : 'bdMoreAfterPromise';
                const p = this[ref] = this.kwargs.get(up ? 'before' : 'after');
                const className = up ? 'query-before' : 'query-after';
                this.addClassName(className);
                p.then(newItems => {
                    delete this[ref];
                    this.removeClassName(className);
                    if (newItems && newItems.length) {
                        this.splice(up ? 0 : -1, 0, newItems);
                        if (!up) {
                            this.focusedItem = this.bdList.last;
                            this.scrollToItem(this.bdDownArrow, 'bottom');
                        }
                    }
                });
            }// else ignore
        }

        bdOnMouseOver(event) {
            this.bdMutate('mouseOverItem', 'bdMouseOverItem', this.bdItemFromNode(event.target));
            const h1 = connect(this.bdDom.root, 'mousemove', event_ => {
                this.bdMutate('mouseOverItem', 'bdMouseOverItem', this.bdItemFromNode(event_.target));
            });
            const h2 = connect(this.bdDom.root, 'mouseleave', () => {
                this.bdMutate('mouseOverItem', 'bdMouseOverItem', null);
                h1.destroy();
                h2.destroy();
            });
        }
    }

    defProps(ListBox, [
        ['ro', 'selectable'],
        ['rw', 'noItemsMessage', 'bdNoItemsMessage']
    ]);

    Object.assign(ListBox, {
        noItemsMessage: 'no items',
        selectable: true,
        itemComponentType: class extends Component {
            constructor(item) {
                const kwargs = {text: `${item}`};
                super(kwargs);
            }

            bdElements() {
                return element.div(this.kwargs.text);
            }
        },
        arrowComponent: class extends Component {
            constructor(kwargs) {
                super(kwargs);
                this.addClassName(kwargs.direction === 'up' ? 'up-arrow icon-caret-up' : 'down-arrow icon-caret-down');
            }

            bdElements() {
                return element.div({bdAdvise: {click: event => this.parent.bdOnClickArrow(event, this.kwargs.direction)}});
            }
        },
        watchables: ['focusedItem', 'selectedItem', 'mouseOverItem', 'noItemsMessage'].concat(Component.watchables),
        events: [].concat(Component.events)
    });

    class ComboBox extends Component {
        constructor(kwargs) {
            super(kwargs);
            this.bdList = kwargs.list instanceof ComboList ? kwargs.list : new ComboList(kwargs);
            const [value, text, vStat] = this.validateValue('value' in kwargs ? kwargs.value : this.bdList.defaultValue);
            this.bdValue = value;
            this.bdText = text;
            this.bdVStat = vStat;
        }

        get closed() {
            // can't use defProps because the value is a calculation
            return this.static || this.kwargs.closed;
        }

        // closed is read-only

        get value() {
            return this.bdValue;
        }

        set value(_value) {
            const [value, text, vStat] = this.validateValue(_value);
            this.bdMutate('value', 'bdValue', value, 'text', 'bdText', text, 'vStat', 'bdVStat', vStat);
        }

        get text() {
            return this.bdText;
        }

        set text(_text) {
            const [value, text, vStat] = this.validateText(_text);
            this.bdMutate('value', 'bdValue', value, 'text', 'bdText', text, 'vStat', 'bdVStat', vStat);
        }

        // setting vStat directly is not allowed...it's done by clients by setting value/text
        // note, however, this returns a reference to vStat, so the internal state of vStat can be manipulated
        get vStat() {
            return this.bdVStat;
        }

        // write-only
        set list(value) {
            this.bdList = value instanceof ComboList ? value : new ComboList({ ...this.kwargs, list: value });
            this.value = this.value;
        }

        // validateValue, validateText: very much analogous to design in ../input/Input.js; no formatter since we have the list

        validateValue(_value) {
            const [value, text] = this.bdList.getByValue(_value);
            if (value === undefined) {
                if (this.closed) {
                    throw new Error('illegal value provided for closed combo list');
                }
                return [_value, `${_value}`, this.closed ? VStat.scalarError() : VStat.valid()];
            } else {
                return [value, text, VStat.valid()];
            }
        }

        validateText(_text) {
            const [value, text] = this.bdList.getByText(_text);
            if (value === undefined) {
                if (this.closed) {
                    throw new Error('illegal value provided for closed combo list');
                }
                return [_text, `${_text}`, this.closed ? VStat.scalarError() : VStat.valid()];
            } else {
                return [value, text, VStat.valid()];
            }
        }

        // protected API/overrides...

        bdElements() {
            //
            // 1  div.bd-comboBox [bd-disabled] [bd-focused] [bd-hidden] [vStat.className] [empty]
            // 2      Meta (optional)
            // 3      div
            // 4          input -or- div.static
            // 6      div.arrow.icon-caret-down
            //
            //  1. the component root; the tree rooted at [3] is identical to the tree in the same position for Input
            //  2. optional Meta widget; defined by this.kwargs.Meta || this.constructor.Meta
            //  3. identical to the tree in the same position for Input; see Input
            //  6. the drop-down arrow
            //
            // Notice that [2] can be placed above/below/left/right of [3] by making [1] a flex box (row or column, block or inline)
            // and then setting the flex order of [2], [3], and [6]
            return element.div({
                className: 'bd-comboBox',
                bdReflectClass: [
                    'vStat', vStat => vStat.className,
                    'text', text => (text.length ? '' : 'empty')
                ],
                bdAdvise: {
                    mousedown: 'bdOnMouseDown',
                    keydown: 'bdOnKeyDown'
                }
            },
            (this.Meta ? element(this.Meta, { bdReflect: { vStat: 'vStat' } }) : false),
            element.div({ className: 'bd-rbox' },
                this.static ?
                    element.div({ className: 'bd-static', tabIndex: 0, bdReflect: ['text', s => s || '&nbsp;'] }) :
                    element.input({
                        tabIndex: 0,
                        bdAdvise: { input: 'bdOnInput' },
                        bdReflect: { disabled: 'disabled', value: 'text', placeholder: 'placeholder' },
                        ...(this.inputAttrs || this.kwargs.inputAttrs || this.constructor.inputAttrs)
                    })),
            element.div({ className: 'arrow icon-caret-down' }));
        }

        get bdInputNode() {
            return this.bdDom ? this.bdDom.root.querySelector('input') : null;
        }

        // private API/overrides...
        bdOnFocus() {
            super.bdOnFocus();
            if (this.static) {
                // no other way to pick a value than from the list; therefore, show it unconditionally
                this.bdDisplayListBox();
            }
        }

        bdOnBlur() {
            super.bdOnBlur();
            if (this.bdListBox) {
                this.bdListBox.destroy();
                delete this.bdListBox;
                this.removeClassName('bd-listBox-visible', 'above', 'below');
            }
            this.bdAcceptInput();
        }

        bdAcceptInput() {
            const inputNode = this.bdInputNode;
            if (inputNode) {
                const srcText = inputNode.value;
                const match = this.bdList.match(srcText);
                if (match && match.perfect) {
                    this.bdMutate('value', 'bdValue', match.value, 'text', 'bdText', match.text, 'vStat', 'bdVStat', VStat.valid());
                } else if (this.closed) {
                    // don't allow an illegal value...just revert
                    inputNode.value = this.text;
                } else {
                    // delegate to the text setter to figure out what to do
                    this.text = srcText;
                }
                inputNode.setSelectionRange(0, 0);
            }
        }

        bdDisplayListBox() {
            if (this.bdListBox) {
                return;
            }
            const posit = this.bdComputeListBoxPosit();
            if (!posit) {
                return;
            }
            const inputNode = this.bdInputNode;
            const text = inputNode ? inputNode.value : this.text;
            const listBox = this.bdListBox = new this.ListBox(this.bdList.getListBoxParams(text));
            listBox.addClassName(posit.above ? 'above' : 'below');
            listBox.own(listBox.watch('selectedItem', item => {
                if (item !== null) {
                    this.text = item;
                    this.bdListBox.destroy();
                    delete this.bdListBox;
                    this.removeClassName('bd-listBox-visible', 'above', 'below');
                }
            }));
            listBox.setPosit(posit);
            document.body.appendChild(listBox.bdDom.root);
            this.addClassName('bd-listBox-visible', posit.above ? 'above' : 'below');
        }

        bdComputeListBoxPosit() {
            const posit = this.getPosit();
            const h = document.documentElement.clientHeight;
            const w = document.documentElement.clientWidth;
            if (posit.b < 0 || posit.t > h || posit.r < 0 || posit.l > w) {
                // this combobox is not visible; therefore, do not display the list box
                return false;
            }

            const result = {
                z: getMaxZIndex(document.body) + 1,
                w: Math.round(posit.w - (2 * this.getStyle('borderWidth')))
            };
            const spaceBelow = h - posit.b;
            if (spaceBelow < 100 && spaceBelow < posit.t) {
                // less than 100px below with more available above; therefore, put the list box above the combo box
                result.b = Math.round(h - posit.t - 1);
                result.above = true;
                // result.maxH = result.b;
            } else {
                result.t = Math.round(posit.b - 1);
                // result.maxH = h - result.t;
            }
            result.l = /* result.maxW = */posit.l;
            return result;
        }

        bdOnKeyDown(event) {
            const move = (listBox, direction) => {
                if (listBox) {
                    listBox[direction]();
                    const item = listBox.focusedItem;
                    if (item) {
                        const inputNode = this.bdInputNode;
                        if (inputNode) {
                            inputNode.value = item;
                            this.bdOnInput({});
                        } else {
                            this.text = item;
                        }
                    }
                }
            };

            const listBox = this.bdListBox;
            switch (event.keyCode) {
                case keys.down:
                    listBox ? move(listBox, 'down') : this.bdDisplayListBox();
                    break;
                case keys.up:
                    move(listBox, 'up');
                    break;
                case keys.pageDown:
                    move(listBox, 'pageDown');
                    break;
                case keys.pageUp:
                    move(listBox, 'pageUp');
                    break;
                case keys.enter:
                    if (listBox && listBox.focusedItem) {
                        listBox.selectedItem = listBox.focusedItem;
                    } else {
                        this.bdAcceptInput();
                    }
                    break;
                case keys.backspace: {
                    const inputNode = this.bdInputNode;
                    if (inputNode.selectionStart) {
                        inputNode.value = inputNode.value.substring(0, inputNode.selectionStart - 1);
                        this.bdOnInput(event);
                        break;
                    } else {
                        return;
                    }
                }
                default:
                    return;
            }
            stopEvent(event);
        }

        bdOnMouseDown(event) {
            if (event.button !== 0) {
                return;
            }
            if (!this.hasFocus) {
                this.bdDom.tabIndexNode.focus();
            }
            if (event.target === this.bdDom.root.querySelector('.arrow')) {
                if (this.bdListBox) {
                    if (!this.static) {
                        this.bdListBox.destroy();
                        delete this.bdListBox;
                        this.removeClassName('bd-listBox-visible', 'above', 'below');
                    }// else keep static boxes open since that's the only way to edit the value
                } else {
                    this.bdDisplayListBox();
                }
                stopEvent(event);
            }
        }

        bdOnInput(event) {
            const inputNode = this.bdInputNode;
            const srcText = inputNode.value;
            if (inputNode !== document.activeElement) {
                // this is unusual, the input node received input but is not the active (focused) element
                this.text = srcText;
                return;
            }
            const match = this.bdList.match(srcText);
            if (match) {
                const matchText = match.text;
                if (!match.perfect) {
                    inputNode.value = srcText + match.suffix;
                    inputNode.setSelectionRange(srcText.length, inputNode.value.length);
                }
                if (this.bdListBox) {
                    this.bdListBox.focusedItem = matchText;
                    if (!this.bdListBox.isInView(matchText)) {
                        this.bdListBox.scrollToItem(matchText, 'top');
                    }
                }
            } else if (this.bdListBox) {
                this.bdListBox.focusedItem = null;
            }

            // allow inputNode.value and this.text to be out of synch when input has the focus (illegal input
            // and/or not formatted); inputNode.value will be put back in synch and the text formatted when the
            // input loses the focus

            // eslint-disable-next-line no-unused-vars
            const [value, text, vStat] = this.validateText(srcText);
            this.bdMutate('value', 'bdValue', value, 'vStat', 'bdVStat', vStat);

            this.bdNotify(event);
        }
    }

    // eslint-disable-next-line no-eval
    defProps(ComboBox, [
        ['ro', 'ListBox'],
        ['ro', 'Meta'],
        ['ro', 'default'],
        ['ro', 'static'],
        ['ro', 'sift'],
        ['ro', 'noCase'],
        ['ro', 'sort'],
        ['rw', 'placeholder', 'bdPlaceholder']
    ]);

    Object.assign(ComboBox, {
        List: ComboList,
        ListBox: class ComboListBox extends ListBox {
            constructor(kwargs) {
                kwargs = { tabIndex: '', className: 'bd-for-combo', ...kwargs };
                super(kwargs);
                this.render();
            }
        },
        Meta: false,
        static: false,
        sift: false,
        noCase: true,
        errorValue: Symbol('error'),
        inputAttrs: { type: 'text' },
        placeholder: ' enter value ',
        watchables: ['value', 'text', 'vStat', 'placeholder'].concat(Component.watchables),
        events: ['input'].concat(Component.events),
    });

    const PROMISE_TIME_EXPIRED = Symbol('promise-time-expired');
    const PROMISE_CANCELED = Symbol('promise-canceled');
    const ppResolver = Symbol('ppResolver');
    const ppRejecter = Symbol('ppRejecter');
    const ppResolved = Symbol('ppResolved');
    const ppRejected = Symbol('ppRejected');
    const ppCanceled = Symbol('ppCanceled');
    const ppTimeoutHandle = Symbol('ppTimeoutHandle');

    function stopTimer(promise) {
        if (promise[ppTimeoutHandle]) {
            clearTimeout(promise[ppTimeoutHandle]);
            promise[ppTimeoutHandle] = 0;
        }
    }

    class Promise extends window.Promise {
        constructor(
            timeout, // optional, time in milliseconds before promise is rejected; if missing, then never rejected because of time
            executor // standard promise constructor executor argument: function(resolve, reject)
        ) {
            if (typeof timeout === 'function') {
                // signature is (executor)
                executor = timeout;
                timeout = false;
            }

            let resolver = 0;
            let rejecter = 0;
            super((_resolver, _rejecter) => {
                resolver = _resolver;
                rejecter = _rejecter;
            });

            Object.defineProperties(this, {
                [ppTimeoutHandle]: {
                    value: 0,
                    writable: true
                },
                [ppResolver]: {
                    value: resolver,
                    writable: true
                },
                [ppRejecter]: {
                    value: rejecter,
                    writable: true
                },
                [ppResolved]: {
                    value: false,
                    writable: true
                },
                [ppRejected]: {
                    value: false,
                    writable: true
                },
                [ppCanceled]: {
                    value: false,
                    writable: true
                },
            });

            if (timeout) {
                const self = this;
                this[ppTimeoutHandle] = setTimeout(() => {
                    self[ppTimeoutHandle] = 0;
                    self.cancel(PROMISE_TIME_EXPIRED);
                }, timeout);
            }

            executor && executor(
                this.resolve.bind(this),
                this.reject.bind(this)
            );
        }

        cancel(cancelResult) {
            if (!this[ppResolved] && !this[ppRejected] && !this[ppCanceled]) {
                this[ppCanceled] = true;
                stopTimer(this);
                this[ppRejecter]((this.cancelResult = cancelResult === undefined ? PROMISE_CANCELED : cancelResult));
            }
            return this;
        }

        get resolved() {
            return this[ppResolved];
        }

        get rejected() {
            return this[ppRejected];
        }

        get canceled() {
            return this[ppCanceled];
        }

        resolve(result) {
            if (!this[ppResolved] && !this[ppRejected] && !this[ppCanceled]) {
                this[ppResolved] = true;
                this.result = result;
                stopTimer(this);
                this[ppResolver](result);
            }
            return this;
        }

        reject(error) {
            if (!this[ppResolved] && !this[ppRejected] && !this[ppCanceled]) {
                this[ppRejected] = true;
                this.error = error;
                stopTimer(this);
                this[ppRejecter](error);
            }
            return this;
        }
    }

    Promise.promiseTimeExpired = PROMISE_TIME_EXPIRED;
    Promise.promiseCanceled = PROMISE_CANCELED;
    Promise.version = '2.2.0';

    class Dialog extends Component {
        constructor(kwargs) {
            super(kwargs);
            this.promise = new Promise();
            this.promise.dialog = this;
        }

        get title() {
            return this.bdDialogTitle || '';
        }

        set title(value) {
            if (this.bdMutate('title', 'bdDialogTitle', value) && this.rendered) {
                const titleNode = this.bdDom.root.querySelector('.bd-title');
                if (titleNode) {
                    titleNode.innerHTML = value;
                }
            }
        }

        onCancel() {
            this.promise.resolve(false);
        }

        onAccepted() {
            this.promise.resolve(true);
        }

        bdElements() {
            const body = this.dialogBody();
            return element.div(
                element.div({className: 'bd-inner', bdAttach: 'inner'},
                    element.div({className: 'bd-title-bar'},
                        element.div({className: 'bd-title'}, this.title),
                        element.div(
                            element(Button, {className: 'icon-close', handler: this.onCancel.bind(this)})
                        )),
                    element.div({className: 'bd-body'}, body))
            );
        }

        getDialogPosit() {
            return {};
        }
    }
    Dialog.className = 'bd-dialog';

    // function getDialogPosit() {
    //     return {
    //         h: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
    //         w: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    //     };
    // }

    Object.assign(Dialog, {
        className: 'bd-dialog',
        watchables: [].concat(Component.watchables),
        events: [].concat(Component.events),
        show(kwargs) {
            const theDialog = new this(kwargs);
            render(theDialog, document.body);
            setPosit(theDialog.inner, theDialog.getDialogPosit());
            setStyle(theDialog, 'zIndex', getMaxZIndex(document.body) + 100);
            // note: should not be able to scroll since the dialog should take exactly the viewport
            theDialog.own(viewportWatcher.advise('resize', () => setPosit(theDialog.inner, theDialog.getDialogPosit())));
            theDialog.promise.then(() => theDialog.destroy());
            return theDialog.promise;
        }
    });

    class Input extends Component {
        constructor(kwargs) {
            super(kwargs);
            'validateValue' in kwargs && (this.validateValue = kwargs.validateValue);
            'validateText' in kwargs && (this.validateText = kwargs.validateText);
            'format' in kwargs && (this.format = kwargs.format);

            const [value, text, vStat] = this.validateValue('value' in kwargs ? kwargs.value : this.default);
            this.bdValue = value;
            this.bdText = text;
            this.bdVStat = vStat;
        }

        get value() {
            return this.bdValue;
        }

        set value(_value) {
            const [value, text, vStat] = this.validateValue(_value);
            this.bdMutate('value', 'bdValue', value, 'text', 'bdText', text, 'vStat', 'bdVStat', vStat);
        }

        get text() {
            return this.bdText;
        }

        set text(_text) {
            const [value, text, vStat] = this.validateText(_text);
            this.bdMutate('value', 'bdValue', value, 'text', 'bdText', text, 'vStat', 'bdVStat', vStat);
        }

        // setting vStat directly is not allowed...it's done by clients by setting value/text
        // note, however, that the internal state of vStat can be manipulated
        get vStat() {
            return this.bdVStat;
        }


        //
        // validateValue, validateText, and format are the key methods that describe the behavior of an input
        // override in subclasses or provide per-instance methods to cause special behavior, e.g., see InputInteger et al
        validateValue(value) {
            return [value, this.format(value), VStat.valid()];
        }

        validateText(_text) {
            const value = this.trim ? _text.trim() : _text;
            return [value, value, VStat.valid()];
        }

        format(value) {
            if (!value) {
                return value === 0 ? '0' : '';
            } else {
                try {
                    return value.toString();
                } catch (error) {
                    return this.default;
                }
            }
        }

        // protected API...

        bdElements() {
            //
            // 1  div.bd-input [bd-disabled] [bd-focused] [bd-hidden] [vStat.className] [empty]
            // 2      div
            // 3          input
            // 5      div.vStat
            //
            //  1. the component root
            //  2. typically a relative box, either let input determine its size or style explicitly
            //  3. either cause parent to size or absolute posit (0, 0, 0, 0) off of explicitly-sized parent
            //  4. absolute posit (0, 0, 0, 0) within parent box, which is typically relative
            //  5. may be filled via CSS content (based on vStat.className in root) or explicitly in subclasses based on vStat
            //
            // Notice that [5] can be placed above/below/left/right of [2] bu making [1] a flex box (row or column, block or inline)
            // and then setting the flex order of [2] and [5]

            return element.div({
                bdReflectClass: [
                    'vStat', vStat => vStat.className,
                    'text', value => (value.length ? '' : 'empty')
                ]
            },
            (this.Meta ? element(this.Meta, {bdReflect: {vStat: 'vStat'}}) : false),
            element.div({className: 'bd-rbox'},
                element.input({
                    tabIndex: 0,
                    style: this.kwargs.style || this.kwargs.width || '',
                    bdAttach: 'bdInputNode',
                    bdAdvise: {input: 'bdOnInput'},
                    bdReflect: {value: 'text', disabled: 'disabled', placeholder: 'placeholder'},
                    ...(this.inputAttrs || this.kwargs.inputAttrs || this.constructor.inputAttrs)
                })));
        }

        // private API...
        bdOnBlur() {
            super.bdOnBlur();
            // when the input has the focus, this.text and the input node value may _NOT_ be synchronized since
            // we must allow the user to have unformatted text on the way to inputting legal text. Upon
            // losing focus, this.text and the input node value must again be brought into congruence.
            this.text = this.bdInputNode.value;
        }

        bdOnInput(event) {
            const inputNode = this.bdInputNode;
            const srcText = inputNode.value;
            if (inputNode === document.activeElement) {
                // allow inputNode.value and this.text to be out of synch when input has the focus (illegal input
                // and/or not formatted); inputNode.value will be put back in synch and the text formatted when the
                // input loses the focus

                // eslint-disable-next-line no-unused-vars
                const [value, text, vStat] = this.validateText(srcText);
                this.bdMutate('value', 'bdValue', value, 'vStat', 'bdVStat', vStat);
            } else {
                this.text = srcText;
            }
            this.bdNotify(event);
        }
    }

    defProps(Input, [
        ['ro', 'Meta'],
        ['ro', 'default'],
        ['ro', 'trim'],
        ['rw', 'placeholder', 'bdPlaceholder']
    ]);

    Object.assign(Input, {
        className: 'bd-input',
        Meta: false,
        default: '',
        errorValue: Symbol('error'),
        trim: true,
        inputAttrs: {type: 'text'},
        placeholder: ' enter value ',
        watchables: ['value', 'text', 'vStat', 'placeholder'].concat(Component.watchables),
        events: ['input'].concat(Component.events)
    });

    class Labeled extends Component.withWatchables('label') {
        bdElements() {
            return element.div({bdAttach: 'bdChildrenAttachPoint'},
                element('label', {bdReflect: 'label'}));
        }
    }
    Labeled.className = 'bd-labeled';

    class Meta extends Component {
        constructor() {
            super({});
            this.bdVStat = VStat.valid();
        }

        get vStat() {
            return this.bdVStat;
        }

        set vStat(value) {
            if (!VStat.eql(this.bdVStat, value)) {
                this.bdMutate('vStat', 'bdVStat', value);
            }
        }

        bdElements() {
            return element.div({
                className: 'bd-meta icon-',
                bdReflect: {title: ['vStat', v => v.message]},
                bdReflectClass: ['vStat', v => v.className]
            });
        }
    }

    Object.assign(Meta, {
        watchables: ['vStat'].concat(Component.watchables),
        events: [''].concat(Component.events)
    });

    class States {
        constructor(owner, states, value) {
            this.owner = owner;
            this.reset(states, value);
        }

        reset(states, value) {
            this.currentState && this.owner.removeClassName(this.className);
            this.states = states;
            const index = this.findIndex(value);
            this.currentState = states[index !== -1 ? index : 0];
            this.owner.addClassName(this.className);
        }

        get state() {
            return this.currentState;
        }

        set value(value) {
            const index = this.findIndex(value);
            if (index === -1) {
                // eslint-disable-next-line no-console
                console.error('unexpected, but ignored');
            } else {
                this.owner.removeClassName(this.className);
                this.currentState = this.states[index];
                this.owner.addClassName(this.className);
            }
        }

        get value() {
            return this.currentState.value;
        }

        get className() {
            return this.currentState.className;
        }

        get label() {
            return this.currentState.label;
        }

        get mark() {
            return this.currentState.mark;
        }

        findIndex(value) {
            return this.states.findIndex(state => state.value === value);
        }

        exists(value) {
            return this.findIndex(value) !== -1;
        }

        nextValue() {
            return this.states[(this.findIndex(this.value) + 1) % this.states.length].value;
        }
    }

    const DEFAULT_2_STATE_VALUES = [false, true];
    const DEFAULT_3_STATE_VALUES = [null, true, false];

    function valuesToStates(values) {
        return values.map(value => ({value, mark: `${value}`}));
    }

    class StateButton extends Button {
        constructor(kwargs) {
            // note that we keep the handler feature, but watching "value" is likely much more useful
            super(kwargs);

            const states = kwargs.states || valuesToStates(kwargs.values);
            if (!Array.isArray(states)) {
                throw new Error('illegal states');
            }
            Object.defineProperties(this, {
                bdStates: {
                    value: new States(this, this.bdConditionStates(states), kwargs.value)
                }
            });
        }

        get value() {
            return this.bdStates.value;
        }

        set value(value) {
            if (!this.bdStates.exists(value)) {
                // eslint-disable-next-line no-console
                console.warn('illegal value provided; ignored');
            } else {
                const oldValue = this.value;
                if (value !== oldValue) {
                    const oldState = this.bdStates.state;
                    this.bdStates.value = value;
                    this.bdMutateNotify('value', value, oldValue);
                    this.bdMutateNotify('state', this.bdStates.state, oldState);
                }
            }
        }

        get states() {
            // deep copy
            return this.bdStates.states.map(state => ({ ...state}));
        }

        get state() {
            // deep copy
            return { ...this.bdStates.state};
        }

        reset(states, value) {
            if (!Array.isArray(states)) {
                throw new Error('illegal states');
            } else {
                this.bdStates.reset(this.bdConditionStates(states), value);
                this.bdMutateNotify('value', this.value, undefined);
                this.bdMutateNotify('state', this.value, undefined);
            }
        }

        // protected API...

        bdElements() {
            const labelText = state => {
                const label = state.label;
                return label !== undefined ? (label || '') : (this.label !== undefined ? this.label : '');
            };

            const markText = state => {
                const mark = state.mark;
                return mark !== undefined ? (mark || '') : '';
            };

            return element.div({tabIndex: -1, bdAdvise: {click: this.bdOnClick.bind(this)}},
                element.div({bdReflect: ['state', labelText]}),
                element.div({bdReflect: ['state', markText]}));
        }

        // private API...

        bdConditionStates(value) {
            return value.map((state, i) => {
                const result = {
                    value: 'value' in state ? state.value : i,
                    className: 'className' in state ? state.className : `state-${i}`,
                    mark: state.mark || '',
                };
                if ('label' in state) {
                    result.label = state.label;
                }
                return result;
            });
        }

        bdOnClick(event) {
            // override Button's Button.bdOnClick
            stopEvent(event);
            if (this.enabled) {
                this.value = this.bdStates.nextValue();
                this.handler && this.handler();
                this.bdNotify({name: 'click', event});
            }
        }
    }
    Object.assign(StateButton, {
        className: 'bd-state-button',
        watchables: ['value', 'state'].concat(Button.watchables),
        events: ['value', 'state'].concat(Button.events)
    });

    function valuesToStatesNoMark(values) {
        return values.map(value => ({value}));
    }

    function getStates(_states, nullable, nullMark, falseMark, trueMark) {
        function setDefaults(dest, className, mark) {
            if (!('className' in dest)) {
                dest.className = className;
            }
            if (!('mark' in dest)) {
                dest.mark = mark;
            }
        }

        let states;
        if (_states) {
            if ((nullable && _states.length !== 3) || (!nullable && _states.length !== 2)) {
                throw new Error('illegal states');
            } else {
                // valid states provided...
                states = _states;
            }
        } else {
            states = valuesToStatesNoMark(nullable ? DEFAULT_3_STATE_VALUES : DEFAULT_2_STATE_VALUES);
        }

        let i = 0;
        if (nullable) {
            setDefaults(states[i++], 'state-null', nullMark);
        }
        setDefaults(states[i++], 'state-false', falseMark);
        setDefaults(states[i++], 'state-true', trueMark);
        return states;
    }

    StateButton.Checkbox = class CheckBox extends StateButton {
        constructor(kwargs) {
            super({
                ...kwargs,
                states: getStates(
                    kwargs.values ? valuesToStatesNoMark(kwargs.values) : kwargs.states,
                    kwargs.nullable,
                    '?', ' ', 'X'
                )
            });
            this.addClassName('checkbox');
        }
    };


    StateButton.RadioButton = class RadioButton extends StateButton {
        constructor(kwargs) {
            super({
                ...kwargs,
                states: getStates(
                    kwargs.values ? valuesToStatesNoMark(kwargs.values) : kwargs.states,
                    kwargs.nullable,
                    '\u{e912}', '\u{e912}', '\u{e911}'
                )
            });
            this.addClassName('radio-button');
        }
    };

    exports.Button = Button;
    exports.ComboBox = ComboBox;
    exports.Dialog = Dialog;
    exports.Input = Input;
    exports.Labeled = Labeled;
    exports.ListBox = ListBox;
    exports.Meta = Meta;
    exports.StateButton = StateButton;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
