import Input from "./Input.js";
import {VStat} from "../lib.js";

let ns = Input.getNamespace();
const pValueMap = ns.get("pValueMap");
const pTextMap = ns.get("pTextMap");

export default class InputMap extends Input {
	constructor(kwargs){
		super(kwargs);

		// settable only at construction...
		if(kwargs.valueMap){
			this[pValueMap] = kwargs.valueMap;
		}else if(!this.constructor.valueMap){
			throw new Error("A valueMap must be provided to InputMap")
		}
		if(kwargs.textMap){
			this[pTextMap] = textMap;
		}else if(!this.constructor.textMap){
			throw new Error("A textMap must be provided to InputMap")
		}
	}

	// read-only
	get valueMap(){
		return this.valueMap;
	}

	get textMap(){
		return this.textMap;
	}

	validateValue(_value){
		let valueMap = this[pValueMap] || this.constructor.valueMap;
		if(valueMap.has(_value)){
			let value = valueMap.get(_value);
			return [value, this.format(value), VStat.valid()];
		}else{
			return [value, _value + "", VStat.scalarError()];
		}
	}

	validateText(_text){
		_text = _text.trim();
		let textMap = this[pTextMap] || this.constructor.textMap;
		if(textMap.has(_text)){
			let value = textMap.get(_text);
			return [value, this.format(value), VStat.valid()];
		}else{
			return [undefined, _text, VStat.scalarError()];
		}
	}

	format(value){
		return (this.formatter || this.constructor.formatter)(value);
	}
}

ns.publish(InputMap, {
	formatter: value => value === null || value === undefined ? "" : value + ""
});
