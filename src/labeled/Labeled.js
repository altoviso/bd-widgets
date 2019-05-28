import {Component, e} from "../lib.js";

export default class Labeled extends Component.withWatchables("label") {
	bdElements(){
		return e.div({bdAttach: "bdChildrenAttachPoint"},
			e("label", {bdReflect: "label"})
		);
	}
}
Labeled.className = "bd-labeled";