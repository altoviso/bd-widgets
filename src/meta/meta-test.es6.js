import {e, TestContainer, render, smoke, assert} from "../../test/lib.js";
import Meta from "./Meta.js";
import VStat from "../VStat.js";
import Button from "../button/Button.js";

let top = 0;

smoke.defBrowserTest({
	id: "meta-demo",
	before(){
		top = render(TestContainer, document.getElementById("bd-smoke-root"));
	},
	finally(){
		top.unrender();
		top = 0;
	},
	test: function(){
		let resolve;
		let result = new Promise(_resolve => (resolve = _resolve));
		top.insChild(e(Button, {label: "Focusable-1"}));

		// static list, free height
		let z1 = window.z1 = top.insChild(e(Meta));
		z1.vStat = VStat.valid();

		let z2 = window.z2 = top.insChild(e(Meta));
		z2.vStat = VStat.contextInfo();

		let z3 = window.z3 = top.insChild(e(Meta));
		z3.vStat = VStat.scalarInfo();

		let z4 = window.z4 = top.insChild(e(Meta));
		z4.vStat = VStat.contextWarn();

		let z5 = window.z5 = top.insChild(e(Meta));
		z5.vStat = VStat.scalarWarn();

		let z6 = window.z6 = top.insChild(e(Meta));
		z6.vStat = VStat.contextError();

		let z7 = window.z7 = top.insChild(e(Meta));
		z7.vStat = VStat.scalarError();

		top.insChild(e(Button, {label: "Focusable-2"}));
		top.insChild(e(Button, {label: "End Test", handler: resolve}));
		top.message = "TODO";
		top.prompt = "press the end test button to end the test";
		return result;
	}
});

smoke.defBrowserTest({
	id: "meta",
	tests: [{
		id: "static",
		tests: [
			["core", function(){

			}],
			["whatever", function(){

			}]
		]
	}, {
		id: "dynamic",
		tests: [
			["core", function(){

			}],
			["whatever", function(){

			}]
		]
	}]
});