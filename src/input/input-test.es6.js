import {e, TestContainer, render, smoke, assert, assertClassNameEq} from "../../test/lib.js";
import Button from "../button/Button.js";
import Input from "./Input.js";
import InputBoolean from "./InputBoolean.js";
import InputFloat from "./InputFloat.js";
import InputInteger from "./InputInteger.js";
import InputMap from "./InputMap.js";

let action = smoke.Action.action;
let keys = action.keys;
let top = 0;

function showValueChange(value){
	console.log("value change: ", value);
}

smoke.defTest({
	id: "input-demo",
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
		top.insChild(e(Input, {
			value: "test value",
			placeholder: "any text"
		}));
		top.insChild(e(InputInteger, {
			value: 0,
			placeholder: "integers"
		}));
		top.insChild(e(InputFloat, {
			value: 0,
			placeholder: "numbers"
		}));
		top.insChild(e(InputBoolean, {
			value: false,
			placeholder: "boolean"
		}));
		// top.insChild(e(InputMap, {
		// 	value: 0
		// }));
		top.insChild(e(Button, {
			label: "End Test",
			tabIndex: tabIndex++,
			handler: resolve
		}));
		top.message = "a bunch of different kinds of input controls";
		top.prompt = "press the end test button to end the test";
		return result;
	}
});

smoke.defTest({
	id: "input-demo",
	test: function(logger){
		let top = test.top;

		top.insChild(e(Button, {
			label: "OK",
			handler: () => console.log("button handler"),
			bdWatch: {
				hasFocus: hasFocus => console.log("button " + (hasFocus ? "focused" : "blurred"))
			}
		}));
	}
});

smoke.defTest({
	id: "input",
	tests: [{
		id: "static",
		tests: [
			["core", function(){
				// TODO
				assert(true);
			}]
		]
	}, {
		id: "dynamic",
		test: function(){
			// TODO
			assert(true);
		}

	}]
});
