import {Component, e, render} from "./lib.js";
import Button from "./button/Button.js";
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





// a ticklish button
e(Button, {label: "Ticklish", className: "tickle"})


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
	},
	{
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
