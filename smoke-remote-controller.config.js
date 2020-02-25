// to see this work, run
//     node smoke-remote-controller.config.js --cap=safari
//     - or, e.g. -
//     node smoke-remote-controller.config.js --cap=safari --i=button
// from this directory

const smoke = require('bd-smoke');

// Inform node of test ids that it can remotely control running those tests on a remote browser.
[
    'button'
    //'button', 'stateButton', 'input'
].forEach(testId => smoke.defBrowserTestRef(testId));

smoke.defaultStart(smoke.configureNode(
    {
        autoRun: true,
        remoteUrl: 'http://localhost:3002/bd-widgets/node_modules/bd-smoke/smoke-runner.html',
        capabilities: require('./test/capabilities')
    }
));
