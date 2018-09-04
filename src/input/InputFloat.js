import Input from "./Input.js";
import {VStat} from "../lib.js";

export default class IntegerInput extends Input {
	validateValue(_value){
		let value, text;
		if(_value === undefined || value === "" || value === null){
			return [null, this.format(null), VStat.valid()];
		}
		let valueMap = this.valueMap;
		if(valueMap && valueMap.has(_value)){
			let value = valueMap.get(_value);
			return [value, this.format(value), VStat.valid()];
		}else{
			value = Number(_value);
			if(isNaN(value)){
				return [value, _value + "", VStat.scalarError()];
			}else{
				return [value, this.format(value), VStat.valid()];
			}
		}
	}

	validateText(text){
		text = text.trim();
		return text ? this.validateValue(Number(text)) : [null, this.format(null), VStat.valid()]
	}

	format(value, checkMap){
		return value === null ? "" : value + "";
	}
}
Object.assign(Input, {
	default: null,
	valueMap: null,
	textMap: null
});
