import {Component, e, VStat, defProps} from "../lib.js";

let ns = Component.getNamespace();
const pValue = ns.get("pValue");
const pText = ns.get("pText");
const pVStat = ns.get("pVStat");
const pPlaceholder = ns.get("pPlaceholder");
const pInputNode = ns.get("pInputNode");
const pOnInput = ns.get("pOnInput");

export default class Input extends Component {
	constructor(kwargs){
		super(kwargs);
		"validateValue" in kwargs && (this.validateValue = kwargs.validateValue);
		"validateText" in kwargs && (this.validateText = kwargs.validateText);
		"format" in kwargs && (this.format = kwargs.format);

		let [value, text, vStat] = this.validateValue("value" in kwargs ? kwargs.value : this.default);
		this[pValue] = value;
		this[pText] = text;
		this[pVStat] = vStat;
	}

	get value(){
		return this[pValue];
	}

	set value(_value){
		let [value, text, vStat] = this.validateValue(_value);
		this.bdMutate("value", pValue, value, "text", pText, text, "vStat", pVStat, vStat);
	}

	get text(){
		return this[pText];
	}

	set text(_text){
		let [value, text, vStat] = this.validateText(_text);
		this.bdMutate("value", pValue, value, "text", pText, text, "vStat", pVStat, vStat);
	}

	// setting vStat directly is not allowed...it's done by clients by setting value/text
	// note, however, that the internal state of vStat can be manipulated
	get vStat(){
		return this[pVStat];
	}


	//
	// validateValue, validateText, and format are the key methods that describe the behavior of an input
	// override in subclasses or provide per-instance methods to cause special behavior, e.g., see InputInteger et al
	validateValue(value){
		return [value, this.format(value), VStat.valid()];
	}

	validateText(_text){
		let value = this.trim ? _text.trim() : _text;
		return [value, value, VStat.valid()];
	}

	format(value){
		if(!value){
			return value === 0 ? "0" : "";
		}else{
			try{
				return value.toString();
			}catch(e){
				return this.default;
			}
		}
	}

	// protected API...

	bdElements(){
		//
		// 1  div.bd-input [bd-disabled] [bd-focused] [bd-hidden] [vStat.className] [empty]
		// 2      div
		// 3          input
		// 4          div.placeholder
		// 5      div.vStat
		//
		//  1. the component root
		//  2. typically a relative box, either let input determine its size or style explicitly
		//  3. either cause parent to size or absolute posit (0, 0, 0, 0) off of explicitly-sized parent
		//  4. absolute posit (0, 0, 0, 0) within parent box, which is typically relative
		//  5. may be filled via CSS content (based on vStat.className in root) or explicitly in subclasses based on vStat
		//
		// Notice that [5] can be placed above/below/left/right of [2] bu making [1] a flex box (row or column, block or inline)
		// and then setting the flex order of [2] and [5]

		return e(
			"div", {
				className: "bd-input",
				bdReflectClass: [
					"vStat", vStat => vStat.className,
					"text", value => (value.length ? "" : "empty")
				]
			},
			(this.Meta ? e(this.Meta, {bdReflectProp: {vStat: "vStat"}}) : false),
			e("div", {className: "bd-rbox"},
				e("input", Object.assign({
					tabIndex: 0,
					bdAttach: pInputNode,
					bdAdvise: {input: pOnInput},
					bdReflectProp: {disabled: "disabled"},
					bdReflect: "text"
				}, (this.inputAttrs || this.kwargs.inputAttrs || this.constructor.inputAttrs))),
				e("div", {className: "placeholder", bdReflect: "placeholder"})
			)
		);
	}

	// private API...
	[Component.pOnBlur](){
		super[Component.pOnBlur]();
		// when the input has the focus, this.text and the input node value may _NOT_ be synchronized since
		// we must allow the user to have unformatted text on the way to inputting legal text. Upon
		// losing focus, this.text and the input node value must again be brought into congruence.
		this.text = this[pInputNode].value;
	}

	[pOnInput](e){
		let inputNode = this[pInputNode];
		let srcText = inputNode.value;
		if(inputNode === document.activeElement){
			// allow inputNode.value and this.text to be out of synch when input has the focus (illegal input
			// and/or not formatted); inputNode.value will be put back in synch and the text formatted when the
			// input loses the focus

			// eslint-disable-next-line no-unused-vars
			let [value, text, vStat] = this.validateText(srcText);
			this.bdMutate("value", pValue, value, "vStat", pVStat, vStat);
		}else{
			this.text = srcText;
		}
		this.bdNotify(e);
	}
}

// shut up eslint _and_ prove the variable exists before using it in a macro
pPlaceholder;

eval(defProps("Input", [
	["ro", "Meta"],
	["ro", "default"],
	["ro", "trim"],
	["rw", "placeholder", "pPlaceholder"]
]));

ns.publish(Input, {
	Meta: false,
	default: "",
	errorValue: Symbol("error"),
	trim: true,
	inputAttrs: {type: "text"},
	placeholder: " enter value ",
	watchables: ["value", "text", "vStat", "placeholder"],
	events: ["input"]
});
