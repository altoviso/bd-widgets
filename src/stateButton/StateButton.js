import {Component, e, stopEvent} from "../lib.js";
import Button from "../button/Button.js"

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
			console.error("unexpected");
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

const ppStates = Symbol("StateButton-states");
const pmConditionStates = Symbol("StateButton-condition-states");
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
			console.error("illegal states");
			states = valuesToStates(DEFAULT_2_STATE_VALUES);
		}
		Object.defineProperties(this, {
			[ppStates]: {
				value: new States(this, this[pmConditionStates](states), kwargs.value)
			}
		});
	}

	get value(){
		return this[ppStates].value;
	}

	set value(value){
		if(!this[ppStates].exists(value)){
			console.ward("illegal value provided; ignored");
		}else{
			let oldValue = this.value;
			if(value !== oldValue){
				let oldState = this[ppStates].state;
				this[ppStates].value = value;
				this._applyWatchersRaw("value", oldValue, value);
				this._applyWatchersRaw("state", oldState, this[ppStates].state);
			}
		}
	}

	get states(){
		// deep copy
		return this[ppStates].states.map(state => Object.assign({}, state));
	}

	get state(){
		// deep copy
		return Object.assign({}, this[ppStates].state);
	}

	reset(states, value){
		if(!Array.isArray(states)){
			console.error("illegal states");
		}else{
			this[ppStates].reset(this[pmConditionStates](states), value);
			this._applyWatchersRaw("value", undefined, this.value);
			this._applyWatchersRaw("state", undefined, this.value);
		}
	}

	// protected API...

	_elements(){
		let labelText = (state) =>{
			let label = state.label;
			return label !== undefined ? (label ? label : "") : (this[Button.ppLabel] !== undefined ? this[Button.ppLabel] : "");
		};

		let markText = (state) =>{
			let mark = state.mark;
			return mark !== undefined ? (mark ? mark : "") : "";
		};

		return e("div", {[e.tabIndexNode]: true, [e.advise]: {click: this[Button.ppOnClick].bind(this)}},
			e("div",
				e("div", {[e.reflect]: ["state", labelText]}),
				e("div", {[e.reflect]: ["state", markText]})
			)
		)
	}

	// private API...

	[pmConditionStates](value){
		return value.map((state, i) =>{
			let result = {
				value: "value" in state ? state.value : i,
				className: "className" in state ? state.className : "state-" + i,
				mark: state.mark || "",
			};
			if("label" in state){
				result.label = state.label;
			}
			return result;
		})
	}

	[Button.ppOnClick](e){
		// override Button's [Button.ppOnClick]
		stopEvent(e);
		if(this[Component.ppEnabled]){
			this.value = this[ppStates].nextValue();
			this.handler && this.handler();
			this._applyHandlers({name: "click", e: e});
		}
	}
}

StateButton.className = "bd-state-button";

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
			console.error("illegal states provided");
			states = valuesToStatesNoMark(nullable ? DEFAULT_3_STATE_VALUES : DEFAULT_2_STATE_VALUES);
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
	return states
}

StateButton.Checkbox = class CheckBox extends StateButton {
	constructor(kwargs){
		kwargs.states = getStates(
			kwargs.values ? valuesToStatesNoMark(kwargs.values) : kwargs.states,
			kwargs.nullable,
			"?", " ", "X"
		);
		super(kwargs);
		this.addClassName("checkbox");
	}
};


StateButton.RadioButton = class RadioButton extends StateButton {
	constructor(kwargs){
		kwargs.states = getStates(
			kwargs.values ? valuesToStatesNoMark(kwargs.values) : kwargs.states,
			kwargs.nullable,
			"\u{e912}", "\u{e912}", "\u{e911}"
		);
		super(kwargs);
		this.addClassName("radio-button");
	}
};

Object.assign(StateButton, {
	ppStates: ppStates,
	pmConditionStates: pmConditionStates
});

