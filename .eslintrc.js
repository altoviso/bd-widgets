module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2017,
        "sourceType": "module"
    },
    "rules": {
		"indent": "off",
        "no-undef":["warn", { "typeof": false }],
        "linebreak-style": [
            "error",
            "windows"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ]
    },
	"overrides": [
		{
			"files": ["smoke.js"],
			"rules": {
				"quotes": "off",
				"indent": "off"
			},
			"globals": {
				"define": true
			}
		}
	]
};