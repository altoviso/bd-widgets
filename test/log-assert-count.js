import {smoke} from '../node_modules/bd-smoke/smoke.js';

smoke.defTest({
    id: 'log-assert-count',
    test() {
        this.logger.logNote(`total asserts: ${smoke.getAssertCount()}`);
    }
});
