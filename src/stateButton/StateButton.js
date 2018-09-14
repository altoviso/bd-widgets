import {Component, e, stopEvent} from "../lib.js";
import Button from "../button/Button.js";

class States {
	constructor(owner, states, value){
		this.owner = owner;
		this.reset(states, value);
	}

	reset(states, value){
		this.currentState && this.owner.removeClassName(this.className);
		this.states = states;
		let index = this.findIndex(value);
		this.currentState = states[index !== -1 ? index : 0];
		this.owner.addClassName(this.className);
	}

	get state(){
		return this.currentState;
	}

	set value(value){
		let index = this.findIndex(value);
		if(index === -1){
			// eslint-disable-next-line no-console
			console.error("unexpected, but ignored");
		}else{
			this.owner.removeClassName(this.className);
			this.currentState = this.states[index];
			this.owner.addClassName(this.className);
		}
	}

	get value(){
		return this.currentState.value;
	}

	get className(){
		return this.currentState.className;
	}

	get label(){
		return this.currentState.label;
	}

	get mark(){
		return this.currentState.mark;
	}

	findIndex(value){
		return this.states.findIndex((state) => state.value === value);
	}

	exists(value){
		return this.findIndex(value) !== -1;
	}

	nextValue(){
		return this.states[(this.findIndex(this.value) + 1) % this.states.length].value;
	}
}

let ns = Button.getNamespace();
const pStates = ns.get("pStates");
const pConditionStates = ns.get("pConditionStates");

const DEFAULT_2_STATE_VALUES = [false, true];
const DEFAULT_3_STATE_VALUES = [null, true, false];

function valuesToStates(values){
	return values.map(value => ({value: value, mark: value + ""}));
}

export default class StateButton extends Button {
	constructor(kwargs){
		// note that we keep the handler feature, but watching "value" is likely much more useful
		super(kwargs);

		let states = kwargs.states || valuesToStates(kwargs.values);
		if(!Array.isArray(states)){
			throw new Error("illegal states");
		}
		Object.defineProperties(this, {
			[pStates]: {
				value: new States(this, this[pConditionStates](states), kwargs.value)
			}
		});
	}

	get value(){
		return this[pStates].value;
	}

	set value(value){
		if(!this[pStates].exists(value)){
			// eslint-disable-next-line no-console
			console.warn("illegal value provided; ignored");
		}else{
			let oldValue = this.value;
			if(value !== oldValue){
				let oldState = this[pStates].state;
				this[pStates].value = value;
				this.bdMutateNotify("value", oldValue, value);
				this.bdMutateNotify("state", oldState, this[pStates].state);
			}
		}
	}

	get states(){
		// deep copy
		return this[pStates].states.map(state => Object.assign({}, state));
	}

	get state(){
		// deep copy
		return Object.assign({}, this[pStates].state);
	}

	reset(states, value){
		if(!Array.isArray(states)){
			throw new Error("illegal states");
		}else{
			this[pStates].reset(this[pConditionStates](states), value);
			this.bdMutateNotify("value", undefined, this.value);
			this.bdMutateNotify("state", undefined, this.value);
		}
	}

	// protected API...

	bdElements(){
		let labelText = (state) => {
			let label = state.label;
			return label !== undefined ? (label ? label : "") : (this[Button.pLabel] !== undefined ? this[Button.pLabel] : "");
		};

		let markText = (state) => {
			let mark = state.mark;
			return mark !== undefined ? (mark ? mark : "") : "";
		};

		return e("div", {tabIndex: -1, bdAdvise: {click: this[Button.pOnClick].bind(this)}},
			e("div",
				e("div", {bdReflect: ["state", labelText]}),
				e("div", {bdReflect: ["state", markText]})
			)
		);
	}

	// private API...

	[pConditionStates](value){
		return value.map((state, i) => {
			let result = {
				value: "value" in state ? state.value : i,
				className: "className" in state ? state.className : "state-" + i,
				mark: state.mark || "",
			};
			if("label" in state){
				result.label = state.label;
			}
			return result;
		});
	}

	[Button.pOnClick](e){
		// override Button's [Button.pOnClick]
		stopEvent(e);
		if(this.enabled){
			this.value = this[pStates].nextValue();
			this.handler && this.handler();
			this.bdNotify({name: "click", e: e});
		}
	}
}
ns.publish(StateButton, {
	className: "bd-state-button",
	watchables: ["value", "state"].concat(Button.watchables),
});

function valuesToStatesNoMark(values){
	return values.map(value => ({value: value}));
}

function getStates(_states, nullable, nullMark, falseMark, trueMark){
	function setDefaults(dest, className, mark){
		if(!("className" in dest)){
			dest.className = className;
		}
		if(!("mark" in dest)){
			dest.mark = mark;
		}
	}

	let states;
	if(_states){
		if((nullable && _states.length !== 3) || (!nullable && _states.length !== 2)){
			throw new Error("illegal states");
		}else{
			// valid states provided...
			states = _states;
		}
	}else{
		states = valuesToStatesNoMark(nullable ? DEFAULT_3_STATE_VALUES : DEFAULT_2_STATE_VALUES);
	}

	let i = 0;
	if(nullable){
		setDefaults(states[i++], "state-null", nullMark);
	}
	setDefaults(states[i++], "state-false", falseMark);
	setDefaults(states[i++], "state-true", trueMark);
	return states;
}

StateButton.Checkbox = class CheckBox extends StateButton {
	constructor(kwargs){
		super(Object.assign({}, kwargs, {
			states: getStates(
				kwargs.values ? valuesToStatesNoMark(kwargs.values) : kwargs.states,
				kwargs.nullable,
				"?", " ", "X"
			)
		}));
		this.addClassName("checkbox");
	}
};


StateButton.RadioButton = class RadioButton extends StateButton {
	constructor(kwargs){
		super(Object.assign({}, kwargs, {
			states: getStates(
				kwargs.values ? valuesToStatesNoMark(kwargs.values) : kwargs.states,
				kwargs.nullable,
				"\u{e912}", "\u{e912}", "\u{e911}"
			)
		}));
		this.addClassName("radio-button");
	}
};



