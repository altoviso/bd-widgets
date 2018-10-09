export * from "./bd-core.js";
export {default as VStat} from "./VStat.js";
export {default as keys} from "./keys.js";

// We use macros in this library! Hopefully...eventually...JavaScript will have what lisp has had for 50 years!

// For those who think this is dangerous, notice that the only time code from one of these functions is actually eval'd is
// is after applying said function in our own code. Therefore, we completely control the output code by completely controlling
// the input. Put another way: the only way to make these macro generators do something wrong is to change the code that
// calls them. Of course eval is not any more "dangerous" than changing executing code.

function defReadOnly(name){
	return `
	get(){
		return "${name}" in this.kwargs ?
				this.kwargs.${name} :
				this.constructor.${name};
	}`;
}

function defReadOnlyWithPrivate(name, pName){
	return `
	get(){
		return "${pName}" in this ?
			this.${pName} :
			("${name}" in this.kwargs ?
				this.kwargs.${name} :
				this.constructor.${name});
	}`;
}

function defSetter(name, pName){
	return `
	set(value){
		if(this.${name}!==value){
			this.bdMutate("${name}", "${pName}", value);
		}
	}`;
}

function defMutable(name, pName){
	return defReadOnlyWithPrivate(name, pName)+ ","+ defSetter(name, pName);
}

export function defProps(theClass, props){
	let propsDefExpr = props.map(prop => {
		let [type, name, pName] = prop;
		let macro;
		if(type=="rw"){
			macro = defMutable;
		}else{
			macro = pName ? defReadOnlyWithPrivate : defReadOnly;
		}
		let getterSetterExpr = macro(name, pName);
		return `"${name}":{${getterSetterExpr}}`;
	}).join(",\n");
	let code = `(Object.defineProperties(${theClass}.prototype, {
	${propsDefExpr}
}))`;
	return code;
}

