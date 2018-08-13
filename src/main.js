import {Component, e, render} from "./lib.js";
import Button from "./button/Button.js";
import StateButton from "./stateButton/StateButton.js";
import ReactComponent from "./reactComponent/ReactComponent.js";

class DemoContainerForReactComponent extends Component {
	onChange(e){
		console.log("react-select onChange:", e.value);
		this.theSelect.props = {value: e.value};
	}

	_elements(){
		return e("div", e(ReactComponent, {
			component: Select,
			props: {
				onChange: this.onChange.bind(this),
				options: [
					{value: 'chocolate', label: 'Chocolate'},
					{value: 'strawberry', label: 'Strawberry'},
					{value: 'vanilla', label: 'Vanilla'}
				]
			},
			[e.attach]: "theSelect"
		}));
	}
}

function showValueChange(value){
	console.log("value change: ", value);
}

let tabIndex = 1;
let components = [
	{
		title: "Buttons", class: Button, ctorArgs: [
			{label: "OK", title: "click me!", tabIndex: tabIndex++, handler: () => console.log("clicked OK button")},
			{
				label: "Ticklish",
				className: "tickle",
				tabIndex: tabIndex++,
				handler: () => console.log("clicked Ticklish button")
			},
			{
				label: "Disabled",
				enabled: false,
				tabIndex: tabIndex++,
				handler: () => console.log("clicked Disabled button")
			},
			{
				className: "icon-",
				label: "\u{e904}",
				tabIndex: tabIndex++,
				handler: () => console.log("clicked save button")
			},
		]
	}, {
		title: "StateButton.Checkbox", class: StateButton.Checkbox, ctorArgs: [
			{
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				value: true,
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				nullable: true,
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				values: ["A", "B"],
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				nullable: true,
				values: ["A", "B", "C"],
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				states: [{value: false, mark: "F"}, {value: true, mark: "T"}],
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				states: [{value: null, mark: "?"}, {value: false, mark: "F"}, {value: true, mark: "T"}],
				nullable: true,
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			}
		]
	}, {
		title: "StateButton.RadioButton", class: StateButton.RadioButton, ctorArgs: [
			{tabIndex: tabIndex++, [e.watch]: {"value": showValueChange}},
			{nullable: true, tabIndex: tabIndex++, [e.watch]: {"value": showValueChange}}
		]
	}, {
		title: "StateButton", class: StateButton, ctorArgs: [
			{
				states: [{value: 123, mark: "A"}, {value: 456, mark: "B"}, {value: 789, mark: "C"}],
				value: 456,
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				label: "State: ",
				states: [{mark: "A"}, {mark: "B"}, {mark: "C"}],
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				label: "A-F: ",
				states: [..."ABCDEF"].map(c => ({mark: c})),
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			},
			{
				label: "U-Z: ",
				values: [..."UVWXYZ"],
				tabIndex: tabIndex++,
				[e.watch]: {"value": showValueChange}
			}
		]
	}, {
		title: "ReactComponent", class: DemoContainerForReactComponent, ctorArgs: [{}]
	}
];


class Top extends Component {
	_elements(){
		return e("div", components.map((item) => e("div", {className: "component-section"},
			e("p", {className: "title"}, item.title),
			item.ctorArgs.map((ctorArgs) => e("div", {className: "container " + item.title}, e(item.class, ctorArgs)))
			))
		);
	}
}

render(Top, document.getElementById("root"));
