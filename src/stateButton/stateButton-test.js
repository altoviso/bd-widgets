import {e, test} from "../../test/lib.js";
import StateButton from "./StateButton.js";

const smoke = window.smoke;
const assert = smoke.assert;

let clickCount = 0;

smoke.defTest({
	id: "stateButton-batch",
	tests: [
		// ["fail", function(logger){
		// 	assert(false);
		// }],
		["core", function(logger){
			let top = test.top;
			let child = top.insChild(e(StateButton, {
				states: [{value: 123, mark: "A"}, {value: 456, mark: "B"}, {value: 789, mark: "C"}],
				value: 456,
				tabIndex: -1
			}));
			assert(top.children[0] instanceof StateButton);
			logger.log("StateButton.core.tree", test.getTree(child));
			top.delChild(child);
		}]
	]
});

