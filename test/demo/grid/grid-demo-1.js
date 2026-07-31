import {Component, e, render, setStyle} from '../../../src/lib.js';
import Button from '../../../src/button/Button.js';
import StaticText from '../../../src/staticText/StaticText.js';
import StateButton from '../../../src/stateButton/StateButton.js';
import InputInteger from '../../../src/input/InputInteger.js';
import {RelVar} from '../../../src/relvar/RelVar.js';
import Grid from '../../../src/grid/Grid.js';

const genericCompare = Grid.genericCompare;

const colorRelDef = {
    attributes: [{
        name: 'id',
        accessor: row => row[0],
        collator: (row1, row2) => row1[0] - row2[0],
        eql: (row1, row2) => row1[0] === row2[0],
    }, {
        name: 'color',
        accessor: row => row[1],
        mutator: (row, value) => row[1] = value,
        collator: (row1, row2) => row1[1].code - row2[1].code || genericCompare(row1[1].name, row2[1].name),
        eql: (row1, row2) => row1[1].code - row2[1].code && row1[1].name === row2[1].name,
    }, {
        name: 'like',
        accessor: row => row[2],
        mutator: (row, value) => row[2] = !!value,
        collator: (row1, row2) => row1[2] === row2[2] ? 0 : row1[2] ? 1 : -1,
        eql: (row1, row2) => row1[2] === row2[2]
    }, {
        name: 'hide',
        accessor: row => row[3],
        mutator: (row, value) => row[3] = !!value,
        collator: (row1, row2) => row1[2] === row2[2] ? 0 : row1[2] ? 1 : -1,
        eql: (row1, row2) => row1[3] === row2[3]
    }, {
        name: 'preference',
        accessor: row => row[4],
        mutator: (row, value) => row[4] = Math.max(0, Math.min(100, value)),
        collator: (row1, row2) => genericCompare(row1[4], row2[4]),
        eql: (row1, row2) => row1[4] === row2[4]
    }],
    keys: ['id']
};

// create a non-empty colorRelVar
const colorRelVar = (function () {
        const data = [];
        const code = (red, green, blue) => (red << 16) | (green << 8) | blue;
        const percent = value => Math.round((value / 0xff) * 100);
        const name = (red, green, blue) => `red(${percent(red)})-green(${percent(green)})-blue(${percent(blue)})`;
        const color = (red, green, blue) => ({code: code(red, green, blue), name: name(red, green, blue)});
        for (let red = 0; red <= 0xff; red += 0x10) {
            for (let green = 0; green <= 0xff; green += 0x10) {
                for (let blue = 0; blue <= 0xff; blue += 0x10) {
                    data.push([
                        // id, color, like, hide, preference
                        data.length, color(red, green, blue), false, false, 50
                    ]);
                }
            }
        }
        return new RelVar({
            relDef: colorRelDef,
            data
        });
    }
)();

class Color extends Component.withWatchables('code', 'name') {
    constructor(kwargs) {
        super(kwargs);
        this._code = kwargs.code || 0;
        this._name = kwargs.name || 'name?';
    }

    bdElements() {
        return e.div({
            className: 'color',
            title: this.name,
        }, e.div(), e.div({bdReflect: 'name'}));
    }

    postRender() {
        this.onMutateCode(this.code);
    }

    onMutateCode(code) {
        if (this.rendered) {
            setStyle(this.bdDom.root.firstChild, 'backgroundColor', `#${code.toString(16).padStart(6, '0')}`);
        }
    }
}

function simpleConnector(propName, attrName) {
    return (row, component) =>
        component.ownWhileRendered(
            row.advise(true, 'updated', () => component[propName] = row.get(attrName)),
            component.watch(['value'], value => row.set(attrName, value)));
}

class Demo1Grid extends Grid {
    bdTableMetadata() {
        return {
            rIndex: {
                header: e(StaticText, {value: 'Index'}),
                content: StaticText,
                connector: (row, component) => component.value = row.index
            },
            colorCode: {
                header: e(StaticText, {value: 'ColorCode'}),
                content: StaticText,
                // contentKwargs defaults to null if missing
                connector: (row, component) => component.value = row.get('color').code.toString(16)
            },
            like: {
                header: e(StaticText, {value: 'Like'}),
                content: e(StateButton,{states: [{value: false, mark: 'don\'t like'}, {value: true, mark: 'like'}]}),
                connector: (row, component) =>
                    component.ownWhileRendered(
                        row.advise(true, 'updated', () => component.value = row.get('like')),
                        component.watch('value', value => row.set('like', value)))
            },
            color: {
                header: e(StaticText, {value: 'Color'}),
                content: Color,
                connector: (row, component) =>
                    component.ownWhileRendered(
                        row.advise(true, 'updated', () => {
                            const color = row.get('color');
                            component.code = color.code;
                            component.name = color.name;
                        }),
                        component.watch(['code', 'name'], () => row.set('color', {
                            code: component.code,
                            name: component.name
                        })))
            },
            hide: {
                header: e(StaticText, {value: 'Hide'}),
                content: StateButton.Checkbox,
                connector: Grid.simpleConnector('value', 'hide')
            },
            preference: {
                header: e(StaticText, {value: 'Preference'}),
                content: e(InputInteger, {min: 0, max: 100}),
                connector: Grid.simpleConnector('value', 'preference')
            },
        }
    }
}

class Demo1 extends Component {
    bdElements() {
        return e.div({className: 'grid-demo-1'},
            e.h1({}, 'Grid Demo'),
            e.div({className: 'center-section'},
                e(Demo1Grid, {
                    bdAttach: 'theGrid',
                    relVar: colorRelVar,
                }),
                e.div({className: 'spacer'})),
            e.footer({}, 'footer'));
    }
}

Demo1.staticClassName = 'grid-demo-1';

const ts = Date.now();
const demo1 = render(Demo1, document.body);
console.log('time: ', (Date.now() - ts) / 1000, document.querySelectorAll('*').length);

window.rawld = demo1.theGrid;
