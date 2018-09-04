(function(factory){
	const isAmd = typeof define === 'function' && define.amd;
	const isNode = typeof window === "undefined";
	if(isAmd){
		define(["smoke"], smoke => factory(smoke, false, true, true))
	}else if(isNode){
		factory(require("bd-smoke"), true, false, false)
	}else{
		factory(window.smoke, false, true, false)
	}
}((smoke, isNode, isBrowser, isAmd) => {
	'use strict';

	// recall: all file names are relative to the root directory of the project by default

	// config that's applicable to all environments
	let config = {
		load: [
			isBrowser && "./test/help.es6.js",
			"./less/main.css" // will be ignored by smoke on node
			, smoke.options.liveCss && "//localhost:" + options.liveCss + "/livereload.js"
		],
		remoteUrl: 'http://localhost:8080/altoviso/bd-widgets/node_modules/bd-smoke/browser-runner.html',
	};

	// each of the tests below is written using es6 imports, and, c2018, will not load on node without transforming
	// we don't want to make that a requirement to test remotely, therefore we note the root of each test that is interesting
	// to run remotely (and therefore, be loaded by smoke on node) and use smoke.defBrowserTestRef to inform smoke about
	// such tests
	let tests = [
		[["button"], "./src/button/button-test.es6.js"],
		[["stateButton"], "./src/stateButton/stateButton-test.es6.js"]
	];

	if(isNode){
		tests.map(item => item[0].forEach(testId => smoke.defBrowserTestRef(testId)));
		config.capabilities = isNode ? require("./test/capabilities") : []
	}else if(isAmd){
		// TODO
	}else{
		// browser, not AMD
		config.load = config.load.concat(tests.map(item => item[1]));
	}

	smoke.configure(config).then(() => {
		if(smoke.options.remotelyControlled){
			// in the browser, being controlled remotely; let the remote controller make all decisions
			return;
		}
		if(smoke.options.include.length){
			// nothing to do, the user said exactly what they want
			return;
		}
		let testSet = false;
		if(smoke.options.demo){
			options.include = [smoke.options.demo + "-demo"];
		}else if(/static|dynamic|both|\*/.test(smoke.options.testSet)){
			// static => *.static
			// dynamic => *.dynamic
			// browser => *.static and *.dynamic
			// * => eveything except *-demo
			testSet = smoke.options.testSet;

			let include = [];
			let doBrowser = testSet === "browser";
			let doStatic = doBrowser || testSet === "static";
			let doDynamic = testSet === "browser" || testSet === "dynamic";
			let doAll = testSet === "*";
			let ttBrowser = smoke.testTypes.browser;
			let ttNode = smoke.testTypes.node;
			let ttBoth = smoke.testTypes.both;
			smoke.tests.forEach(test => {
				let rootId = test.id;
				if(!/-demo$/.test(rootId)){
					if(doAll || test.test){
						include.push([rootId]);
					}else if(test.tests){
						test.tests.forEach(test => {
							if(test.id === "static" && (doStatic || doBrowser)){
								include.push([rootId, "static"]);
							}else if(test.id === "dynamic" && (dynamic || doBrowser)){
								include.push([rootId, "dynamic"]);
							}
						});
					}
				}
			});
			smoke.options.include = include;
		}else{
			smoke.options.user.help();
			smoke.options.autoRun = false;
		}
	});
}));



