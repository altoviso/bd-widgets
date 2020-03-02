import {e, TestContainer, render, smoke} from '../../test/lib.js';
import Accordion from './Accordion.js';

let top;

smoke.defTest({
    id: 'accordion-demo',
    before() {
        top = render(TestContainer, document.getElementById('bd-smoke-root'));
    },
    finally() {
        top.unrender();
        top = undefined;
    },
    test() {
        top.insChild(e(Accordion, {
            list: ['red', 'yellow', 'blue', 'green', 'orange', 'purple'],
            bdWatch: { value: value => console.log(`just selected ${value}`) }
        }));
        top.insChild(e(Accordion, {
            list: [1, 2, 3, 4, 5],
            bdWatch: { value: value => console.log(`just selected ${value}`) }
        }));
        top.message = 'an accordion with colors';
        return new Promise(() => 0);
    }
});

smoke.defBrowserTest({
    id: 'Accordion',
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
                return 0;
            }]
        ]
    }]
});
