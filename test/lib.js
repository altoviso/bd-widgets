import {Component, render} from "../../node_modules/bd-core/lib.js";

const test = {
	Component: Component,

	top: render(Component, document.getElementById("root")),

	getTree: function(node){
		return 'TODO';
	}
};

export {test};
export * from "../node_modules/bd-core/lib.js"
