import {Component, e, render, setStyle, setPosit, getMaxZIndex, viewportWatcher} from "../lib.js";
import Button from "../button/Button.js";
import Promise from "../../../bd-promise/Promise.js";

export default class Dialog extends Component {
	constructor(kwargs){
		super(kwargs);
		this.promise = new Promise();
		this.promise.dialog = this;
	}

	// protected API...
	get title(){
		return this.bdDialogTitle || "";
	}

	set title(value){
		this.bdDialogTitle = value;
	}

	onCancel(){
		this.promise.resolve(false);
	}

	onAccepted(){
		this.promise.resolve(true);
	}

	bdElements(){
		let body = this.dialogBody();
		return e("div",
			e("div", {className: "bd-inner"},
				e("div", {className: "bd-title-bar"},
					e("div", this.title),
					e("div",
						e(Button, {className: "icon-close", handler: this.onCancel.bind(this)})
					)
				),
				e("div", {className: "bd-body"}, body)
			)
		);
	}
}
Dialog.className = "bd-dialog";

function getDialogPosit(){
	return {
		h: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
		w: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
	};
}

Object.assign(Dialog, {
	className: "bd-dialog",
	watchables: [].concat(Component.watchables),
	events: [].concat(Component.events),
	show(kwargs){
		let theDialog = new this(kwargs);
		render(theDialog, document.body);
		setPosit(theDialog, getDialogPosit());
		setStyle(theDialog, "zIndex", getMaxZIndex(document.body) + 100);
		theDialog.own(viewportWatcher.advise("resize", () => setPosit(theDialog, getDialogPosit())));
		theDialog.promise.then(() => theDialog.destroy());
		return theDialog.promise;
	}
});


