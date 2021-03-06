import {Component, e, connect, stopEvent} from '../lib.js';

export default class Button extends Component.withWatchables('label') {
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
        return e.div({className: 'bd-button', bdAdvise: {click: 'bdOnClick', mousedown: 'bdOnMouseDown'}},
            e.div({tabIndex: 0, bdReflect: 'label'}));
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
