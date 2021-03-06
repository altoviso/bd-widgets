import {Component, e, render} from '../../bd-core/lib.js';
import {smoke} from '../node_modules/bd-smoke/smoke.js';

class Help extends Component {
    bdElements() {
        function ul(items) {
            return e('ul', items.map(item => e('li', { innerHTML: `${item}` })));
        }

        function anchor(include) {
            return { innerHTML: `<a href="./smoke-runner.html?i=${include}">i=${include}</a>` };
        }

        function testSetTable() {
            const content = [
                ['static', 'run all tests with identifiers *.static'],
                ['dynamic', 'run all tests with identifiers *.dynamic'],
                ['both', 'run all tests with identifiers *.static and *.dynamic'],
                ['*', 'run all the browser tests except tests with the suffix "-demo"']
            ].map(item => {
                const [param, text] = item;
                return e('tr',
                    e('td', { innerHTML: `<a href="./smoke-runner.html?testSet=${param}">testSet=${param}</a>` }),
                    e('td', text));
            });
            return e('table', content);
        }

        function individualTable() {
            const widgetList = [
                ['Meta', 'meta'],
                ['Button', 'button'],
                ['StateButton', 'stateButton'],
                ['Input', 'input'],
                ['ListBox', 'listBox'],
                ['ComboBox', 'comboBox'],
                ['Accordion', 'accordion'],
                ['Dialog', 'Dialog']
            ];
            const content = widgetList.map(pair => {
                const [widgetName, testid] = pair;
                return e('tr',
                    e('td', widgetName),
                    e('td', anchor(`${testid}.static`)),
                    e('td', anchor(`${testid}.dynamic`)),
                    e('td', anchor(`${testid}.static,${testid}.dynamic`)),
                    e('td', anchor(testid)));
            });
            return e('table',
                e('tr',
                    e('td', 'Widget'),
                    e('td', 'Static Tests'),
                    e('td', 'Dynamic Tests'),
                    e('td', 'Both Tests'),
                    e('td', 'All Tests')),
                content);
        }

        function demosTable() {
            const widgetList = [
                ['Meta', 'meta-demo'],
                ['Button', 'button-demo'],
                ['StateButton', 'stateButton-demo'],
                ['Input', 'input-demo'],
                ['ListBox', 'listBox-demo'],
                ['ComboBox', 'comboBox-demo'],
                ['Accordion', 'accordion-demo'],
                ['Dialog', 'dialog-demo']

            ];
            const content = widgetList.map(pair => {
                const [widgetName, testid] = pair;
                return e('tr',
                    e('td', widgetName),
                    e('td', anchor(testid)),);
            });
            return e('table',
                e('tr',
                    e('td', 'Widget'),
                    e('td', 'Link')),
                content);
        }


        function workbench() {
            const widgetList = [
                ['Meta', 'Meta'],
                ['Button', 'Button'],
                ['StateButton', 'StateButton'],
                ['Input', 'Input'],
                ['InputBoolean', 'InputBoolean'],
                ['InputNumber', 'InputNumber'],
                ['InputInteger', 'InputInteger'],
                ['InputMap', 'InputMap'],
                ['ListBox', 'ListBox'],
                ['ComboBox', 'ComboBox'],
                ['Accordion', 'Accordion'],
                ['Dialog', 'Dialog']

            ];
            const content = widgetList.map(pair => {
                const [widgetName, testid] = pair;
                return e('tr',
                    e('td', widgetName),
                    e('td', { innerHTML: `<a href="../../test/bench.html?${testid}">../../test/bench.html?${testid}</a>` }),);
            });
            return e('table',
                e('tr',
                    e('td', 'Widget'),
                    e('td', 'Link')),
                content);
        }


        return e('div', { style: { maxWidth: '1000px' } },
            e('h2', 'Backdraft Widget Library Tests'),
            e('p', 'There are several kinds of tests included with the bd-widget library:'),
            ul([
                "A demonstration page (<a href='../../index.html'>here</a>), that shows the buttons and a wrapped React Component.",
                'Individual widget type demonstrations, that show several examples of one type of widget.',
                'Static tests, that unit test each widget without user interaction.',
                'Dynamic tests, that unit test each widget, but require user interaction.',
                'A workbench page; see details below.',
                'Unit tests that can be run on either a browser or node which test various machinery that does not require a browser.'
            ]),
            e('p', 'As usual with smoke, an "include" parameter will cause exactly the included test(s) to be executed.'),
            e('h2', 'Individual Demos'),
            demosTable(),
            e('h2', 'Dynamic and Static Tests'),
            e('p', 'The special parameter "testSet" can take one of the values "static", "dynamic", "both", "*":'),
            testSetTable(),
            e('h2', 'Individual Dynamic and Static Tests'),
            individualTable(),
            e('h2', 'The Workbench'),
            e('p', 'The workbench renders a widget given in the URL. Other construction parameters can be provided in the URL. The workbench hooks up the widget so that all events generated by the widget as well as all watchable member variable mutations are output to the debugger console. The widget instance is available at the global variable "window.z", allowing the widget instance to be manipulated programmatically via the debugger. Here are some example URLs:'),
            workbench());
    }
}

smoke.options.user.help = () => {
    document.getElementById('bd-smoke').style.display = 'none';
    render(Help, document.getElementById('bd-smoke-root'));
};
