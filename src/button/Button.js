import {Component, e, connect, stopEvent} from '../lib.js';

let ns = Component.getNamespace();
const pLabel = ns.get("pLabel");
const pOnClick = ns.get("pOnClick");
const pOnMouseDown = ns.get("pOnMouseDown");

export default class Button extends Component {
	constructor(kwargs){
		super(kwargs);
		Object.defineProperties(this, {
			[pLabel]: {
				writable: true, value: kwargs.label || ''
			}
		});
		kwargs.handler && (this.handler = kwargs.handler);
	}

	get label(){
		return this[pLabel];
	}

	set label(value){
		if(value !== this[pLabel]){
			this._dom && (this.labelNode.innerHTML = value);
			this.bdMutate('label', pLabel, value);
		}
	}

	// protected API...

	bdElements(){
		//
		// 1  div.bd-button [bd-disabled] [bd-focused] [bd-hidden]
		// 2      div
		// 3          <this[pLabel]>
		//
		return e('div', {className: 'bd-button', bdAdvise: {click: pOnClick, mousedown: pOnMouseDown}},
			e('div', {
				tabIndex: 0,
				bdAttach: 'labelNode',
				innerHTML: this[pLabel]
			})
		);
	}

	// private API...

	[Component.pOnFocus](){
		if(!this._keyHandler){
			this._keyHandler = connect(this._dom.root, 'keypress', (e) => {
				if(e.charCode == 32){
					// space bar => click
					this[pOnClick](e);
				}
			});
		}
		super[Component.pOnFocus]();
	}

	[Component.pOnBlur](){
		super[Component.pOnBlur]();
		this._keyHandler && this._keyHandler.destroy();
		delete this._keyHandler;
	}

	[pOnClick](e){
		stopEvent(e);
		if(this[Component.pEnabled]){
			if(!this.hasFocus){
				this.focus();
			}
			this.handler && this.handler();
			this.bdNotify({name: 'click', nativeEvent: e});
		}
	}

	[pOnMouseDown](e){
		if(this.hasFocus){
			// pressing the left mouse down outside of the label (the focus node) inside the containing div causes
			// the focus to leave the label; we don't want that when we have the focus...
			stopEvent(e);
		}
	}
}

ns.publish(Button, {
	watchables: ['label'],
	events: ['click']
});

