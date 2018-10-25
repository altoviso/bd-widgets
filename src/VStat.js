import {watchHub, eventHub, eqlComparators} from "./bd-core.js";

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

// privates...
const pLevel = Symbol("pLevel");
const pMessages = Symbol("pMessages");
const pMutate = Symbol("pMutate");
const pValidateParams = Symbol("pValidateParams");
const pClassName = Symbol("pClassName");
const pAddMessage = Symbol("pAddMessage");
const pDelMessage = Symbol("pDelMessage");
let qlock = 0;
let eventQ = [];

function pushQ(type, level, message, target){
	eventQ.push({type: type, level: level, message: message, messages: target[pMessages], target: target});
}

class Base {
	[pValidateParams](level, message){
		level = Number(level);
		if(level < this.constructor.MIN_LEVEL || this.constructor.MAX_LEVEL < level){
			throw new Error("level must be minimum and maxium level");
		}
		return [level, message ? (message + "").trim() : ""];
	}

	[pMutate](proc){
		try{
			qlock++;
			proc();
		}finally{
			qlock--;
			let e = 0;
			while(!qlock && eventQ.length){
				let event = eventQ.pop();
				try{
					event.target.bdNotify(event);
				}catch(_e){
					e = _e;
				}
			}
			if(e){
				// eslint-disable-next-line no-unsafe-finally
				throw(e);
			}
		}
	}

	[pAddMessage](level, message){
		// no duplicates allowed
		// empty message is converted to default message given by ctor
		let levelMessages = this[pMessages][level];
		if(!levelMessages){
			this[pMessages][level] = message;
			return true;
		}else{
			if(Array.isArray(levelMessages)){
				if(levelMessages.indexOf(message) === -1){
					levelMessages.push(message);
					return true;
				}
			}else if(levelMessages !== message){
				this[pMessages][level] = [levelMessages, message];
				return true;
			}
			return false;
		}
	}

	[pDelMessage](level, message){
		let messages = this[pMessages];
		let levelMessages = messages[level];
		if(levelMessages){
			if(Array.isArray(levelMessages)){
				let index = levelMessages.indexOf(message);
				if(index !== -1){
					levelMessages.splice(index, 1);
					if(!levelMessages.length){
						delete messages[level];
					}
					return true;
				}// else no-op
			}else if(levelMessages === message){
				delete messages[level];
				return true;
			}
		}
		return false;
	}
}

//
// VStat - validation status
//
// manages a validation status and associated messages and className
//
export default class VStat extends eventHub(watchHub(Base)) {
	constructor(level, message){
		super();
		this[pMessages] = [];
		if(level === undefined){
			// default ctor
			level = this[pLevel] = this.constructor.MIN_LEVEL;
			this[pMessages][level] = this.constructor.levels[level].message;
		}else if(typeof level === "string"){
			message = level.trim();
			level = this.constructor.MAX_LEVEL;
			this[pLevel] = level = this.constructor.MAX_LEVEL;
			this[pMessages][level] = message || this.constructor.levels[level].message;
		}else if(level instanceof this.constructor){
			// copy constructor
			let src = level;
			this[pLevel] = src[pLevel];
			this[pMessages] = src[pMessages].map(item => Array.isArray(item) ? item.slice() : item);
		}else if(level instanceof Object){
			let src = level;
			let args = "level" in src ? [src.level, src.message] : [src.message];
			src = new this.constructor(...args);
			this[pLevel] = src[pLevel];
			this[pMessages] = src[pMessages];
		}else{
			level = Number(level);
			if(this.constructor.MIN_LEVEL <= level && level <= this.constructor.MAX_LEVEL){
				if(message){
					message = (message + "").trim();
				}
				message = message || this.constructor.levels[level].message;
			}else{
				throw new Error("level must be MIN_LEVEL<=level<=MAX_LEVEL");
			}
			this[pLevel] = level;
			this[pMessages][level] = message;
		}
	}

	get level(){
		return this[pLevel];
	}

	get message(){
		let msg = this[pMessages][this[pLevel]];
		if(!msg){
			return "";
		}else if(Array.isArray(msg)){
			return msg.join("\n");
		}else{
			return msg;
		}
	}

	get className(){
		return this.constructor.levels[this[pLevel]].className;
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
		return this[pLevel] === VALID;
	}

	get isContextInfo(){
		return this[pLevel] === CONTEXT_INFO;
	}

	get isScalarInfo(){
		return this[pLevel] === SCALAR_INFO;
	}

	get isContextWarn(){
		return this[pLevel] === CONTEXT_WARN;
	}

	get isScalarWarn(){
		return this[pLevel] === SCALAR_WARN;
	}

	get isContextError(){
		return this[pLevel] === CONTEXT_ERROR;
	}

	get isScalarError(){
		return this[pLevel] === SCALAR_ERROR;
	}

	get hasValidMessages(){
		return !!this[pMessages][VALID];
	}

	get hasContextInfoMessages(){
		return !!this[pMessages][CONTEXT_INFO];
	}

	get hasScalarInfoMessages(){
		return !!this[pMessages][SCALAR_INFO];
	}

	get hasContextWarnMessages(){
		return !!this[pMessages][CONTEXT_WARN];
	}

