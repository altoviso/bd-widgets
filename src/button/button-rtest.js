const smoke = require("bd-smoke");
const assert = smoke.assert;

smoke.defTest({
	id: "button",
	tests: [
		["button-batch", function(logger, loggerId){
			function execButton(callback){
				smoke.runRemote("button-batch").then(callback);
			}

			return logger.driver.executeAsyncScript(execButton).then(result =>
				logger.logRemoteResults(loggerId, result)
			);
		}]
	]
});



