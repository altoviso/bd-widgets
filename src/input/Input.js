import {Component, e, VStat, connect, stopEvent} from "../lib.js";

let ns = Component.getNamespace();
const pDefault = ns.get("pDefault");
const pValue = ns.get("pValue");
const pText = ns.get("pText");
const pVStat = ns.get("pVStat");
const pPlaceholder = ns.get("pPlaceholder");
const pInputNodeAttributes = ns.get("pInputNodeAttributes");
const pTrim = ns.get("pTrim");
const pOnClick = ns.get("pOnClick");
const pOnInput = ns.get("pOnInput");

export default class Input extends Component {
	constructor(kwargs){
		super(kwargs);

		// settable only at construction...
		"placeholder" in kwargs && (this[pPlaceholder] = kwargs.placeholder);
		"default" in kwargs && (this[pDefault] = kwargs.default);
		"trim" in kwargs && (this[pTrim] = kwargs.trim);

		let [value, text, vStat] = this.validateValue("value" in kwargs ? kwargs.value : this.default);
		if(vStat.isError){
			[value, text, vStat] = this.validateValue(this.default);
		}
		Object.defineProperties(this, {
			[pValue]: {
				writable: true, value: value
			},
			[pText]: {
				writable: true, value: text
			},
			[pVStat]: {
				writable: true, value: vStat
			}
		});
	}

	// read-only
	get default(){
		return pDefault in this ? this[pDefault] : this.constructor.default;
	}

	get trim(){
		return pTrim in this ? this[pTrim] : this.constructor.trim;

	}

	// read-write
	get value(){
		return this[pValue];
	}

	set value(_value){
		// illegal value is ignored
		let [value, text, vStat] = this.validateValue(_value);
		if(vStat.isScalarLegal){
			this.bdMutate("value", pValue, value, "text", pText, text, "vStat", pVStat, vStat);
		}else{
			console.warn("illegal");
		}
	}

	get text(){
		return this[pText];
	}

	set text(_text){
		// illegal text is ignored
		let [value, text, vStat] = this.validateText(_text);
		if(vStat.isScalarLegal){
			this.bdMutate("value", pValue, value, "text", pText, text, "vStat", pVStat, vStat);
		}else{
			console.warn("illegal");
		}
	}

	get vStat(){
		return this[pVStat];
	}

	// setting vStat is considered a private/protected process...it's done by clients by setting value/text

	get placeholder(){
		return this[pPlaceholder] === undefined ? this.constructor.placeholder : this[pPlaceholder];
	}

	set placeholder(value){
		this.bdMutate("placeholder", pPlaceholder, value);
	}

	validateValue(value){
		return [value, this.format(value), VStat.valid()];
	}

	validateText(_text){
		let value = this.trim ? _text.trim() : _text;
		return [value, value, VStat.valid()];
	}

	format(value){
		return (value === null || value === undefined) ? "" : ((value.toString && value.toString()) || "");
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
		//  2. typically a relative box, either let input determine its size or style explicitly
		//  3. either cause parent to size or absolute posit (0, 0, 0, 0) off of explicitly-sized parent
		//  4. absolute posit (0, 0, 0, 0) within parent box
		//  5. may be filled via CSS content (based on vStat.className in root) or explicitly in subclasses based on vStat


		return e("div", {
				className: "bd-input",
				bdReflectClass: [
					"vStat", vStat => vStat.className,
					"text", value => (value.length ? "" : "empty")
				]
			},
			e("div",
				e("input", Object.assign(this.inputNodeAttributes || this.kwargs.inputNodeAttributes || this.constructor.inputNodeAttributes, {
					tabIndex: 0,
					bdAttach: "inputNode",
					bdAdvise: {input: pOnInput},
					bdReflectProp: {disabled: "disabled"},
					bdReflect: "text"
				})),
				e("div", {class: "placeholder", bdReflect: "placeholder"})
			),
			e("div", {className: "vStat"})
		);
	}

	// private API...

	[Component.pOnFocus](){
		super[Component.pOnFocus]();
	}

	[Component.pOnBlur](){
		super[Component.pOnBlur]();
		// when the input has the focus, this.value and the input node value may _NOT_ be the same since
		// we must allow the user to have illegal/unformatted text on the way to inputting legal text. Upon
		// losing focus, this.value and the input node value must again be brought into congruence. If an
		// illegal input was given, then we revert back to the last value.
		let [value, text, vStat] = this.validateText(this.inputNode.value);
		if(!VStat.isScalarLegal){
			[value, text, vStat] = this.validateValue(this.value);
		}
		this.bdMutate("value", pValue, value, "text", pText, text, "vStat", pVStat, vStat);
	}

	[pOnInput](e){
		let inputNode = e.target;
		let srcText = inputNode.value;
		if(inputNode === document.activeElement){
			// allow inputNode.value and this.value to be out of synch when input has the focus (illegal input
			// and/or not formatted); inputNode.value will be put back in synch and the text formatted when the
			// input loses the focus
			let [value, text, vStat] = this.validateText(srcText);
			if(vStat.isScalarLegal){
				this.bdMutate("value", pValue, value, "text", pText, srcText, "vStat", pVStat, vStat);
			}else{
				this.bdMutate("text", pText, srcText, "vStat", pVStat, vStat);
			}
		}else{
			this.text = srcText;
		}
		this.bdNotify(e)
	}

	[pOnClick](e){
	}
}

ns.publish(Input, {
	default: "",
	trim: true,
	inputNodeAttributes: {type: "text"},
	placeholder: " enter value ",
	watchables: ["value", "text", "vStat", "placeholder"].concat(Component.watchables),
	events: ["input"].concat(Component.events),
});
