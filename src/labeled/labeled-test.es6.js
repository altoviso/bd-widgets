import {e, TestContainer, render, smoke, assert, assertClassNameEq} from "../../test/lib.js";
import Button from "../button/Button.js";
import Input from "../input/Input.js";
import Dialog from "./Dialog.js";

let action = smoke.Action.action;
let keys = action.keys;
let top = 0;

export default class RenameDialog extends Dialog {
	constructor(kwargs){
		super(kwargs);
		if(!kwargs.title){
			this.title = "Rename";
		}
	}
	dialogBody(){
		return e.div({className: "rename-dialog"},
			e.div(
				e.div({className: "labeled"},
					e.div("Current Name:"),
					e(Input, {value: this.kwargs.currentName, placeholder: "any text", disabled:true})
				),
				e.div({className: "labeled"},
					e.div("New Name:"),
					e(Input, {bdAttach: "newName", value: this.kwargs.currentName, placeholder: "enter new name"})
				)
			),
			e.div({className: "bottom-buttons"},
				e(Button, {label: "Cancel", handler: ()=> this.onCancel()}),
				e(Button, {label: "OK", handler: ()=> this.promise.resolve(this.newName.value)})
			)
		);
	}
}

smoke.defTest({
	id: "dialog-demo",
	before(){
		top = render(TestContainer, document.getElementById("bd-smoke-root"));
	},
	finally(){
		top.unrender();
		top = 0;
	},
	test: function(){
		let resolve;
		let result = new Promise(_resolve => (resolve = _resolve));
		let tabIndex = 1;
		top.insChild(e(Button, {
			label: "Rename",
			tabIndex: tabIndex++,
			handler: () => RenameDialog.show({currentName:"thisIsTheCurrentName"}).then(result => console.log("the dialog returned:", result))
		}));
		top.insChild(e(Button, {
			label: "End Test",
			tabIndex: tabIndex++,
			handler: resolve
		}));
		top.message = "a rename dialog";
		top.prompt = "press the end test button to end the test";
		return result;
	}
});

smoke.defBrowserTest({
	id: "button",
	before(){
		top = render(TestContainer, document.getElementById("bd-smoke-root"));
	},
	beforeEach(){
		while(top.children && top.children.length){
			top.delChild(top.children.pop());
		}
	},
	finally(){
		top.unrender();
		top = 0;
	},
	tests: [{
		id: "static",
		tests: [
			["basic", function(){

			}],
		]
	}, {
		id: "dynamic",
		test: async function(){
			return new Promise(function(resolve){
				setTimeout(resolve, 100);
			});
		}
	}]
});
