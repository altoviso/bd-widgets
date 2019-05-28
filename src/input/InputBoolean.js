import Input from "./Input.js";
import {VStat} from "../lib.js";

export default class IntegerBoolean extends Input {
	validateValue(_value){
		let value, text;
		if(!_value || _value==="false" || value==="0" || (typeof _value==="string" && !_value.trim())){
			return [false, this.format(false), VStat.valid()];
		}else{
			return [true, this.format(true), VStat.valid()];
		}
	}

	validateText(text){
		return this.validateValue(text);
	}

	format(value, checkMap){
		return value ? "true" : "false";
	}
}