	get hasScalarWarnMessages(){
		return !!this[pMessages][SCALAR_WARN];
	}

	get hasContextErrorMessages(){
		return !!this[pMessages][CONTEXT_ERROR];
	}

	get hasScalarErrorMessages(){
		return !!this[pMessages][SCALAR_ERROR];
	}

	getMessages(level, separator){
		let m = this[pMessages][level];
		return !m ? "" : (Array.isArray(m) ? m.join(separator || "\n") : m);
	}

	getMessagesRaw(level){
		// guaranteed to return an array
		let m = this[pMessages] && this[pMessages][level];
		return (Array.isArray(m) ? m : (m ? [m] : [])).slice();
	}



	set(level, message){
		// forces exactly message at level; if message is missing, then the default message is provided
		[level, message] = this[pValidateParams](level, message);
		this[pMutate](() => {
			if(!message){
				message = this.constructor.levels[level].message;
			}
			let current = this[pMessages][level];
			if(Array.isArray(current)){
				current.forEach(msg => {
					if(msg !== message){
						pushQ("messageDel", level, msg, this);
					}
				});
				if(current.indexOf(message) === -1){
					pushQ("messageIns", level, message, this);
				}
				this[pMessages][level] = message;
			}else if(current !== message){
				if(current){
					pushQ("messageDel", level, current, this);
				}
				pushQ("messageIns", level, message, this);
				this[pMessages][level] = message;
			}// else current!==message; therefore, no change
			if(level > this[pLevel]){
				this.bdMutate("level", pLevel, level);
			}// else no level change
		});
	}

	addMessage(level, message){
		[level, message] = this[pValidateParams](level, message);
		if(!message){
			return;
		}
		this[pMutate](() => {
			if(level > this[pLevel]){
				this.set(level, message);
			}else if(this[pAddMessage](level, message)){
				pushQ("messageIns", level, message, this);
			}
		});
	}

	delMessage(level, message){
		[level, message] = this[pValidateParams](level, message);
		if(!message){
			return;
		}
		this[pMutate](() => {
			if(this[pDelMessage](level, message)){
				pushQ("messageDel", level, message, this);
				if(!this[pMessages].some(x => x)){
					// always must have at least this...
					message = this.constructor.levels[VStat.VALID].message;
					this[pMessages][VStat.VALID] = message;
					pushQ("messageIns", VStat.VALID, message, this);
				}
				let maxLevel = this[pMessages].reduce((acc, item, level) => item ? level : acc, VALID);
				if(maxLevel !== this[pLevel]){
					this.bdMutate("level", pLevel, maxLevel);
				}
			}
		});
	}

	static eql(lhs, rhs){
		if(!(lhs instanceof VStat) || !(rhs instanceof VStat)){
			return false;
		}
		if(lhs[pLevel] !== rhs[pLevel]){
			return false;
		}
		let lhsMessages = lhs[pMessages];
		let rhsMessages = rhs[pMessages];
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
		return new VStat(VALID, message);
	}

	static contextInfo(message){
		return new VStat(CONTEXT_INFO, message);
	}

	static scalarInfo(message){
		return new VStat(SCALAR_INFO, message);
	}

	static contextWarn(message){
		return new VStat(CONTEXT_WARN, message);
	}

	static scalarWarn(message){
		return new VStat(SCALAR_WARN, message);
	}

	static contextError(message){
		return new VStat(CONTEXT_ERROR, message);
	}

	static scalarError(message){
		return new VStat(SCALAR_ERROR, message);
	}
}

eqlComparators.set(VStat, VStat.eql);

Object.assign(VStat, {
	MIN_LEVEL: VALID,
	VALID: VALID,
	CONTEXT_INFO: CONTEXT_INFO,
	SCALAR_INFO: SCALAR_INFO,
	CONTEXT_WARN: CONTEXT_WARN,
	SCALAR_WARN: SCALAR_WARN,
	CONTEXT_ERROR: CONTEXT_ERROR,
	SCALAR_ERROR: SCALAR_ERROR,
	MAX_LEVEL: SCALAR_ERROR,

	ERROR_LEVEL: CONTEXT_ERROR,
	SCALAR_ERROR_LEVEL: SCALAR_ERROR,

	// remember: a level *must* have at least one message to stay at that level
	// therefore, define one such default message for each level
	levels: [
		{id: "valid", className: "bd-vStat-valid", message: "valid"},
		{id: "contextInfo", className: "bd-vStat-contextInfo", message: "information in context"},
		{id: "scalarInfo", className: "bd-vStat-scalarInfo", message: "information"},
		{id: "contextWarn", className: "bd-vStat-contextWarn", message: "warning in context"},
		{id: "scalarWarn", className: "bd-vStat-scalarWarn", message: "warning"},
		{id: "contextError", className: "bd-vStat-contextError", message: "error in context"},
		{id: "scalarError", className: "bd-vStat-scalarError", message: "error"}
	],

	// privates...
	pLevel: pLevel,
	pMessages: pMessages,
	pClassName: pClassName,
	pMutate: pMutate,
	pValidateParams: pValidateParams,
	pAddMessage: pAddMessage,
	pDelMessage: pDelMessage
});
