(function(isNode){

	// testModules is a hash from key -> [browser-test, node-test]; k -> "S" implies k -> ["S-test.js", "S-rtest.js"]
	let testModules = {
		button: "../src/button/button",
		stateButton: "../src/stateButton/stateButton"
	};

	// condition for environment:
	Object.keys(testModules).forEach(key =>{
		if(typeof key === "string"){
			testModules[key] = testModules[key] + (isNode ? "-rtest.js" : "-test.js");
		}else{
			testModules[key] = testModules[key][isNode ? 1 : 0];
		}
	});

	if(isNode){
		module.exports = testModules;
	}else{
		window.smoke.options.user.testModules = testModules;
	}
})(typeof document === "undefined");

