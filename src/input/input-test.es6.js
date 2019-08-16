import {e, Component, TestContainer, render, smoke, assert, assertClassNameEq, VStat} from '../../test/lib.js';
import Button from '../button/Button.js';
import Input from './Input.js';
import InputBoolean from './InputBoolean.js';
import InputNumber from './InputNumber.js';
import InputInteger from './InputInteger.js';
import InputMap from './InputMap.js';
import Meta from '../meta/Meta.js';

const action = smoke.Action.action;
const keys = action.keys;
let top = 0;

function showValueChange(value) {
    console.log('value change: ', value);
}

smoke.defTest({
    id: 'input-demo',
    before() {
        top = render(TestContainer, document.getElementById('bd-smoke-root'));
    },
    finally() {
        top.unrender();
        top = 0;
    },
    test(logger) {
        let resolve;
        const result = new Promise(_resolve => (resolve = _resolve));
        let tabIndex = 1;
        top.insChild(e(Input, {
            value: 'test value',
            placeholder: 'any text'
        }));
        top.insChild(e(InputInteger, {
            value: 0,
            placeholder: 'integers',
            absMin: -1000,
            absMax: 1000,
            min: -100,
            max: 100
        }));
        top.insChild(e(InputInteger, {
            value: 0,
            placeholder: 'integers',
            absMin: -1000,
            absMax: 1000,
            min: -100,
            max: 100,
            Meta
        }));
        top.insChild(e(InputNumber, {
            value: 0,
            placeholder: 'numbers'
        }));
        top.insChild(e(InputBoolean, {
            value: false,
            placeholder: 'boolean'
        }));
        // top.insChild(e(InputMap, {
        // 	value: 0
        // }));
        top.insChild(e(Button, {
            label: 'End Test',
            tabIndex: tabIndex++,
            handler: resolve
        }));
        top.message = 'a bunch of different kinds of input controls';
        top.prompt = 'press the end test button to end the test';
        return result;
    }
});

