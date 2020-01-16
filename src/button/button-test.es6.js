import {e, TestContainer, render, smoke, assert, assertClassNameEq} from '../../test/lib.js';
import log1 from './button-test-log-01.js';
import Button from './Button.js';

const action = smoke.Action.action;
const keys = action.keys;
let top;

smoke.defTest({
    id: 'button-demo',
    before() {
        top = render(TestContainer, document.getElementById('bd-smoke-root'));
    },
    finally() {
        top.unrender();
        top = undefined;
    },
    test() {
        let resolve;
        const result = new Promise(_resolve => (resolve = _resolve));
        let tabIndex = 1;
        top.insChild(e(Button, {
            label: 'Ticklish',
            className: 'tickle',
            tabIndex: tabIndex++,
            handler: () => console.log('clicked Ticklish button')
        }));
        top.insChild(e(Button, {
            label: 'Disabled',
            enabled: false,
            tabIndex: tabIndex++,
            handler: () => console.log('clicked Disabled button')
        }));
        top.insChild(e(Button, {
            className: 'icon-',
            label: '\u{e904}',
            tabIndex: tabIndex++,
            handler: () => console.log('clicked save button')
        }));
        top.insChild(e(Button, {
            label: 'End Test',
            tabIndex: tabIndex++,
            handler: resolve
        }));
        top.message = 'a ticklish, disabled, and icon button, and a button to end the test';
        top.prompt = 'press the end test button to end the test';
        return result;
    }
});

smoke.defBrowserTest({
    id: 'button',
    before() {
        top = render(TestContainer, document.getElementById('bd-smoke-root'));
    },
    beforeEach() {
        while (top.children && top.children.length) {
            top.delChild(top.children.pop());
        }
    },
    finally() {
        top.unrender();
        top = 0;
    },
    tests: [{
        id: 'static',
        tests: [
            ['basic', () => {
                // default constructor...
                let button = new Button({});
                assert(button.rendered === false);
                assert(!button.parent);
                assert(button.className === '');
                assert(!button.hasFocus);
                assert(button.tabIndex === undefined);
                assert(button.enabled);
                assert(button.visible);
                assert(!button.title);
                assert(button.label === '');
                assert(!button.handler);
                button.label = 'test';
                assert(button.label === 'test');
                button.label = 'test2';
                assert(button.label === 'test2');
                button.label = '';
                assert(button.label === '');

                let clickHandlerEventObject;

                function clickHandler(event) {
                    clickHandlerEventObject = event;
                }

                button.advise('click', clickHandler);

                let handlerResult;

                function h1() {
                    handlerResult = 'h1';
                }

                function h2() {
                    handlerResult = 'h2';
                }

                // check OK to click without a handler
                button.bdOnClick('click-test-1');
                assert(clickHandlerEventObject.nativeEvent === 'click-test-1');

                button.handler = h1;
                button.bdOnClick('click-test-2');
                assert(clickHandlerEventObject.nativeEvent === 'click-test-2');
                assert(handlerResult === 'h1');

                button.handler = h2;
                button.bdOnClick();
                assert(handlerResult === 'h2');

                // check OK to delete the handler once set
                button.handler = 0;
                button.bdOnClick();
                button.bdOnClick('click-test-3');
                assert(clickHandlerEventObject.nativeEvent === 'click-test-3');

                button.destroy();

                // exercise every option in the constructor...
                button = new Button({
                    label: 'test3',
                    handler: h1,
                    id: 'test4',
                    staticClassName: 'test5',
                    className: 'test6',
                    tabIndex: 7,
                    title: 'test8',
                    enabled: true,
                    postRender: 'test9'
                });
                assert(button.label === 'test3');
                assert(button.handler === h1);
                assert(button.id === 'test4');
                assert(button.staticClassName === 'test5');
                assert(button.className === 'test6');
                assert(button.tabIndex === 7);
                assert(button.title === 'test8');
                assert(button.enabled);
                assert(button.postRender === 'test9');

                button.destroy();
            }],
            ['render', () => {
                let button = new Button({});
                button.render();
                let root = button._dom.root;
                let label = button._dom.root.firstChild;

                // structure
                assert(root.tagName === 'DIV');
                assert(root.children.length === 1);
                assert(label.tagName === 'DIV');

                // component stuff
                assert(root.title === '');

                // label
                assert(label.innerHTML === '');
                button.label = 'test1';
                assert(label.innerHTML === 'test1');
                button.label = 'test2';
                assert(label.innerHTML === 'test2');
                button.label = '';
                assert(label.innerHTML === '');

                // root className
                assertClassNameEq(root.className, 'bd-button');
                button.addClassName('test');
                assertClassNameEq(root.className, 'bd-button test');
                button.removeClassName('test');
                assertClassNameEq(root.className, 'bd-button');

                // tabIndex
                assert(label.tabIndex === 0);
                button.tabIndex = 2;
                assert(label.tabIndex === 2);
                button.tabIndex = 3;
                assert(label.tabIndex === 3);

                button.destroy();

                // again with ctor args
                button = new Button({
                    label: 'test3',
                    id: 'test4',
                    staticClassName: 'test5',
                    className: 'test6',
                    tabIndex: 7,
                    title: 'test8',
                    enabled: true
                });
                button.render();
                root = button._dom.root;
                label = button._dom.root.firstChild;

                // structure
                assert(root.tagName === 'DIV');
                assert(root.children.length === 1);
                assert(label.tagName === 'DIV');

                // component stuff
                assert(root.title === 'test8');

                // label
                assert(label.innerHTML === 'test3');

                // root className
                assertClassNameEq(root.className, 'test5 bd-button test6');
                button.addClassName('test');
                assertClassNameEq(root.className, 'test5 bd-button test6 test');
                button.removeClassName('test');
                assertClassNameEq(root.className, 'test5 bd-button test6');

                // tabIndex
                assert(label.tabIndex === 7);

                button.destroy();
            }]
        ]
    }, {
        id: 'dynamic',
        async test() {
            top.start(this);

            const id = 'button-test-1';
            const button = new Button({id, label: '2', tabIndex: 2});
            top.monitor(button);

            top.message = 'rendering';
            top.insChild(Button, {label: '1', tabIndex: 1});
            const child = top.insChild(button);
            top.insChild(Button, {label: '3', tabIndex: 3});
            assert(child === button);
            assert(button.rendered);
            assert(button.attachedToDoc);

            top.message = 'three buttons should be displayed; this test exercises the CENTER button';
            let a = action(
                'click CENTER button',
                action.click, id
            );
            await top.waitForEvent(button, 'click', a);

            top.message = 'the CENTER button has the focus';
            assert(button.hasFocus);

            a = action(
                'press tab',
                action.sendKeys, keys.tab
            );
            await top.waitForValue(button, 'hasFocus', false, a);

            top.message = 'the CENTER button lost the focus';
            a = action(
                'press shift-tab',
                action.keyDown, keys.shift,
                action.keyDown, keys.tab,
                action.keyUp, keys.tab,
                action.keyUp, keys.shift,
            );
            await top.waitForValue(button, 'hasFocus', true, a);

            top.message = 'the CENTER button re-acquired the focus';
            a = action(
                'press spacebar',
                action.sendKeys, ' '
            );
            await top.waitForEvent(button, 'click', a);

            a = action(
                'click the CENTER button',
                action.click, id
            );
            await top.waitForEvent(button, 'click', a);

            top.message = 'destroying button';
            top.delChild(child);
            top.checkLog(log1[this.testName()]);
            top.finish();
            assert(button.destroyed);
        }
    }]
});
