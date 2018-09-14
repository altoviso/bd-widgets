import {Component, e, connect, stopEvent, defProps} from "../lib.js";

let ns = Component.getNamespace();
const pLabel = ns.get("pLabel");
const pOnClick = ns.get("pOnClick");
const pOnMouseDown = ns.get("pOnMouseDown");
const pKeyHandler = ns.get("pKeyHandler");

export default class Button extends Component {
	constructor(kwargs){
		super(kwargs);
		kwargs.handler && (this.handler = kwargs.handler);
	}

	// protected API...

	bdElements(){
		//
		// 1  div.bd-button [bd-disabled] [bd-focused] [bd-hidden]
		// 2      div
		// 3          <this[pLabel]>
		//
		return e("div", {className: "bd-button", bdAdvise: {click: pOnClick, mousedown: pOnMouseDown}},
			e("div", {tabIndex: 0, bdReflect: "label"})
		);
	}

	// private API...

	[Component.pOnFocus](){
		if(!this[pKeyHandler]){
			this[pKeyHandler] = connect(this._dom.root, "keypress", (e) => {
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
		this[pKeyHandler] && this[pKeyHandler].destroy();
		delete this[pKeyHandler];
	}

	[pOnClick](e){
		stopEvent(e);
		if(this[Component.pEnabled]){
			if(!this.hasFocus){
				this.focus();
			}
			this.handler && this.handler();
			this.bdNotify({name: "click", nativeEvent: e});
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

// shut up eslint _and_ prove the variable exists before using it in a macro
pLabel;

eval(defProps("Button", [
	["rw", "label", "pLabel"]
]));

ns.publish(Button, {
	label: "",
	watchables: ["label"],
	events: ["click"]
});

