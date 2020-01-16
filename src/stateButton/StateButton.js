import {e, stopEvent} from '../lib.js';
import Button from '../button/Button.js';

class States {
    constructor(owner, states, value) {
        this.owner = owner;
        this.reset(states, value);
    }

    reset(states, value) {
        this.currentState && this.owner.removeClassName(this.className);
        this.states = states;
        const index = this.findIndex(value);
        this.currentState = states[index !== -1 ? index : 0];
        this.owner.addClassName(this.className);
    }

    get state() {
        return this.currentState;
    }

    set value(value) {
        const index = this.findIndex(value);
        if (index === -1) {
            // eslint-disable-next-line no-console
            console.error('unexpected, but ignored');
        } else {
            this.owner.removeClassName(this.className);
            this.currentState = this.states[index];
            this.owner.addClassName(this.className);
        }
    }

    get value() {
        return this.currentState.value;
    }

    get className() {
        return this.currentState.className;
    }

    get label() {
        return this.currentState.label;
    }

    get mark() {
        return this.currentState.mark;
    }

    findIndex(value) {
        return this.states.findIndex(state => state.value === value);
    }

    exists(value) {
        return this.findIndex(value) !== -1;
    }

    nextValue() {
        return this.states[(this.findIndex(this.value) + 1) % this.states.length].value;
    }
}

const DEFAULT_2_STATE_VALUES = [false, true];
const DEFAULT_3_STATE_VALUES = [null, true, false];

function valuesToStates(values) {
    return values.map(value => ({value, mark: `${value}`}));
}

export default class StateButton extends Button {
    constructor(kwargs) {
        // note that we keep the handler feature, but watching "value" is likely much more useful
        super(kwargs);

        const states = kwargs.states || valuesToStates(kwargs.values);
        if (!Array.isArray(states)) {
            throw new Error('illegal states');
        }
        Object.defineProperties(this, {
            bdStates: {
                value: new States(this, this.bdConditionStates(states), kwargs.value)
            }
        });
    }

    get value() {
        return this.bdStates.value;
    }

    set value(value) {
        if (!this.bdStates.exists(value)) {
            // eslint-disable-next-line no-console
            console.warn('illegal value provided; ignored');
        } else {
            const oldValue = this.value;
            if (value !== oldValue) {
                const oldState = this.bdStates.state;
                this.bdStates.value = value;
                this.bdMutateNotify('value', value, oldValue);
                this.bdMutateNotify('state', this.bdStates.state, oldState);
            }
        }
    }

    get states() {
        // deep copy
        return this.bdStates.states.map(state => ({ ...state}));
    }

    get state() {
        // deep copy
        return { ...this.bdStates.state};
    }

    reset(states, value) {
        if (!Array.isArray(states)) {
            throw new Error('illegal states');
        } else {
            this.bdStates.reset(this.bdConditionStates(states), value);
            this.bdMutateNotify('value', this.value, undefined);
            this.bdMutateNotify('state', this.value, undefined);
        }
    }

    // protected API...

    bdElements() {
        const labelText = state => {
            const label = state.label;
            return label !== undefined ? (label || '') : (this.label !== undefined ? this.label : '');
        };

        const markText = state => {
            const mark = state.mark;
            return mark !== undefined ? (mark || '') : '';
        };

        return e.div({tabIndex: -1, bdAdvise: {click: this.bdOnClick.bind(this)}},
            e.div({bdReflect: ['state', labelText]}),
            e.div({bdReflect: ['state', markText]}));
    }

    // private API...

    bdConditionStates(value) {
        return value.map((state, i) => {
            const result = {
                value: 'value' in state ? state.value : i,
                className: 'className' in state ? state.className : `state-${i}`,
                mark: state.mark || '',
            };
            if ('label' in state) {
                result.label = state.label;
            }
            return result;
        });
    }

    bdOnClick(event) {
        // override Button's Button.bdOnClick
        stopEvent(event);
        if (this.enabled) {
            this.value = this.bdStates.nextValue();
            this.handler && this.handler();
            this.bdNotify({name: 'click', event});
        }
    }
}
Object.assign(StateButton, {
    className: 'bd-state-button',
    watchables: ['value', 'state'].concat(Button.watchables),
    events: ['value', 'state'].concat(Button.events)
});

function valuesToStatesNoMark(values) {
    return values.map(value => ({value}));
}

function getStates(_states, nullable, nullMark, falseMark, trueMark) {
    function setDefaults(dest, className, mark) {
        if (!('className' in dest)) {
            dest.className = className;
        }
        if (!('mark' in dest)) {
            dest.mark = mark;
        }
    }

    let states;
    if (_states) {
        if ((nullable && _states.length !== 3) || (!nullable && _states.length !== 2)) {
            throw new Error('illegal states');
        } else {
            // valid states provided...
            states = _states;
        }
    } else {
        states = valuesToStatesNoMark(nullable ? DEFAULT_3_STATE_VALUES : DEFAULT_2_STATE_VALUES);
    }

    let i = 0;
    if (nullable) {
        setDefaults(states[i++], 'state-null', nullMark);
    }
    setDefaults(states[i++], 'state-false', falseMark);
    setDefaults(states[i++], 'state-true', trueMark);
    return states;
}

StateButton.Checkbox = class CheckBox extends StateButton {
    constructor(kwargs) {
        super({
            ...kwargs,
            states: getStates(
                kwargs.values ? valuesToStatesNoMark(kwargs.values) : kwargs.states,
                kwargs.nullable,
                '?', ' ', 'X'
            )
        });
        this.addClassName('checkbox');
    }
};


StateButton.RadioButton = class RadioButton extends StateButton {
    constructor(kwargs) {
        super({
            ...kwargs,
            states: getStates(
                kwargs.values ? valuesToStatesNoMark(kwargs.values) : kwargs.states,
                kwargs.nullable,
                '\u{e912}', '\u{e912}', '\u{e911}'
            )
        });
        this.addClassName('radio-button');
    }
};
