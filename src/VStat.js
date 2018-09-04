import {WatchHub, EventHub} from "./bd-core.js"

const VALID = 0;
const CONTEXT_INFO = 1;
const SCALAR_INFO = 2;
const CONTEXT_WARN = 3;
const SCALAR_WARN = 4;
const CONTEXT_ERROR = 5;
const SCALAR_ERROR = 6;

const levelIds = [
	"valid",
	"contextInfo",
	"scalarInfo",
	"contextWarn",
	"scalarWarn",
	"contextError",
	"scalarError"
];

const levels = {
	valid: 0,
	contextInfo: 1,
	scalarInfo: 2,
	contextWarn: 3,
	scalarWarn: 4,
	contextError: 5,
	scalarError: 6
};

// privates...
const pLevel = Symbol("pLevel");
const pMessages = Symbol("pMessages");
const pClassName = Symbol("pClassName");
const pAddMessage = Symbol("pAddMessage");
const pDelMessage = Symbol("pDelMessage");

class Base {
	[pAddMessage](level, message){
		// no duplicates allowed
		// empty message is converted to default message given by ctor
		message = message && message.trim();
		let levelMessages = (this[pMessages] || (this[pMessages] = []))[level];
		let result = {level: level, message: message, messages: this[pMessages]};
		if(!levelMessages){
			if(!message){
				message = result.message = this.constructor.levels[level].message;
			}
			this[pMessages][level] = message;
			return result;
		}else if(message){
			if(Array.isArray(levelMessages)){
				if(levelMessages.indexOf(message) === -1){
					levelMessages.push(message);
					return result;
				}
			}else if(levelMessages !== message){
				this[pMessages][level] = [levelMessages, message];
				return result;
			}
			return false;
		}
	}

	[pDelMessage](level, message){
		message = message && message.trim();

		let messages = this[pMessages];
		let levelMessages = messages && messages[level];

		if(!message || !levelMessages){
			return {level: level, message: "", messages: this[pMessages] || [], change: false};
		}

		let result = {level: level, message: message, messages: this[pMessages], change: true};
		if(Array.isArray(levelMessages)){
			let index = levelMessages.indexOf(message);
			if(index !== -1){
				levelMessages.splice(index, 1);
				if(!levelMessage.length){
					delete messages[level];
				}
				if(!messages.some(x => x)){
					delete this[pMessages];
					result.message = [];
				}
			}else{
				result.change = false;
			}
		}else if(levelMessages === message){
			delete messages[level];
			if(!messages.some(x => x)){
				delete this[pMessages];
				result.message = [];
			}
		}else{
			result.change = false;
		}
		return result;
	}
}

//
// VStat - validation status
//
// manages a validation status and associated messages and className
//
export class VStat extends EventHub(WatchHub(Base)) {
	constructor(level, message){
		super();
		this[pLevel] = VALID;
		if(level === undefined){
			// default ctor
			level = VALID;
		}else if(typeof level === "string"){
			message = level;
			level = SCALAR_ERROR;
		}
		if(message || typeof level === "number"){
			this.set(level, message);
		}else if(level instanceof VStat){
			// copy constructor
			let src = level;
			if(src[pMessages]){
				this[pMessages] = src[pMessages].map(item => Array.isArray(item) ? item.slice() : item);
			}
			this[pLevel] = src[pLevel];
		}else{
			// must be a hash
			let src = level;
			let level = "level" in src ? src.level : ("message" in src ? SCALAR_ERROR : VALID);
			this.set(level, src.message);
		}
	}

	get level(){
		return this[pLevel];
	}

	set(level, message){
		let messageInfo = this[pAddMessage](level, message);
		if(level > this[pLevel]){
			this.bdMutate("level", pLevel, level);
		}// else no level change

		if(messageInfo.change){
			this.bdNotify(Object.assign({type: "messageIns"}), messageInfo);
		}
	}

	get message(){
		let msg = this[pMessages] && this[pMessages][this[pLevel]];
		if(!msg){
			return "";
		}else if(Array.isArray(msg)){
			return msg.join("\n");
		}else{
			return msg;
		}
	}

	get className(){
		return this.constructor.levels[this[pLevel]].className
	}

	get isLegal(){
		return this[pLevel] < this.constructor.ERROR_LEVEL;
	}

	get isScalarLegal(){
		return this[pLevel] < this.constructor.SCALAR_ERROR_LEVEL;
	}

	get isError(){
		return this[pLevel] >= this.constructor.ERROR_LEVEL;
	}

	get isValid(){
		return this[pLevel] === this.constructor.VALID;
	}

