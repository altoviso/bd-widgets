import {Component, e, stopEvent, keys} from '../lib.js';
import ComboList from '../comboBox/ComboList.js';

class AccordionItem extends Component.withWatchables('selected') {
    bdElements() {
        return e.button({
            className: 'bd-accordion-item',
            bdReflectClass: ['selected', isSelected => isSelected ? 'selected' : ''],
            bdReflect: ['selected', selected => `${this.kwargs.text}${selected ? '<span class="icon-"></span>' : ''}`]
        });
    }
}

export default class Accordion extends Component.withWatchables('open') {
    constructor(kwargs) {
        super(kwargs);
        this.bdList = kwargs.list instanceof ComboList ? kwargs.list : new ComboList(kwargs);
        let [value] = this.bdList.getByValue('value' in kwargs ? kwargs.value : this.bdList.defaultValue);
        if (value === undefined) {
            [value] = this.bdList.getByValue(this.bdList.defaultValue);
        }
        this.bdValue = value;

        this.own(this.watch('value', newValue => {
            const list = this.bdList;
            this.rendered && this.children.forEach((child, i) => {
                child.selected = list[i][ComboList.VALUE] === newValue;
            });
        }));


        window.rawld = this;
    }

    // open is read-only
    get value() {
        return this.bdValue;
    }

    set value(_value) {
        const [value] = this.bdList.getByValue(_value);
        if (value === undefined) {
            throw new Error(`illegal value (${_value})`);
        }
        this.bdMutate('value', 'bdValue', value);
    }


    // protected API...

    bdElements() {
        //
        //   div.bd-Accordion [open] [bd-disabled] [bd-focused] [bd-hidden]
        //      AccordionItem
        //      AccordionItem
        //      ...
        //      AccordionItem
        const ItemClass = this.kwargs.ItemClass || this.constructor.ItemClass;
        return e.div({
            className: 'bd-accordion',
            bdReflectClass: ['open', isOpen => isOpen ? 'open' : ''],
            bdAdvise: {
                click: 'bdOnClick',
                mousedown: 'bdOnMouseDown',
                keydown: 'bdOnKeyDown'
            }
        }, this.bdList.map(item => e(ItemClass, {
            selected: item[ComboList.VALUE] === this.value,
            text: item[ComboList.TEXT]
        })));
    }

    // private API...


    bdOnKeyDown(event) {
        console.log(this.bdList[0][1], event.keyCode);
        switch (event.keyCode) {
            case keys.up:
            case keys.down:
                if (this.open) {
                    const childIndexWithFocus = this.childIndexWithFocus();
                    const delta = event.keyCode === keys.down ? 1 : -1;
                    let next = (childIndexWithFocus + delta) % this.children.length;
                    next = next >= 0 ? next : this.children.length - 1;
                    this.children[next].focus();
                } else {
                    this.open = true;
                }
                break;
            case keys.space:
                if (this.open) {
                    this.value = this.bdList[this.childIndexWithFocus()][ComboList.VALUE];
                    this.open = false;
                }
                break;
            case keys.enter:
                if (this.open) {
                    this.value = this.bdList[this.childIndexWithFocus()][ComboList.VALUE];
                    this.open = false;
                } else {
                    this.open = true;
                }
                break;
            default:
                return;
        }
        stopEvent(event);
    }

    bdOnClick(event) {
        if (this._open) {
            this.children.forEach(
                (child, i) => child.bdDom.root === event.target && (this.value = this.bdList[i][ComboList.VALUE])
            );
            this.open = false;
        } else {
            this.open = true;
            stopEvent(event);
        }
    }

    bdOnMouseDown(event) {
        if (this.hasFocus) {
            // pressing the left mouse down outside of the label (the focus node) inside the containing div causes
            // the focus to leave the label; we don't want that when we have the focus...
            stopEvent(event);
        }
    }

    childIndexWithFocus() {
        let result;
        this.children.find((child, i) => child.hasFocus && (result = i));
        return result;
    }
}

Accordion.ItemClass = AccordionItem;
Accordion.watchables = ['value'].concat(Component.watchables);
Accordion.events = ['click'].concat(Component.events);
