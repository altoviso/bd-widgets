import {Component, e, div, VStat, defProps} from "../lib.js";

export default class Input extends Component {
	constructor(kwargs){
		super(kwargs);
		"validateValue" in kwargs && (this.validateValue = kwargs.validateValue);
		"validateText" in kwargs && (this.validateText = kwargs.validateText);
		"format" in kwargs && (this.format = kwargs.format);

		let [value, text, vStat] = this.validateValue("value" in kwargs ? kwargs.value : this.default);
		this.bdValue = value;
		this.bdText = text;
		this.bdVStat = vStat;
	}

	get value(){
		return this.bdValue;
	}

	set value(_value){
		let [value, text, vStat] = this.validateValue(_value);
		this.bdMutate("value", "bdValue", value, "text", "bdText", text, "vStat", "bdVStat", vStat);
	}

	get text(){
		return this.bdText;
	}

	set text(_text){
		let [value, text, vStat] = this.validateText(_text);
		this.bdMutate("value", "bdValue", value, "text", "bdText", text, "vStat", "bdVStat", vStat);
	}

	// setting vStat directly is not allowed...it's done by clients by setting value/text
	// note, however, that the internal state of vStat can be manipulated
	get vStat(){
		return this.bdVStat;
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

		return div({
				bdReflectClass: [
					"vStat", vStat => vStat.className,
					"text", value => (value.length ? "" : "empty")
				]
			},
			(this.Meta ? e(this.Meta, {bdReflect: {vStat: "vStat"}}) : false),
			div({className: "bd-rbox"},
				e("input", Object.assign({
					tabIndex: 0,
					style: this.kwargs.style || this.kwargs.width || "",
					bdAttach: "bdInputNode",
					bdAdvise: {input: "bdOnInput"},
					bdReflect: {value: "text", disabled: "disabled", placeholder: "placeholder"},
				}, (this.inputAttrs || this.kwargs.inputAttrs || this.constructor.inputAttrs)))
			)
		);
	}

	// private API...
	bdOnBlur(){
		super.bdOnBlur();
		// when the input has the focus, this.text and the input node value may _NOT_ be synchronized since
		// we must allow the user to have unformatted text on the way to inputting legal text. Upon
		// losing focus, this.text and the input node value must again be brought into congruence.
		this.text = this.bdInputNode.value;
	}

	bdOnInput(e){
		let inputNode = this.bdInputNode;
		let srcText = inputNode.value;
		if(inputNode === document.activeElement){
			// allow inputNode.value and this.text to be out of synch when input has the focus (illegal input
			// and/or not formatted); inputNode.value will be put back in synch and the text formatted when the
			// input loses the focus

			// eslint-disable-next-line no-unused-vars
			let [value, text, vStat] = this.validateText(srcText);
			this.bdMutate("value", "bdValue", value, "vStat", "bdVStat", vStat);
		}else{
			this.text = srcText;
		}
		this.bdNotify(e);
	}
}

eval(defProps("Input", [
	["ro", "Meta"],
	["ro", "default"],
	["ro", "trim"],
	["rw", "placeholder", "bdPlaceholder"]
]));

Object.assign(Input, {
	className: "bd-input",
	Meta: false,
	default: "",
	errorValue: Symbol("error"),
	trim: true,
	inputAttrs: {type: "text"},
	placeholder: " enter value ",
	watchables: ["value", "text", "vStat", "placeholder"].concat(Component.watchables),
	events: ["input"].concat(Component.events)
});
