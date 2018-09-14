import {Component, e, VStat} from "../lib.js";

let ns = Component.getNamespace();
const pVStat = ns.get("pVStat");

export default class Meta extends Component {
	constructor(){
		super({});
		this[pVStat] = VStat.valid();
	}

	get vStat(){
		return this[pVStat];
	}

	set vStat(value){
		if(!value.eq(this[pVStat])){
			this.bdMutate("vStat", pVStat, value);
		}
	}

	bdElements(){
		return e("div", {
			className: "bd-meta icon-",
			bdReflectProp: {title: ["vStat", (v) => v.message]},
			bdReflectClass: ["vStat", (v) => v.className]
		});
	}
}

ns.publish(Meta, {
	watchables: ["vStat"],
	events: [""]
});

