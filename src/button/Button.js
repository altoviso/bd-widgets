import {Component, e, connect, stopEvent} from "../lib.js";

const
	ppLabel = Symbol("button-label"),
	ppOnClick = Symbol("button-onClick");

export default class Button extends Component {
	constructor(kwargs){
		super(kwargs);
		Object.defineProperties(this, {
			[ppLabel]: {
				writable: true, value: kwargs.label || ""
			}
		});
		kwargs.handler && (this.handler = kwargs.handler);
	}

	get label(){
		return this[ppLabel];
	}

	set label(value){
		if(value !== this[ppLabel]){
			this._dom && (this.labelNode.innerHTML = value);
			this._applyWatchers("label", ppLabel, value);
		}
	}

	// protected API...

	_elements(){
		return e("div", {className: "bd-button", [e.advise]: {click: this[ppOnClick].bind(this)}},
			e("div", {
				[e.attach]: "labelNode",
				innerHTML: this[ppLabel],
				[e.tabIndexNode]: true
			})
		);
	}

	// private API...

	[Component.ppOnFocus](){
		if(!this._keyHandler){
			this._keyHandler = connect(this._dom.tabIndexNode, "keypress", (e)=>{
				if(e.charCode == 32){
					// space bar => click
					this[ppOnClick](e);
				}
			});
		}
		super[Component.ppOnFocus]();
	}

	[Component.ppOnBlur](){
		super[Component.ppOnBlur]();
		this._keyHandler.destroy();
		delete this._keyHandler;
	}

	[ppOnClick](e){
		stopEvent(e);
		if(this[Component.ppEnabled]){
			this.handler && this.handler();
			this._applyHandlers({name: "click", e: e});
		}
	}
}

Object.assign(Button, {
	ppLabel: ppLabel,
	ppOnClick: ppOnClick
});