// let assert;
smoke.defTest({
    id: 'input',
    tests: [{
        id: 'static',
        tests: [
            ['core', function () {
                // Properties on the constructor.
                assert(Input.default === '');
                assert.typeOf(Input.errorValue, 'symbol');
                assert(Input.trim === true);
                assert.deepEqual(Input.inputAttrs, {type: 'text'});
                assert(Input.placeholder === ' enter value ');
                assert.sameMembers(Input.watchables, Component.watchables.concat(['value', 'text', 'vStat', 'placeholder']));
                assert.sameMembers(Input.events, Component.events.concat(['input']));


                // Properties and their default values of Input instances.
                let input = new Input({});
                assert(input instanceof Component);
                assert(input.default === Input.default);
                assert(input.trim === Input.trim);
                assert(input.placeholder === Input.placeholder);
                assert(input.value === '');
                assert(input.text === '');
                assert(input.vStat.level === VStat.VALID);

                // default, trim, placeholder, and value can be set by kwargs
                input = new Input({default: 'test1', trim: false, placeholder: 'test2', value: 'test3'});
                assert(input.default === 'test1');
                assert(input.trim === false);
                assert(input.placeholder === 'test2');
                assert(input.value === 'test3');
                assert(input.text === 'test3');
                assert(input.vStat.level === VStat.VALID);

                // placeholder can be set on a per-instance basis and is watchable
                let placeholderWatch = 0;
                input.watch('placeholder', value => (placeholderWatch = value));
                input.placeholder = 'test4';
                assert(input.placeholder === 'test4');
                assert(placeholderWatch === 'test4');

                // value and text are watchable
                let valueWatch = 0;
                input.watch('value', value => (valueWatch = value));
                let textWatch = 0;
                input.watch('text', value => (textWatch = value));
                input.value = 'test5';
                assert(input.value === 'test5');
                assert(input.text === 'test5');
                assert(valueWatch === 'test5');
                assert(textWatch === 'test5');
            }],
            ['render', function () {
                let input = new Input({});
                input.render();
                const root = input.bdDom.root;
                assert(root.tagName === 'DIV');

                // The className on the dop div reflects the VStat and empty status
                assert(input.value === '');
                assert(input.text === '');
                assert(input.vStat.level === VStat.VALID);
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-valid', 'empty']);
                input.value = 'test';
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-valid']);

                // The member variable bdInputNode holds the input node
                const inputNode = input.bdInputNode;
                assert(inputNode.tagName === 'INPUT');

                // Component's enabled/disabled attribute is reflected to the input node
                assert(input.enabled);
                assert(!input.disabled);
                assert(!inputNode.disabled);

                input.enabled = false;
                assert(!input.enabled);
                assert(input.disabled);
                assert(inputNode.disabled);

                input.enabled = true;
                assert(input.enabled);
                assert(!input.disabled);
                assert(!inputNode.disabled);

                input.disabled = true;
                assert(!input.enabled);
                assert(input.disabled);
                assert(inputNode.disabled);

                input.disabled = false;
                assert(input.enabled);
                assert(!input.disabled);
                assert(!inputNode.disabled);

                // The placeholder value is reflected in the placeholder div
                const placeholderNode = root.querySelector('div.placeholder');
                assert(input.placeholder === placeholderNode.innerHTML);
                input.placeholder = 'test';
                assert(placeholderNode.innerHTML === 'test');
                assert(input.placeholder === 'test');
                input.destroy();

                // the input nodes attributes can be controlled by kwargs.inputAttrs
                input = new Input({inputAttrs: {type: 'button'}});
                input.render();
                assert(input.bdInputNode.type === 'button');
                input.destroy();

                // the input nodes attributes can be set directly on an instance before rendering
                input = new Input({inputAttrs: {type: 'button'}});
                input.inputAttrs = {type: 'checkbox'};
                input.render();
                assert(input.bdInputNode.type === 'checkbox');
                input.destroy();
            }],
            ['vStat-reflect', function () {
                // Make a toy subtype to set relfecting vStat...
                class TestInput extends Input {
                    // these are useless overrides...just used to get different VStat values
                    validateValue(value) {
                        return [value, this.format(value), new VStat(value)];
                    }

                    format(value) {
                        return VStat.levels[value].id;
                    }

                    validateText(text) {
                        let result = VStat.SCALAR_ERROR;
                        VStat.levels.some((level, i) => {
                            if (level.id === text) {
                                result = i;
                                return true;
                            }
                        });
                        return this.validateValue(result);
                    }
                }

                const input = new TestInput({value: 0});
                input.render();
                const root = input.bdDom.root;
                assert(input.value === 0);
                assert(input.text === 'valid');
                assert(input.vStat.level === VStat.VALID);
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-valid']);

                input.value = VStat.CONTEXT_INFO;
                assert(input.value === VStat.CONTEXT_INFO);
                assert(input.text === VStat.levels[VStat.CONTEXT_INFO].id);
                assert(input.vStat.level === VStat.CONTEXT_INFO);
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-contextInfo']);

                input.value = VStat.SCALAR_INFO;
                assert(input.value === VStat.SCALAR_INFO);
                assert(input.text === VStat.levels[VStat.SCALAR_INFO].id);
                assert(input.vStat.level === VStat.SCALAR_INFO);
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-scalarInfo']);

                input.value = VStat.CONTEXT_WARN;
                assert(input.value === VStat.CONTEXT_WARN);
                assert(input.text === VStat.levels[VStat.CONTEXT_WARN].id);
                assert(input.vStat.level === VStat.CONTEXT_WARN);
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-contextWarn']);

                input.value = VStat.SCALAR_WARN;
                assert(input.value === VStat.SCALAR_WARN);
                assert(input.text === VStat.levels[VStat.SCALAR_WARN].id);
                assert(input.vStat.level === VStat.SCALAR_WARN);
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-scalarWarn']);


                input.value = VStat.CONTEXT_ERROR;
                assert(input.value === VStat.CONTEXT_ERROR);
                assert(input.text === VStat.levels[VStat.CONTEXT_ERROR].id);
                assert(input.vStat.level === VStat.CONTEXT_ERROR);
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-contextError']);

                input.value = VStat.SCALAR_ERROR;
                assert(input.value === VStat.SCALAR_ERROR);
                assert(input.text === VStat.levels[VStat.SCALAR_ERROR].id);
                assert(input.vStat.level === VStat.SCALAR_ERROR);
                assert.sameMembers(root.className.split(' '), ['bd-input', 'bd-vStat-scalarError']);
            }],
            ['validation', function () {
                // per-instance validateValue, validateText and format methods; these usually must be defined together
                function validateValue(value) {
                    if (!value) {
                        return [null, '', VStat.valid()];
                    }
                    const month = Number(value);
                    if (Number.isNaN(month) && typeof value === 'string') {
                        value = value.trim();
                        let month = false;
                        [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^aug/i, /^s/i, /^o/i, /^n/i, /^d/i].some((r, i) => {
                            if (r.test(value)) {
                                return (month = i + 1);
                            }
                        });
                        if (month) {
                            return [month, this.format(month), VStat.valid()];
                        } else {
                            return [Input.errorValue, this.format(value), VStat.scalarError()];
                        }
                    } else if (month >= 1 && month <= 12) {
                        return [month, this.format(month), VStat.valid()];
                    } else {
                        return [Input.errorValue, this.format(value), VStat.scalarError()];
                    }
                }

                function format(value) {
                    if (!value) {
                        return '';
                    } else if ( 1 <= value&& value <= 12) {
                        return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'Novemeber', 'December'][value - 1];
                    } else {
                        return `${value}`;
                    }
                }

                function validateText(text) {
                    return this.validateValue(text);
                }

                let input = new Input({validateValue, format, validateText});
                assert(input.value === null);
                assert(input.text === '');
                input.value = 1;
                assert(input.value === 1);
                assert(input.text === 'January');
                input.value = 2;
                assert(input.value === 2);
                assert(input.text === 'February');

                input.text = '1';
                assert(input.value === 1);
                assert(input.text === 'January');
                input.text = '2';
                assert(input.value === 2);
                assert(input.text === 'February');
                input.text = 'Jan';
                assert(input.value === 1);
                assert(input.text === 'January');
                input.text = 'Feb';
                assert(input.value === 2);
                assert(input.text === 'February');
                input.text = 'Jauari--misspelled';
                assert(input.value === 1);
                assert(input.text === 'January');

                // It's usually better to derive a subclass
                class MonthInput extends Input {
                    validateValue(value) {
                        if (!value) {
                            return [null, '', VStat.valid()];
                        }
                        const month = Number(value);
                        if (Number.isNaN(month) && typeof value === 'string') {
                            value = value.trim();
                            let month = false;
                            [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^aug/i, /^s/i, /^o/i, /^n/i, /^d/i].some((r, i) => {
                                if (r.test(value)) {
                                    return (month = i + 1);
                                }
                            });
                            if (month) {
                                return [month, this.format(month), VStat.valid()];
                            } else {
                                return [Input.errorValue, this.format(value), VStat.scalarError()];
                            }
                        } else if (month >= 1 && month <= 12) {
                            return [month, this.format(month), VStat.valid()];
                        } else {
                            return [Input.errorValue, this.format(value), VStat.scalarError()];
                        }
                    }

                    format(value) {
                        if (!value) {
                            return '';
                        } else if (value >= 1 && value <= 12) {
                            return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'Novemeber', 'December'][value - 1];
                        } else {
                            return `${value}`;
                        }
                    }

                    validateText(text) {
                        return this.validateValue(text);
                    }
                }
                input = new MonthInput({});
                assert(input.value === null);
                assert(input.text === '');
                input.value = 1;
                assert(input.value === 1);
                assert(input.text === 'January');
                input.value = 2;
                assert(input.value === 2);
                assert(input.text === 'February');

                input.text = '1';
                assert(input.value === 1);
                assert(input.text === 'January');
                input.text = '2';
                assert(input.value === 2);
                assert(input.text === 'February');
                input.text = 'Jan';
                assert(input.value === 1);
                assert(input.text === 'January');
                input.text = 'Feb';
                assert(input.value === 2);
                assert(input.text === 'February');
                input.text = 'Jauari--misspelled';
                assert(input.value === 1);
                assert(input.text === 'January');
            }],
            ['input-integer-demo', function () {
                // An Integer input that might collect an adult's age.
                const input = new InputInteger({min: 18, max: 85, absMin: 0, absMax: 125});

                // Since no value was given, it starts out as invalid.
                assert(input.value === InputInteger.errorValue);
                assert(input.text === '?');
                assert(input.vStat.level === VStat.SCALAR_ERROR);

                // The value of an InputInteger can be set through either the value or text properties...
                ['value', 'text'].forEach(p => {
                    // gibberish is not an age
                    input[p] = 'asdfnaske';
                    assert(input.value === InputInteger.errorValue);
                    assert(input.text === '?');
                    assert(input.vStat.level === VStat.SCALAR_ERROR);

                    // clearing the value is also not an age
                    input[p] = '';
                    assert(input.value === InputInteger.errorValue);
                    assert(input.text === '?');
                    assert(input.vStat.level === VStat.SCALAR_ERROR);

                    // A human absolutely cannot have a negative age.
                    input[p] = -1;
                    assert(input.value === InputInteger.errorValue);
                    assert(input.text === '-1');
                    assert(input.vStat.level === VStat.SCALAR_ERROR);
                    assert(input.vStat.message === 'value is less than absolute minimum');

                    // Nor greater than 125
                    input[p] = 126;
                    assert(input.value === InputInteger.errorValue);
                    assert(input.text === '126');
                    assert(input.vStat.level === VStat.SCALAR_ERROR);
                    assert(input.vStat.message === 'value is greater than absolute maximum');

                    // While 10 is a completely normal age, a ten-year-old is typically not an adult.
                    input[p] = 10;
                    assert(input.value === 10);
                    assert(input.text === '10');
                    assert(input.vStat.level === VStat.SCALAR_WARN);
                    assert(input.vStat.message === 'value is less than typical minimum');

                    // c2018, 90 is also an unusal age for most cohorts of humans.
                    input[p] = 90;
                    assert(input.value === 90);
                    assert(input.text === '90');
                    assert(input.vStat.level === VStat.SCALAR_WARN);
                    assert(input.vStat.message === 'value is greater than typical maximum');

                    // But 45 is just right!
                    input[p] = 45;
                    assert(input.value === 45);
                    assert(input.text === '45');
                    assert(input.vStat.level === VStat.VALID);
                });
            }],
            ['input-integer-core', function () {
                const input = new InputInteger({});
                assert(input.value === InputInteger.errorValue);
                assert(input.text === '?');
                assert(input.vStat.level === VStat.SCALAR_ERROR);

                input.value = 0;
                assert(input.value === 0);
                assert(input.text === '0');
                assert(input.vStat.level === VStat.VALID);

                input.value = Number.NEGATIVE_INFINITY;
                assert(input.value === Number.NEGATIVE_INFINITY);
                assert(input.vStat.level === VStat.VALID);

                input.value = Number.POSITIVE_INFINITY;
                assert(input.value === Number.POSITIVE_INFINITY);
                assert(input.vStat.level === VStat.VALID);


                input.value = Number.MAX_SAFE_INTEGER;
                assert(input.text === `${Number.MAX_SAFE_INTEGER}`);
                assert(input.value === Number.MAX_SAFE_INTEGER);
                assert(input.vStat.level === VStat.VALID);

                input.value = Number.MIN_SAFE_INTEGER;
                assert(input.text === `${Number.MIN_SAFE_INTEGER}`);
                assert(input.value === Number.MIN_SAFE_INTEGER);
                assert(input.vStat.level === VStat.VALID);
            }],
            ['input-float', function () {

            }],
            ['input-map', function () {

            }]
        ]
    }, {
        id: 'dynamic',
        test() {
            // TODO
            assert(true);
        }

    }]
});