	get isContextInfo(){
		return this[pLevel] < this.constructor.CONTEXT_INFO;
	}

	get isScalarInfo(){
		return this[pLevel] >= this.constructor.SCALAR_INFO;
	}

	get isContextWarn(){
		return this[pLevel] < this.constructor.CONTEXT_WARN;
	}

	get isScalarWarn(){
		return this[pLevel] >= this.constructor.SCALAR_WARN;
	}

	get isContextError(){
		return this[pLevel] < this.constructor.CONTEXT_ERROR;
	}

	get isScalarError(){
		return this[pLevel] >= this.constructor.SCALAR_ERROR;
	}

	addMessage(level, message){
		if(level > this[pLevel]){
			this.set(level, message);
		}else{
			let messageInfo = this[pAddMessage](level, message);
			messageInfo.change && this.bdNotify(Object.assign({type: "messageIns"}), messageInfo);
		}
	}

	delMessage(level, message){
		let messageInfo = this[pDelMessage](level, message);
		if(messageInfo.change){
			let maxLevel = (this[pMessages] || []).reduce((acc, item, level) => item ? level : acc, VALID);
			if(maxLevel !== this[pLevel]){
				this.bdMutate("level", pLevel, maxLevel);
			}
			messageInfo && this.bdNotify(Object.assign({type: "messageDel"}), messageInfo);
		}

	}

	getMessages(level, separator){
		let m = this[pMessages][level];
		return Array.isArray(m) ? m.join(separator || "\n") : (m || "");
	}

	getMessagesRaw(level){
		// guaranteed to return an array
		let m = this[pMessages] && this[pMessages][level];
		return (Array.isArray(m) ? m : (m ? [m] : [])).slice();
	}

	eq(other){
		if(!(other instanceof VStat)){
			return false;
		}
		if(this[pLevel] !== other[pLevel]){
			return false;
		}
		let lhsMessages = this[pMessages];
		let rhsMessages = other[pMessages];
		if(lhsMessages === rhsMessages){
			return true;
		}
		if(!lhsMessages || !rhsMessages){
			return false;
		}
		for(let i = 0, end = lhsMessages.length; i < end; i++){
			let lhsLevelMessages = lhsMessages[i];
			let rhsLevelMessages = rhsMessages[i];
			// either undefined, string or array
			if(lhsLevelMessages === undefined || typeof lhsLevelMessages === "string"){
				if(lhsLevelMessages !== rhsLevelMessages){
					return false;
				}
			}
			// lhsLevelMessages is an array
			if(!Array.isArray(rhsLevelMessages) || lhsLevelMessages.length !== rhsLevelMessages.length){
				return false;
			}
			// both arrays of the same size; see if there is a string in the left not in the right
			if(lhsLevelMessages.some(lMessage => !rhsLevelMessages.some(rMessage => lMessage === rMessage))){
				return false;
			}
		}
		return true;
	}

	static valid(message){
		return new VStat(VALID, message)
	}

	static contextInfo(message){
		return new VStat(CONTEXT_INFO, message)
	}

	static scalarInfo(message){
		return new VStat(SCALAR_INFO, message)
	}

	static contextWarn(message){
		return new VStat(CONTEXT_WARN, message)
	}

	static scalarWarn(message){
		return new VStat(SCALAR_WARN, message)
	}

	static contextError(message){
		return new VStat(CONTEXT_ERROR, message)
	}

	static scalarError(message){
		return new VStat(SCALAR_ERROR, message)
	}
}

Object.assign(VStat, {
	pLevel: pLevel,
	pMessages: pMessages,
	pClassName: pClassName,

	VALID: VALID,
	CONTEXT_INFO: CONTEXT_INFO,
	SCALAR_INFO: SCALAR_INFO,
	CONTEXT_WARN: CONTEXT_WARN,
	SCALAR_WARN: SCALAR_WARN,
	CONTEXT_ERROR: CONTEXT_ERROR,
	SCALAR_ERROR: SCALAR_ERROR,

	ERROR_LEVEL: CONTEXT_ERROR,
	SCALAR_ERROR_LEVEL: SCALAR_ERROR,

	levels: [
		{className: "bd-vStat-valid", message: "value is valid"},
		{className: "bd-vStat-contextInfo", message: ""},
		{className: "bd-vStat-scalarInfo", message: ""},
		{className: "bd-vStat-contextWarn", message: ""},
		{className: "bd-vStat-scalarWarn", message: ""},
		{className: "bd-vStat-contextError", message: "value is illegal in context"},
		{className: "bd-vStat-scalarError", message: "value is illegal"}
	]
});

