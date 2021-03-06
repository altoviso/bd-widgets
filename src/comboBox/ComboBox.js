import {
    Component,
    e,
    stopEvent,
    VStat,
    getMaxZIndex,
    defProps,
    keys
} from '../lib.js';
import ComboList from './ComboList.js';
import ListBox from '../listBox/ListBox.js';

export default class ComboBox extends Component {
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
        return e.div({
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
        (this.Meta ? e(this.Meta, { bdReflect: { vStat: 'vStat' } }) : false),
        e.div({ className: 'bd-rbox' },
            this.static ?
                e.div({ className: 'bd-static', tabIndex: 0, bdReflect: ['text', s => s || '&nbsp;'] }) :
                e.input({
                    tabIndex: 0,
                    bdAdvise: { input: 'bdOnInput' },
                    bdReflect: { disabled: 'disabled', value: 'text', placeholder: 'placeholder' },
                    ...(this.inputAttrs || this.kwargs.inputAttrs || this.constructor.inputAttrs)
                })),
        e.div({ className: 'arrow icon-caret-down' }));
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
