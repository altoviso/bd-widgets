import {Component, e, render, setStyle, setPosit, getMaxZIndex, viewportWatcher} from '../lib.js';
import Button from '../button/Button.js';
import Promise from '../../../bd-promise/Promise.js';

export default class Dialog extends Component {
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
        return e.div(
            e.div({className: 'bd-inner', bdAttach: 'inner'},
                e.div({className: 'bd-title-bar'},
                    e.div({className: 'bd-title'}, this.title),
                    e.div(
                        e(Button, {className: 'icon-close', handler: this.onCancel.bind(this)})
                    )),
                e.div({className: 'bd-body'}, body))
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
        setStyle(theDialog.bdDom.root, 'zIndex', getMaxZIndex(document.body) + 100);
        // note: should not be able to scroll since the dialog should take exactly the viewport
        theDialog.own(viewportWatcher.advise('resize', () => setPosit(theDialog.inner, theDialog.getDialogPosit())));
        theDialog.promise.then(() => theDialog.destroy());
        return theDialog.promise;
    }
});
