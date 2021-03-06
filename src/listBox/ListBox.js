import {Component, e, connect, getPosit, insert, stopEvent, defProps, keys} from '../lib.js';

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

export default class ListBox extends Component {
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
                if (this.scrollToItem(this.bdDownArrow, 'bottom')) {
                    // the bottom arrow was out of view, so don't get more items
                } else {
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
                if (this.scrollToItem(this.bdUpArrow, 'top')) {
                    // the top arrow was out of view, so don't get more items
                } else {
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
        return e.div({
            className: 'bd-listBox unselectable',
            tabIndex: 0,
            bdAdvise: {keydown: 'bdOnKeyDown', mousedown: 'bdOnMouseDown', mouseover: 'bdOnMouseOver'}
        },
        e.div(
            e.div({className: 'items', bdAttach: 'bdItemAttachPoint'}),
        ),
        e.div({className: 'no-items', bdReflect: 'noItemsMessage'}));
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
        insert(child.bdDom.root, ref, posit);
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
            insert(arrow.bdDom.root, this.bdItemAttachPoint, direction === 'up' ? 'first' : 'last');
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
        if (this.kwargs.multiSelect) {
            // TODO: RFE
        } else {
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
            return e.div(this.kwargs.text);
        }
    },
    arrowComponent: class extends Component {
        constructor(kwargs) {
            super(kwargs);
            this.addClassName(kwargs.direction === 'up' ? 'up-arrow icon-caret-up' : 'down-arrow icon-caret-down');
        }

        bdElements() {
            return e.div({bdAdvise: {click: event => this.parent.bdOnClickArrow(event, this.kwargs.direction)}});
        }
    },
    watchables: ['focusedItem', 'selectedItem', 'mouseOverItem', 'noItemsMessage'].concat(Component.watchables),
    events: [].concat(Component.events)
});
