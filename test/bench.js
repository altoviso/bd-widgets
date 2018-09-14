import {Component, e, render} from "../node_modules/bd-core/lib.js";
import Button from "../src/button/Button.js";
import StateButton from "../src/stateButton/StateButton.js";
import Input from "../src/input/Input.js";
import InputInteger from "../src/input/InputInteger.js";
import InputNumber from "../src/input/InputNumber.js";
import InputBoolean from "../src/input/InputBoolean.js";
import InputMap from "../src/input/InputMap.js";
import ListBox from "../src/listBox/ListBox.js";
import ComboBox from "../src/comboBox/ComboBox.js";

/* eslint-disable no-console */

let componentTypes = {
	button: Button,
	statebutton: StateButton,
	input: Input,
	inputinteger: InputInteger,
	inputnumber: InputNumber,
	inputboolean: InputBoolean,
	inputmap: InputMap,
	listbox: ListBox,
	comboBox: ComboBox
};

function monitor(component){
	component.constructor.watchables.forEach(prop => {
		component.watch(prop,
			(newValue, oldValue) => {
				console.log("[" + prop + "]", newValue, "[old:", oldValue, "]");
			}
		);
	});
	component.constructor.events.forEach(name => component.advise(name, (e) => console.log(e)));
	window.z = component;
}

class Top extends Component {
	bdElements(){
		let componentType;
		let ctorParams = {};
		let qString = decodeURIComponent(window.location.search.substring(1));
		((qString && qString.split("#")[0]) || "").split("&").forEach(arg => {
			arg = arg.trim();
			if(/=/.test(arg)){
				arg = arg.split("=").map(s => s.trim());
				ctorParams[arg[0]] = arg[1];
			}else{
				if(componentTypes[arg.toLowerCase()]){
					componentType = componentTypes[arg.toLowerCase()];
				}else{
					ctorParams[arg] = true;
				}
			}
		});

		return e("div",
			e("div", e(Button, {label: "Focusable-1"})),
			e("div", e(componentType, Object.assign(ctorParams, {bdAttach: monitor}))),
			e("div", e(Button, {label: "Focusable-2"})),
		);
	}
}

render(Top, document.getElementById("root"));
