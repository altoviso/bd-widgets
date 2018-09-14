import InputNumber from "./InputNumber.js";

export default class InputInteger extends InputNumber {
	// an input control that accepts an optionally range-limited integer

	validateValue(_value){
		let [value, text, vStat] = super.validateValue(_value);
		return [value === this.errorValue ? value : Math.round(value), text, vStat];
	}
}
