import {Component, e} from '../src/lib.js';

const smoke = typeof window !== 'undefined' ? window.smoke : require('bd-smoke');

const assert = smoke.assert;

function delay(ms, resolve, value) {
    ms ? setTimeout(() => resolve(value), ms) : resolve(ms);
}

function assertClassNameEq(_lhs, _rhs) {
    const lhs = _lhs.trim().split(' ').sort();
    const rhs = _rhs.trim().split(' ').sort();
    if (lhs.length !== rhs.length || lhs.some((item, i) => (rhs[i] !== item))) {
        assert(false, `"${_lhs}" !== "${_rhs}"`);
    }
}

class TestContainer extends Component {
    constructor(kwargs) {
        super({ id: 'test-container', ...kwargs });
        this._message = '';
        this._prompt = '';
        this.log = [];
        this._throttle = 0;
    }

    get message() {
        return this._message;
    }

    set message(value) {
        this.bdMutate('message', '_message', value);
        this.log.push(['message', value]);
    }

    get prompt() {
        return this._prompt;
    }

    set prompt(value) {
        this.bdMutate('prompt', '_prompt', value);
        this.log.push(['prompt', value]);
    }

    start(test) {
        this.test = test;
        this.log = [];
        this.log.push(['log', `starting test:${test.testName()}`]);
        return this.log;
    }

    throttle(ms) {
        this._throttle = ms;
    }

    finish(dump) {
        if (dump) {
            console.log(this.log.map(entry => smoke.stringify(entry)).join(',\n'));
        }
        while (this.children.length) {
            this.delChild(this.children[0]);
        }
        this.message = 'test done';
        this.prompt = 'nothing to do';
    }

    checkLog(expected) {
        assert(!this.log.some((entry, i) => {
            const expectedEntry = expected[i];
            if (entry.some((item, j) => {
                if (smoke.stringify(item) !== smoke.stringify(expectedEntry[j])) {
                    this.test.logger.logNote(`unexpected log entry (${i}, ${j}),[${item}][${expectedEntry[j]}]`);
                    return true;
                }
                return false;
            })) {
                console.log(entry);
                console.log(expectedEntry);
                return true;
            } else {
                return false;
            }
        }));
    }

    monitor(component) {
        component.constructor.watchables.forEach(prop => component.watch(prop, (newValue, oldValue, owner) => {
            assert(owner === component);
            // console.log('watch', prop, newValue, oldValue);
            if (prop !== 'parent') {
                this.log.push(['watch', prop, newValue, oldValue]);
            }
        }));
        component.constructor.events.forEach(eventName => component.advise(eventName, event => {
            // console.log('event', eventName, event);
            if (event instanceof Event) {
                this.log.push(['native event', eventName, { type: event.type }]);
            } else if (event.nativeEvent instanceof Event) {
                this.log.push(['native event', eventName, { type: event.nativeEvent.type }]);
            } else {
                this.log.push(['event', eventName, event]);
            }
        }));
    }

    waitForValue(component, prop, value, actions) {
        if (typeof actions === 'string') {
            this.prompt = actions;
        } else if (actions) {
            actions.prompt && (this.prompt = actions.prompt);
            smoke.queueActions(actions);
        }
        return new Promise(resolve => {
            const h = component.watch(prop, newValue => {
                if (typeof value === 'function' ? value(newValue) : newValue === value) {
                    h.destroy();
                    delay(this._throttle, resolve);
                }
            });
        });
    }

    waitForEvent(component, eventName, actions) {
        if (typeof actions === 'string') {
            this.prompt = actions;
        } else if (actions) {
            actions.prompt && (this.prompt = actions.prompt);
            smoke.queueActions(actions);
        }
        return new Promise(resolve => {
            const h = component.advise(eventName, () => {
                h.destroy();
                delay(this._throttle, resolve);
            });
        });
    }

    bdElements() {
        const style = { margin: '1em', border: '1px solid black', padding: '1em' };
        return e('div', { className: 'top' },
            e('div', { className: 'widget-container', bdChildrenAttachPoint: true, style }),
            e('div', { style: { margin: '1em' } },
                e('h3', 'Should Now Observe'),
                e('div', { bdReflect: 'message' }),
                e('h4', 'Take these actions next...'),
                e('div', { bdReflect: 'prompt' }),));
    }
}

export {TestContainer, smoke, assert, assertClassNameEq};
export * from '../src/lib.js';
