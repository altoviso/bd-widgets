(function(factory){
		// eslint-disable-next-line no-undef
	const isAmd = typeof define === "function" && define.amd;
	const isNode = typeof window === "undefined";
	if(isAmd){
		// eslint-disable-next-line no-undef
		define(["smoke"], smoke => factory(smoke, false, true, true));
	}else if(isNode){
		factory(require("bd-smoke"), true, false, false);
	}else{
		factory(window.smoke, false, true, false);
	}
}((smoke, isNode, isBrowser/*, isAmd*/) => {
	"use strict";

	// recall: all file names are relative to the root directory of the project by default

	// we are going to replace smoke's assert with chai for this project
	smoke.configure({load: [isBrowser ? "./node_modules/chai/chai.js" : "chai"]}).then(() => {
		// never going to get chai via AMD
		let chai = isBrowser ? window.chai : require("chai");
		chai.config.includeStack = true;

		// chai outputs a single string for the stack that is hard to read in the browser console window
		smoke.logger.options.consoleErrorPrinter = function(e){
		// eslint-disable-next-line no-console
			e.stack.split("\n").forEach(l => console.log(l));
		};

		// putting some before advice on chai's assert API that bumps the smoke assert counter
		// this isn't necessary unless you want to count the number of asserts executed...which we like to do
		let cassert = chai.assert;

		function chaiAssert(...args){
			smoke.bumpAssertCount();
			cassert(...args);
		}

		Object.keys(chai.assert).forEach(name => {
			chaiAssert[name] = function(...args){
				smoke.bumpAssertCount();
				cassert[name](...args);
			};
		});
		smoke.assert = chaiAssert;
	}).then(() => {
		// recall .CSS and .es6.js resources are ignored when running in node
		let config = {
			load: [
				"./less/main.css",
				isBrowser && "./node_modules/animejs/anime.js",
				smoke.options.liveCss && "http://localhost:" + (smoke.options.liveCss===true ? 35729 : smoke.options.liveCss) + "/livereload.js",

				// tests...
				"./test/help.es6.js",
				"./test/vstat.es6.js",
				"./src/meta/meta-test.es6.js",
				"./src/button/button-test.es6.js",
				"./src/stateButton/stateButton-test.es6.js",
				"./src/input/input-test.es6.js",
				"./src/listBox/listBox-test.es6.js",
				"./src/comboBox/comboBox-test.es6.js",
				"./src/dialog/dialog-test.es6.js",

				// make sure this is last
				"./test/log-assert-count.js"
			],
			remoteUrl: "http://localhost:8080/altoviso/bd-widgets/node_modules/bd-smoke/browser-runner.html",
		};

		// The following tests are defined in resources that use imports/exports, which, c2018, node cannot consum. But
		// we need to inform node of test ids so it can remotely control running those tests on a remote browser. We do
		// that here:
		[
			"button", "stateButton", "input"
		].forEach(testId => smoke.defBrowserTestRef(testId));

		smoke.configure(config).then(() => {
			if(smoke.options.remotelyControlled){
				// in the browser, being controlled remotely; let the remote controller make all decisions
				return;
			}

			if(smoke.options.include.length){
				// the user said exactly what they want, but make sure we still log the final assert count
				smoke.options.include.push(["log-assert-count"]);
				return;
			}

			let testSet = false;
			if(smoke.options.demo){
				smoke.options.include = [smoke.options.demo + "-demo"];
			}else if(/static|dynamic|both|\*/.test(smoke.options.testSet)){
				// static => *.static
				// dynamic => *.dynamic
				// browser => *.static and *.dynamic
				// * => everything except *-demo
				testSet = smoke.options.testSet;

				let include = smoke.options.include = [["log-assert-count"]];
				let doBrowser = testSet === "browser";
				let doStatic = doBrowser || testSet === "static";
				let doDynamic = testSet === "browser" || testSet === "dynamic";
				let doAll = testSet === "*";
				smoke.tests.forEach(test => {
					let rootId = test.id;
					if(!/-demo$/.test(rootId)){
						if(doAll || test.test){
							include.push([rootId]);
						}else if(test.tests){
							test.tests.forEach(test => {
								if(test.id === "static" && (doStatic || doBrowser)){
									include.push([rootId, "static"]);
								}else if(test.id === "dynamic" && (doDynamic || doBrowser)){
									include.push([rootId, "dynamic"]);
								}
							});
						}
					}
				});
			}else{
				// user.help is defined in ./test/help.es6.js
				smoke.options.user.help();
				smoke.options.autoRun = false;
			}
		});
	});
}));



