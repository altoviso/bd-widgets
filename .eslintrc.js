module.exports = {
    'env': {
        'browser': true,
        'es6': true,
        'node': true
    },

    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },

    extends: [
        'backdraft'
    ],

    'rules': {
    }//,

	// "overrides": [
	// 	{
	// 		"files": ["smoke.js"],
	// 		"rules": {
	// 			"quotes": "off",
	// 			"indent": "off"
	// 		},
	// 		"globals": {
	// 			"define": true
	// 		}
	// 	}
	// ]
};
