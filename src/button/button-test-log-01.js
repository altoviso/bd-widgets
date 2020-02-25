export default {
    'button/dynamic': [
        [
            'log',
            'starting test:button/dynamic'
        ],
        [
            'message',
            'rendering'
        ],
        [
            'watch',
            'className',
            'bd-button',
            ''
        ],
        [
            'watch',
            'rendered',
            true,
            false
        ],
        [
            'watch',
            'attachedToDoc',
            true,
            undefined
        ],
        [
            'message',
            'three buttons should be displayed; this test exercises the CENTER button'
        ],
        [
            'prompt',
            'click CENTER button'
        ],
        [
            'watch',
            'className',
            'bd-button bd-focused',
            'bd-button'
        ],
        [
            'watch',
            'hasFocus',
            true,
            undefined
        ],
        [
            'native event',
            'click',
            {
                type: 'click'
            }
        ],
        [
            'message',
            'the CENTER button has the focus'
        ],
        [
            'prompt',
            'press tab'
        ],
        [
            'watch',
            'className',
            'bd-button',
            'bd-button bd-focused'
        ],
        [
            'watch',
            'hasFocus',
            false,
            true
        ],
        [
            'message',
            'the CENTER button lost the focus'
        ],
        [
            'prompt',
            'press shift-tab'
        ],
        [
            'watch',
            'className',
            'bd-button bd-focused',
            'bd-button'
        ],
        [
            'watch',
            'hasFocus',
            true,
            false
        ],
        [
            'message',
            'the CENTER button re-acquired the focus'
        ],
        [
            'prompt',
            'press spacebar'
        ],
        [
            'native event',
            'click',
            {
                type: 'keydown'
            }
        ],
        [
            'prompt',
            'click the CENTER button'
        ],
        [
            'native event',
            'click',
            {
                type: 'click'
            }
        ],
        [
            'message',
            'destroying button'
        ],
        [
            'watch',
            'attachedToDoc',
            false,
            true
        ],
        [
            'watch',
            'rendered',
            false,
            true
        ]
    ]
};
