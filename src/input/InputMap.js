import Input from './Input.js';
import {VStat} from '../lib.js';

export default class InputMap extends Input {
    constructor(kwargs) {
        super(kwargs);
        if (!kwargs.valueMap && !this.constructor.valueMap) {
            throw new Error('A valueMap must be provided to InputMap');
        }
        if (!kwargs.textMap && !this.constructor.textMap) {
            throw new Error('A textMap must be provided to InputMap');
        }
    }

    // read-only
    get valueMap() {
        return this.kwargs.valueMap || this.constructor.valueMap;
    }

    get textMap() {
        return this.kwargs.textMap || this.constructor.textMap;
    }

    validateValue(_value) {
        const valueMap = this.valueMap;
        if (valueMap.has(_value)) {
            const value = valueMap.get(_value);
            return [value, this.format(value), VStat.valid()];
        } else {
            return [_value, `${_value}`, VStat.scalarError()];
        }
    }

    validateText(_text) {
        _text = _text.trim();
        const textMap = this.textMap;
        if (textMap.has(_text)) {
            const value = textMap.get(_text);
            return [value, this.format(value), VStat.valid()];
        } else {
            return [undefined, _text, VStat.scalarError()];
        }
    }

    format(value) {
        return (this.formatter || this.kwargs.formatter || this.constructor.formatter)(value);
    }
}

InputMap.formatter = value => value === null || value === undefined ? '' : `${value}`;
