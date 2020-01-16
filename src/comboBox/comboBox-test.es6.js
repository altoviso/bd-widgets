import {e, TestContainer, render, smoke} from '../../test/lib.js';
import ComboBox from './ComboBox.js';
import Button from '../button/Button.js';

let top = 0;

smoke.defBrowserTest({
    id: 'comboBox-demo',
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

        const list1 = [
            'aaa',
            'aab',
            'aba',
            'abb',
            'baa',
            'bab',
            'bba',
            'bbb'
        ];

        // function getDynaList() {
        //     const list = [];
        //     for (let i = 100; i < 110; i++) {
        //         list.push(`${i}`);
        //     }
        //
        //     function get(direction) {
        //         const newItems = [];
        //         if (direction === 'before') {
        //             const start = Number(list[0]);
        //             for (let i = start - 5; i < start; i++) {
        //                 newItems.push(`${i}`);
        //             }
        //             list.splice(0, 0, ...newItems);
        //         } else {
        //             const start = Number(list[list.length - 1]);
        //             for (let i = start + 1; i <= start + 5; i++) newItems.push(`${i}`);
        //             list.splice(list.length, 0, ...newItems);
        //         }
        //         // eslint-disable-next-line no-shadow
        //         return new Promise(resolve => {
        //             setTimeout(() => resolve(newItems), 2000);
        //         });
        //     }
        //
        //     return {list, get};
        // }


        // static list, free height
        window.z1 = top.insChild(e(ComboBox, {
            list: getStaticList(),
            static: true,
            sort: false
        }));


        window.z2 = top.insChild(e(ComboBox, {
            list: list1
        }));

        window.z3 = top.insChild(e(ComboBox, {
            list: list1,
            closed: true
        }));


        window.z4 = top.insChild(e(ComboBox, {
            list: [[true, 'true'], [false, 'false'], [null, '?']],
            closed: true
        }));

        top.insChild(e(Button, {label: 'Focusable-2'}));
        top.insChild(e(Button, {label: 'End Test', handler: resolve}));
        top.message = 'TODO';
        top.prompt = 'press the end test button to end the test';
        return result;
    }
});

smoke.defBrowserTest({
    id: 'comboBox',
    tests: [{
        id: 'static',
        tests: [
            ['core', () => {
                // todo
            }],
            ['whatever', () => {
                // todo
            }]
        ]
    }, {
        id: 'dynamic',
        tests: [
            ['core', () => {
                // todo
            }],
            ['whatever', () => {
                // todo
            }]
        ]
    }]
});
