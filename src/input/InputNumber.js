import Input from "./Input.js";
import {VStat, defProps} from "../lib.js";

export default class InputNumber extends Input {
	// an input control that accepts an optionally range-limited integer
	set min(value){
		if(this.bdMutate("min", "bdMin", value)){
			// force recalc of vStat
			this.value = this.value;
		}
	}

	set max(value){
		if(this.bdMutate("min", "bdMax", value)){
			// force recalc of vStat
			this.value = this.value;
		}
	}

	set absMin(value){
		if(this.bdMutate("min", "bdAbsMin", value)){
			// force recalc of vStat
			this.value = this.value;
		}
	}

	set absMax(value){
		if(this.bdMutate("min", "bdAbsMax", value)){
			// force recalc of vStat
			this.value = this.value;
		}
	}

	validateValue(value){
		let typeofValue = typeof value;
		if(typeofValue !== "number"){
			if(typeofValue === "string"){
				value = value.trim();
				if(!value){
					value = this.errorValue;
					return [value, this.format(value), VStat.scalarError()];
				}// else, fall through
			}
			value = Number(value);
			if(Number.isNaN(value)){
				let value = this.errorValue;
				return [value, this.format(value), VStat.scalarError()];
			}
		}
		let text = this.format(value);
		if(value < this.absMin){
			return [this.errorValue, text, VStat.scalarError(this.absMinMsg)];
		}else if(value < this.min){
			return [value, text, VStat.scalarWarn(this.minMsg)];
		}else if(value > this.absMax){
			return [this.errorValue, text, VStat.scalarError(this.absMaxMsg)];
		}else if(value > this.max){
			return [value, text, VStat.scalarWarn(this.maxMsg)];
		}else{
			return [value, text, VStat.valid()];
		}
	}

	validateText(text){
		return this.validateValue(text + "");
	}

	format(value){
		return value === this.errorValue ? "?" : value + "";
	}
}

eval(defProps("InputNumber", [
	["ro", "errorValue"],

	["rw", "minMsg", "bdMinMsg"],
	["rw", "maxMsg", "bdMaxMsg"],
	["rw", "absMinMsg", "bdAbsMinMsg"],
	["rw", "absMaxMsg", "bdAbsMaxMsg"],

	// only define the getters since the setters are defined explicitly to force a recalc of vStat
	["ro", "min", "bdMin"],
	["ro", "max", "bdMax"],
	["ro", "absMin", "bdAbsMin"],
	["ro", "absMax", "bdAbsMax"]
]));

Object.assign(InputNumber, {
	min: Number.NEGATIVE_INFINITY,
	max: Number.POSITIVE_INFINITY,
	absMin: Number.NEGATIVE_INFINITY,
	absMax: Number.POSITIVE_INFINITY,
	minMsg: "value is less than typical minimum",
	maxMsg: "value is greater than typical maximum",
	absMinMsg: "value is less than absolute minimum",
	absMaxMsg: "value is greater than absolute maximum",
});