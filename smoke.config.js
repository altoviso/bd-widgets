import {smoke} from './node_modules/bd-smoke/smoke.js';

// recall: all file names are relative to the root directory of the project by default

// we are going to replace smoke's assert with chai for this project
// do that before loading any tests because tests tend to take a ref to smoke.assert
smoke.configureBrowser({ load: ['./node_modules/chai/chai.js'] }, () => {
    const chai = window.chai;
    chai.config.includeStack = true;

    // chai outputs a single string for the stack that is hard to read in the browser console window
    smoke.logger.options.consoleErrorPrinter = function (e) {
        // eslint-disable-next-line no-console
        e.stack.split('\n')
            .forEach(l => console.log(l));
    };

    // putting some before advice on chai's assert API that bumps the smoke assert counter
    // this isn't necessary unless you want to count the number of asserts executed...which we like to do
    const cassert = chai.assert;

    function chaiAssert(...args) {
        smoke.bumpAssertCount();
        cassert.call(chai, ...args);
    }

    Object.keys(chai.assert)
        .forEach(name => {
            chaiAssert[name] = function (...args) {
                smoke.bumpAssertCount();
                cassert[name](...args);
            };
        });
    smoke.assert = chaiAssert;

    // now load up the tests and select which test to include
    const config = {
        load: [
            './less/main.css',
            smoke.options.liveCss && `http://localhost:${smoke.options.liveCss === true ? 35729 : smoke.options.liveCss}/livereload.js`,

            // tests...
            './test/help.js',
            './test/vstat.js',
            './src/meta/meta-test.js',
            './src/button/button-test.js',
            './src/stateButton/stateButton-test.js',
            './src/input/input-test.js',
            './src/listBox/listBox-test.js',
            './src/comboBox/comboBox-test.js',
            './src/accordion/accordion-test.js',
            './src/dialog/dialog-test.js',
            './src/dialog/dialog-test.js',
            // make sure this is last
            './test/log-assert-count.js'
        ]
    };
    return smoke.configureBrowser(config, () => {
        if (smoke.options.remotelyControlled) {
            // in the browser, being controlled remotely; let the remote controller make all decisions
            return;
        }

        if (smoke.options.include.length) {
            // the user said exactly what they want, but make sure we still log the final assert count
            smoke.options.include.push(['log-assert-count']);
            return;
        }

        let testSet = false;
        if (smoke.options.demo) {
            smoke.options.include = [`${smoke.options.demo}-demo`];
        } else if (/static|dynamic|both|\*/.test(smoke.options.testSet)) {
            // static => *.static
            // dynamic => *.dynamic
            // browser => *.static and *.dynamic
            // * => everything except *-demo
            testSet = smoke.options.testSet;

            const include = smoke.options.include = [['log-assert-count']];
            const doBrowser = testSet === 'browser';
            const doStatic = doBrowser || testSet === 'static';
            const doDynamic = testSet === 'browser' || testSet === 'dynamic';
            const doAll = testSet === '*';
            smoke.tests.forEach(test => {
                const rootId = test.id;
                if (!/-demo$/.test(rootId)) {
                    if (doAll || test.test) {
                        include.push([rootId]);
                    } else if (test.tests) {
                        test.tests.forEach(test => {
                            if (test.id === 'static' && (doStatic || doBrowser)) {
                                include.push([rootId, 'static']);
                            } else if (test.id === 'dynamic' && (doDynamic || doBrowser)) {
                                include.push([rootId, 'dynamic']);
                            }
                        });
                    }
                }
            });
        } else {
            // user.help is defined in ./test/help.js
            smoke.options.user.help();
            smoke.options.autoRun = false;
        }
    });
});
