const smoke = require("bd-smoke");
const assert = smoke.assert;

smoke.defTest({
	id: "stateButton",
	tests: [
		["stateButton-batch", function(logger, loggerId){
			function execStateButton(callback){
				smoke.runRemote("stateButton-batch").then(callback);
			}

			return logger.driver.executeAsyncScript(execStateButton).then(result =>
				logger.logRemoteResults(loggerId, result)
			);
		}]
	]
});


