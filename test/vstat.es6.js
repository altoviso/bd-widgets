import VStat from '../src/VStat.js';

const smoke = typeof window !== 'undefined' ? window.smoke : require('bd-smoke');

const assert = smoke.assert;

smoke.defTest({
    id: 'vstat',
    test() {
        // The default constructor returns a vstat at level===VStat.VALID with the default message for that level.
        let vs = new VStat();
        assert(vs.level === VStat.VALID);
        assert(vs.message === VStat.levels[VStat.VALID].message);
        assert(VStat.levels[VStat.VALID].message === 'valid');

        // Providing only a message to the constructor returns a vstat that indicates scalar error.
        vs = new VStat('a message');
        assert(vs.level === VStat.SCALAR_ERROR);
        assert(vs.message === 'a message');

        // Providing just an error level returns a vstat at that level and the default message for that level.
        // The className accessor reflects the level. The is* accessors provide for expressive clarity.
        vs = new VStat(VStat.VALID);
        assert(vs.level === VStat.VALID);
        assert(vs.message === VStat.levels[vs.level].message);
        assert(vs.className === VStat.levels[vs.level].className);
        assert(vs.isValid);
        assert(vs.isLegal);
        assert(vs.isScalarLegal);
        assert(!vs.isError);

        // Anything level less than this.constructor.ERROR_LEVEL is legal, and conversely
        // Anything level less than this.constructor.SCALAR_ERROR_LEVEL is scalar legal, and conversely
        // Anything level greater than or equal this.constructor.ERROR_LEVEL is error, and conversely
        assert(VStat.SCALAR_ERROR_LEVEL === VStat.SCALAR_ERROR);
        assert(VStat.ERROR_LEVEL === VStat.CONTEXT_ERROR);

        vs = new VStat(VStat.CONTEXT_INFO);
        assert(vs.level === VStat.CONTEXT_INFO);
        assert(vs.message === VStat.levels[vs.level].message);
        assert(vs.className === VStat.levels[vs.level].className);
        assert(vs.isContextInfo);
        assert(vs.isLegal);
        assert(vs.isScalarLegal);
        assert(!vs.isError);

        vs = new VStat(VStat.SCALAR_INFO);
        assert(vs.level === VStat.SCALAR_INFO);
        assert(vs.message === VStat.levels[vs.level].message);
        assert(vs.className === VStat.levels[vs.level].className);
        assert(vs.isScalarInfo);
        assert(vs.isLegal);
        assert(vs.isScalarLegal);
        assert(!vs.isError);

        vs = new VStat(VStat.CONTEXT_WARN);
        assert(vs.level === VStat.CONTEXT_WARN);
        assert(vs.message === VStat.levels[vs.level].message);
        assert(vs.className === VStat.levels[vs.level].className);
        assert(vs.isContextWarn);
        assert(vs.isLegal);
        assert(vs.isScalarLegal);
        assert(!vs.isError);

        vs = new VStat(VStat.SCALAR_WARN);
        assert(vs.level === VStat.SCALAR_WARN);
        assert(vs.message === VStat.levels[vs.level].message);
        assert(vs.className === VStat.levels[vs.level].className);
        assert(vs.isScalarWarn);
        assert(vs.isLegal);
        assert(vs.isScalarLegal);
        assert(!vs.isError);

        vs = new VStat(VStat.CONTEXT_ERROR);
        assert(vs.level === VStat.CONTEXT_ERROR);
        assert(vs.message === VStat.levels[vs.level].message);
        assert(vs.className === VStat.levels[vs.level].className);
        // Just hit VStat.ERROR_LEVEL, but not VStat.SCALAR_ERROR_LEVEL
        assert(!vs.isLegal);
        assert(vs.isScalarLegal);
        assert(vs.isError);


        vs = new VStat(VStat.SCALAR_ERROR);
        assert(vs.level === VStat.SCALAR_ERROR);
        assert(vs.message === VStat.levels[vs.level].message);
        assert(vs.className === VStat.levels[vs.level].className);
        // Just hit VStat.SCALAR_ERROR_LEVEL
        assert(!vs.isLegal);
        assert(!vs.isScalarLegal);
        assert(vs.isError);

        // Providing a level and message does what's expected.
        vs = new VStat(VStat.VALID, 'a message1');
        assert(vs.level === VStat.VALID);
        assert(vs.message === 'a message1');

        vs = new VStat(VStat.CONTEXT_WARN, 'a message2');
        assert(vs.level === VStat.CONTEXT_WARN);
        assert(vs.message === 'a message2');

        vs = new VStat(VStat.CONTEXT_ERROR, 'a message3');
        assert(vs.level === VStat.CONTEXT_ERROR);
        assert(vs.message === 'a message3');

        vs = new VStat(VStat.CONTEXT_ERROR, 'a message4');
        assert(vs.level === VStat.CONTEXT_ERROR);
        assert(vs.message === 'a message4');

        // A hash also works for ctor args.

        vs = new VStat({ level: VStat.CONTEXT_WARN });
        assert(vs.level === VStat.CONTEXT_WARN);
        assert(vs.message === VStat.levels[VStat.CONTEXT_WARN].message);

        vs = new VStat({ message: 'a message5' });
        assert(vs.level === VStat.SCALAR_ERROR);
        assert(vs.message === 'a message5');

        vs = new VStat({ level: VStat.SCALAR_INFO, message: 'a message6' });
        assert(vs.level === VStat.SCALAR_INFO);
        assert(vs.message === 'a message6');

        // One or more messages can be added at any level. A vStat has level defined as the highest level with a message.
        const msgs = [[], [], [], [], [], [], []];
        const hasMethodName = 'Valid.ContextInfo.ScalarInfo.ContextWarn.ScalarWarn.ContextError.ScalarError'.split('.').map(name => `has${name}Messages`);

        function assertMessages() {
            for (let level = VStat.VALID; level <= VStat.SCALAR_ERROR; level++) {
                const actual = vs.getMessagesRaw(level);
                const expected = msgs[level];
                assert.sameMembers(actual, expected);
                assert(expected.length ? vs[hasMethodName[level]] : !vs[hasMethodName[level]]);
            }
        }

        function addMessageAndCheck(level, message) {
            vs.addMessage(level, message);
            msgs[level].push(message);
            assertMessages();
        }

        vs = new VStat();
        assert(vs.isValid);
        msgs[0].push(VStat.levels[VStat.VALID].message);
        assertMessages();

        addMessageAndCheck(VStat.VALID, 'another valid message');
        assert(vs.isValid);

        addMessageAndCheck(VStat.CONTEXT_INFO, 'context info');
        assert(vs.level === VStat.CONTEXT_INFO);
        addMessageAndCheck(VStat.CONTEXT_INFO, 'context info2');
        assert(vs.level === VStat.CONTEXT_INFO);

        addMessageAndCheck(VStat.SCALAR_INFO, 'scalar info');
        assert(vs.level === VStat.SCALAR_INFO);
        addMessageAndCheck(VStat.SCALAR_INFO, 'scalar info2');
        assert(vs.level === VStat.SCALAR_INFO);

        addMessageAndCheck(VStat.CONTEXT_WARN, 'context warn');
        assert(vs.level === VStat.CONTEXT_WARN);
        addMessageAndCheck(VStat.CONTEXT_WARN, 'context warn2');
        assert(vs.level === VStat.CONTEXT_WARN);

        addMessageAndCheck(VStat.SCALAR_WARN, 'scalar warn');
        assert(vs.level === VStat.SCALAR_WARN);
        addMessageAndCheck(VStat.SCALAR_WARN, 'scalar warn2');
        assert(vs.level === VStat.SCALAR_WARN);

        addMessageAndCheck(VStat.CONTEXT_ERROR, 'context error');
        assert(vs.level === VStat.CONTEXT_ERROR);
        addMessageAndCheck(VStat.CONTEXT_ERROR, 'context error2');
        assert(vs.level === VStat.CONTEXT_ERROR);

        addMessageAndCheck(VStat.SCALAR_ERROR, 'scalar error');
        assert(vs.level === VStat.SCALAR_ERROR);
        addMessageAndCheck(VStat.SCALAR_ERROR, 'scalar error2');
        assert(vs.level === VStat.SCALAR_ERROR);

        // Individual messages can be deleted;
        // deleting all messages at the highest level moves the overall level down to the highest level that still has messages.
        function delMessageAndCheck(level, message) {
            vs.delMessage(level, message);
            msgs[level].splice(msgs[level].indexOf(message), 1);
            assertMessages();
        }

        // Delete all the SCALAR_ERROR messages and the level goes down to CONTEXT_ERROR.
        delMessageAndCheck(VStat.SCALAR_ERROR, 'scalar error2');
        assert(vs.level === VStat.SCALAR_ERROR);
        delMessageAndCheck(VStat.SCALAR_ERROR, 'scalar error');
        assert(vs.level === VStat.CONTEXT_ERROR);

        // Delete messages in an order different than they were put in.
        delMessageAndCheck(VStat.CONTEXT_ERROR, 'context error');
        assert(vs.level === VStat.CONTEXT_ERROR);
        delMessageAndCheck(VStat.CONTEXT_ERROR, 'context error2');
        assert(vs.level === VStat.SCALAR_WARN);

        // Delete messages from a level lower than the top level doesn't affect level
        delMessageAndCheck(VStat.CONTEXT_WARN, 'context warn');
        assert(vs.level === VStat.SCALAR_WARN);
        delMessageAndCheck(VStat.CONTEXT_WARN, 'context warn2');
        assert(vs.level === VStat.SCALAR_WARN);

        // Finish deleting them all.
        delMessageAndCheck(VStat.SCALAR_WARN, 'scalar warn');
        assert(vs.level === VStat.SCALAR_WARN);
        delMessageAndCheck(VStat.SCALAR_WARN, 'scalar warn2');
        assert(vs.level === VStat.SCALAR_INFO);

        delMessageAndCheck(VStat.SCALAR_INFO, 'scalar info');
        assert(vs.level === VStat.SCALAR_INFO);
        delMessageAndCheck(VStat.SCALAR_INFO, 'scalar info2');
        assert(vs.level === VStat.CONTEXT_INFO);

        delMessageAndCheck(VStat.CONTEXT_INFO, 'context info');
        assert(vs.level === VStat.CONTEXT_INFO);
        delMessageAndCheck(VStat.CONTEXT_INFO, 'context info2');
        assert(vs.level === VStat.VALID);

        delMessageAndCheck(VStat.CONTEXT_INFO, 'another valid message');
        assert(vs.level === VStat.VALID);

        // The last valid message can't be deleted--constructor.levels[VStat.VALID].message is always re-inserted.
        vs.getMessagesRaw(VStat.VALID).forEach(message => vs.delMessage(VStat.VALID, message));
        assert(vs.level === VStat.VALID);
        assert.sameMembers(vs.getMessagesRaw(VStat.VALID), [vs.constructor.levels[VStat.VALID].message]);
    }
});
