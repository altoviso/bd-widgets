const {Builder} = require('selenium-webdriver');
const smoke = require("bd-smoke");
const testModules = require("./manifest.js");

smoke.configure(process.argv.slice(2));

let toArray = src => Array.isArray(src) ? src : [src];
let commaListToArray = src => src.split(",").map(s => s.trim()).filter(s => !!s);
let conditionArrayOfCommaListOptions = src => toArray(src).reduce((result, item) => result.concat(commaListToArray(item)), []);

let options = smoke.options;

options.test = options.test ? conditionArrayOfCommaListOptions(options.test) : Object.keys(testModules);
options.test.forEach(k =>{
	if(k in testModules){
		require(testModules[k])
	}else{
		console.log('test parameter "' + k + '" specified in command line doesn\'t exist in manifest');
	}
});

options.run = options.run ? conditionArrayOfCommaListOptions(options.run) : ["*"];
options.run = options.run.filter(testId =>{
	if(testId !== "*" && !smoke.getTest(testId)){
		console.log('run parameter "' + testId + '" specified in command line doesn\'t exist in any of the loaded test modules');
		return false;
	}else{
		return true;
	}
});

let capabilities = require("./capabilities.js");
let optionCaps = (options.caps && conditionArrayOfCommaListOptions(options.caps)) || [];
if(options.capsPreset){
	conditionArrayOfCommaListOptions(options.capsPreset).forEach(preset =>{
		if(!capabilities.presets[preset]){
			console.log('capsPreset parameter "' + preset + '" specified in command line does not exist in capabilities presets');
		}else{
			optionCaps = optionCaps.concat(capabilities.presets[preset])
		}
	})
}
if(!optionCaps.length){
	optionCaps = ["chrome"];
}else{
	optionCaps.forEach(name =>{
		if(!capabilities.some(cap => cap.name === name)){
			console.log('capability "' + cap + '" specified in command line does not exist in capabilities');
		}
	})
}
capabilities = capabilities.filter(item =>{
	let name = item.name;
	return optionCaps.some(cap => cap === name);
});

if(!options.run.length || !capabilities.length){
	console.log("nothing to do; exiting with error code == 1")
	process.exit(1);
}

console.log("loading from the manifest:");
options.test.forEach(k => console.log(k));
console.log("");
console.log("running tests:");
options.run.forEach(k => console.log(k));
console.log("");
console.log("running capabilities:");
capabilities.forEach(cap => options.dryRun ? console.log(cap) : console.log(cap.name));
console.log("");

if(options.dryRun){
	process.exit(0);
}

function writeRemoteResults(testName, results){
	console.log("");
	console.log("Remote Results for:" + testName);
	results.results.forEach(result =>{
		let d = new Date(result[1]);
		if(result[2]){
			console.log("PASS: " + result[0]);
		}else{
			console.log("FAIL: " + result[0]);
			result[3].split("\n").forEach(s => console.log(s));
		}
	});
	console.log("        total:" + results.totalCount);
	console.log("         pass:" + results.passCount);
	console.log("         fail:" + results.failCount);
	console.log("scaffold fail:" + results.scaffoldFailCount);
	console.log(".");
}

class Logger extends smoke.Logger {
	constructor(){
		super();
		this.remoteResults = [];
	}

	logRemoteResults(loggerId, results){
		results = JSON.parse(results);
		this._totalCount += results.totalCount;
		this._passCount += results.passCount;
		this._failCount += results.failCount;
		this._scaffoldFailCount += results.scaffoldFailCount;
		writeRemoteResults(this.getNameById(loggerId), results);
		this.remoteResults.push([this.getNameById(loggerId), results]);
	}

	finish(){
		console.log("run complete...");
		console.log("        total:" + this._totalCount);
		console.log("         pass:" + this._passCount);
		console.log("         fail:" + this._failCount);
		console.log("scaffold fail:" + this._scaffoldFailCount);
	}
}

let logger = new Logger();

function doBrowser(capName, driver){
	console.log("doBrowser", capName);

	logger.driver = driver;
	return driver.get('http://localhost:3002/test/index.html').then(
		_ =>{
			return new Promise(function(resolve, reject){
				let tests = options.run.slice();

				function runTest(){
					return smoke.run(tests.pop(), logger).then(
						_ => tests.length ? runTest() : resolve()
					)
				}

				if(options.remoteConsole){
					driver.executeScript("smoke.options.remoteConsole = true;").then(_ =>
						runTest()
					);
				}else{
					runTest();
				}
			});
		}
	).then(
		_ =>{
			console.log("quitting driver");
			return driver.quit();
		}
	);
}

function doNextCapability(){
	let cap = capabilities.pop();
	console.log("running capability " + cap.name + "...");

	let builder = (new Builder()).withCapabilities(cap.caps);
	if('browserstack.user' in cap.caps){
		builder.usingServer('http://hub-cloud.browserstack.com/wd/hub');
	}
	return doBrowser(cap.name, builder.build()).then(_ =>{
		if(capabilities.length){
			return doNextCapability();
		}else{
			logger.finish();
		}
	})
}

doNextCapability().then(_ =>{
	let errorCode = logger.failCount + logger.scaffoldFailCount;
	console.log("process exit with code: ", errorCode);
	process.exit(errorCode);
});
