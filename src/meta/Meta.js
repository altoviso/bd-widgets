import {Component, e, VStat} from "../lib.js";

export default class Meta extends Component {
	constructor(){
		super({});
		this.bdVStat = VStat.valid();
	}

	get vStat(){
		return this.bdVStat;
	}

	set vStat(value){
		if(!value.eq(this.bdVStat)){
			this.bdMutate("vStat", "bdVStat", value);
		}
	}

	bdElements(){
		return e("div", {
			className: "bd-meta icon-",
			bdReflect: {title: ["vStat", (v) => v.message]},
			bdReflectClass: ["vStat", (v) => v.className]
		});
	}
}

Object.assign(Meta, {
	watchables: ["vStat"].concat(Component.watchables),
	events: [""].concat(Component.events)
});

