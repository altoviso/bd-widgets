import {e, TestContainer, render, smoke, assert, assertClassNameEq} from "../../test/lib.js";
import Button from "../button/Button.js";
import StateButton from "./StateButton.js";

let action = smoke.Action.action;
let keys = action.keys;
let top = 0;

function showValueChange(value){
	console.log("value change: ", value);
}

smoke.defTest({
	id: "stateButton-demo",
	before(){
		top = render(TestContainer, document.getElementById("bd-smoke-root"));
	},
	finally(){
		top.unrender();
		top = 0;
	},
	test: function(logger){
		let resolve;
		let result = new Promise(_resolve => (resolve = _resolve));
		let tabIndex = 1;
		top.insChild(e(StateButton.Checkbox, {
			tabIndex: tabIndex++,
			bdWatch: {"value": showValueChange}
		}));
		top.insChild(e(StateButton.Checkbox, {
			value: true,
			tabIndex: tabIndex++,
			bdWatch: {"value": showValueChange}
		}));
		top.insChild(e(StateButton.Checkbox, {
			nullable: true,
			tabIndex: tabIndex++,
			bdWatch: {"value": showValueChange}
		}));
		top.insChild(e(StateButton.Checkbox, {
			values: ["A", "B"],
			tabIndex: tabIndex++,
			bdWatch: {"value": showValueChange}
		}));
		top.insChild(e(StateButton.Checkbox, {
			nullable: true,
			values: ["A", "B", "C"],
			tabIndex: tabIndex++,
			bdWatch: {"value": showValueChange}
		}));
		top.insChild(e(StateButton.Checkbox, {
			states: [{value: false, mark: "F"}, {value: true, mark: "T"}],
			tabIndex: tabIndex++,
			bdWatch: {"value": showValueChange}
		}));
		top.insChild(e(StateButton.Checkbox, {
			states: [{value: null, mark: "?"}, {value: false, mark: "F"}, {value: true, mark: "T"}],
			nullable: true,
			tabIndex: tabIndex++,
			bdWatch: {"value": showValueChange}
		}));
		top.insChild(e(StateButton.RadioButton,
			{tabIndex: tabIndex++, bdWatch: {"value": showValueChange}}
		));
		top.insChild(e(StateButton.RadioButton,
			{nullable: true, tabIndex: tabIndex++, bdWatch: {"value": showValueChange}}
		));
		top.insChild(e(StateButton,
			{
				states: [{value: 123, mark: "A"}, {value: 456, mark: "B"}, {value: 789, mark: "C"}],
				value: 456,
				tabIndex: tabIndex++,
				bdWatch: {"value": showValueChange}
			}
		));
		top.insChild(e(StateButton,
			{
				label: "State: ",
				states: [{mark: "A"}, {mark: "B"}, {mark: "C"}],
				tabIndex: tabIndex++,
				bdWatch: {"value": showValueChange}
			}
		));
		top.insChild(e(StateButton,
			{
				label: "A-F: ",
				states: [..."ABCDEF"].map(c => ({mark: c})),
				tabIndex: tabIndex++,
				bdWatch: {"value": showValueChange}
			}
		));
		top.insChild(e(StateButton,
			{
				label: "U-Z: ",
				values: [..."UVWXYZ"],
				tabIndex: tabIndex++,
				bdWatch: {"value": showValueChange}
			}
		));
		top.insChild(e(Button, {
			label: "End Test",
			tabIndex: tabIndex++,
			handler: resolve
		}));
		top.message = "a bunch of different kinds of buttons";
		top.prompt = "press the end test button to end the test";
		return result;
	}
});

smoke.defBrowserTest({
	id: "stateButton",
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
			["core", function(logger){
				let child = top.insChild(e(StateButton, {
					states: [{value: 123, mark: "A"}, {value: 456, mark: "B"}, {value: 789, mark: "C"}],
					value: 456,
					tabIndex: -1
				}));
				assert(top.children[0] instanceof StateButton);
				top.delChild(child);
			}],
			["render", function(){
			}]
		]
	}, {
		id: "dynamic",
		test: async function(){
			top.start(this);
			top.finish();
		}
	}]
});


let logResults = {
	"stateButton/dynamic": []
};
