import {e, TestContainer, render, smoke, assert} from '../../test/lib.js';
import ListBox from './ListBox.js';
import Button from '../button/Button.js';
import {setStyle} from '../lib.js';

const action = smoke.Action.action;
const keys = action.keys;
let top = 0;


smoke.defBrowserTest({
    id: 'listBox-demo',
    before() {
        top = render(TestContainer, document.getElementById('bd-smoke-root'));
    },
    finally() {
        top.unrender();
        top = 0;
    },
    test() {
        let resolve;
        const result = new Promise(_resolve => (resolve = _resolve));
        top.insChild(e(Button, {label: 'Focusable-1'}));

        // a list...
        function getStaticList() {
            const list = [];
            for (let i = 0; i < 20; i++) {
                list.push(`choice-${i}`);
            }
            return list;
        }

        function getDynaList() {
            const list = [];
            for (let i = 100; i < 110; i++) {
                list.push(`${i}`);
            }

            function get(direction) {
                const newItems = [];
                if (direction === 'before') {
                    const start = Number(list[0]);
                    for (let i = start - 5; i < start; i++) {
                        newItems.push(`${i}`);
                    }
                    list.splice(0, 0, ...newItems);
                } else {
                    const start = Number(list[list.length - 1]);
                    for (let i = start + 1; i <= start + 5; i++) newItems.push(`${i}`);
                    list.splice(list.length, 0, ...newItems);
                }
                return new Promise(resolve => {
                    setTimeout(() => resolve(newItems), 2000);
                });
            }

            return {list, get};
        }


        // static list, free height
        window.z1 = top.insChild(e(ListBox, {
            list: []
        }));

        // static list, free height
        window.z1 = top.insChild(e(ListBox, {
            list: getStaticList()
        }));

        // static list, a fixed height, therefore requiring scrolling
        window.z2 = top.insChild(e(ListBox, {
            list: getStaticList()
        }));
        window.z2.setStyle('height', '14em');

        // dynamic list, free height
        window.z3 = top.insChild(e(ListBox, getDynaList()));

        // dynamic list, a fixed height, therefore requiring scrolling
        window.z4 = top.insChild(e(ListBox, getDynaList()));
        window.z4.setStyle('height', '14em');

        top.insChild(e(Button, {label: 'Focusable-2'}));
        top.insChild(e(Button, {label: 'End Test', handler: resolve}));
        top.message = 'TODO';
        top.prompt = 'press the end test button to end the test';
        return result;
    }
});

smoke.defBrowserTest({
    id: 'listBox',
    tests: [{
        id: 'static',
        tests: [
            ['core', function () {

            }],
            ['whatever', function () {

            }]
        ]
    }, {
        id: 'dynamic',
        tests: [
            ['core', function () {

            }],
            ['whatever', function () {

            }]
        ]
    }]
});
