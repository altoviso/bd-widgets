import {e, test} from "../../test/lib.js";
import Button from "./Button.js";

const smoke = window.smoke;
const assert = smoke.assert;

let clickCount = 0;

smoke.defTest({
	id: "button",
	tests: [
		["interactive", function(logger){
			let top = test.top;
			let tabIndex = 1;
			top.insChild(e(Button, {
				label: "Ticklish",
				className: "tickle",
				tabIndex: tabIndex++,
				handler: () => console.log("clicked Ticklish button")
			}));
			top.insChild(e(Button, {
				label: "Disabled",
				enabled: false,
				tabIndex: tabIndex++,
				handler: () => console.log("clicked Disabled button")
			}));
			top.insChild(e(Button, {
				className: "icon-",
				label: "\u{e904}",
				tabIndex: tabIndex++,
				handler: () => console.log("clicked save button")
			}));
		}]
	]
});

smoke.defTest({
	id: "button-batch",
	tests: [
		// ["fail", function(logger){
		// 	assert(false);
		// }],
		["core1", function(logger){
			let top = test.top;
			let child = top.insChild(e(Button, {
				id: "test1",
				label: "OK",
				title: "click me!",
				tabIndex: 2,
				handler: () => test.log("button1", {clickCount: ++clickCount})
			}));
			assert(top.children[0] instanceof Button);
			logger.log("StateButton.core.tree", test.getTree(child));
			top.delChild(child);
		}],
		["core2", function(logger){
			let top = test.top;
			let child = top.insChild(e(Button, {
				id: "test1",
				label: "OK",
				title: "click me!",
				tabIndex: 2,
				handler: () => test.log("button1", {clickCount: ++clickCount})
			}));
			assert(top.children[0] instanceof Button);
			logger.log("StateButton.core.tree", test.getTree(child));
			top.delChild(child);
		}]
	]
});
