import {Component, e, stopEvent, VStat, setPosit, getPosit, getStyle, getMaxZIndex, defProps, keys} from "../lib.js";
import ListBox from "../listBox/ListBox.js";

let ns = Component.getNamespace();
const pList = ns.get("pList");
const pValue = ns.get("pValue");
const pText = ns.get("pText");
const pVStat = ns.get("pVStat");
const pPlaceholder = ns.get("pPlaceholder");
const pInputNode = ns.get("pInputNode");
const pListBox = ns.get("pListBox");

const pAcceptInput = ns.get("pAcceptInput");
const pDisplayListBox = ns.get("pDisplayListBox");
const pComputeListBoxPosit = ns.get("pComputeListBoxPosit");

const pOnInput = ns.get("pOnInput");
const pOnMouseDown = ns.get("pOnMouseDown");
const pOnKeyDown = ns.get("pOnKeyDown");

const VALUE = 0;
const TEXT = 1;
const SIFTED = 2;

class ComboList extends Array {
	constructor(kwargs){
		super();
		let list = kwargs.list || [];
		if(Array.isArray(list[0])){
			list.forEach(item => this.push([item[VALUE], item[TEXT] + ""]));
		}else{
			list.forEach(item => this.push([item, item + ""]));
		}

		let sift = this._sift = kwargs.sift || (kwargs.noCase && ((s) => s.trim().toLowerCase()));
		if(sift){
			this.forEach(item => (item[SIFTED] = sift(item[TEXT])));
		}

		function lexicalSort(lhs, rhs){
			if(lhs < rhs){
				return -1;
			}else if(lhs > rhs){
				return 1;
			}else{
				return 0;
			}
		}

		let sortFunc = this.sortFunc =
			typeof kwargs.sort === "function" ? kwargs.sort : (kwargs.sort === false ? false : lexicalSort);
		if(sortFunc){
			this.sort(sortFunc);
		}

		if(kwargs.default){
			this._defaultValue = this.geByValue(kwargs.default);
			if(this._defaultValue[0] === undefined){
				throw new Error("default value does not exist in ComboList");
			}
		}

		this._valueEq = kwargs.valueEq;
	}

	sift(text){
		return this._sift ? this._sift(text) : text.trim();
	}

	get defaultValue(){
		return this._defaultValue || this[0][VALUE];
	}

	getByValue(value){
		if(this._valueEq){
			let eq = this._valueEq;
			for(const item of this){
				if(eq(value, item[VALUE])) return item;
			}
		}else{
			for(const item of this){
				if(value === item[VALUE]) return item;
			}
		}
		return [undefined, undefined];
	}

	getByText(text){
		if(this._sift){
			text = this._sift(text.trim());
			for(const item of this){
				if(text === item[SIFTED]) return item;
			}
		}else{
			text = text.trim();
			for(const item of this){
				if(text === item[TEXT]) return item;
			}
		}
		return [undefined, undefined];
	}

	match(text){
		let siftedTarget = this.sift(text);
		let siftedLength = siftedTarget.length;
		if(!siftedLength){
			return false;
		}
		let match = false;
		if(this._sift){
			for(const item of this){
				if(item[SIFTED].substring(0, siftedLength) === siftedTarget){
					match = item;
					break;
				}
			}
		}else{
			for(const item of this){
				if(item[TEXT].substring(0, siftedLength) === siftedTarget){
					match = item;
					break;
				}
			}
		}
		if(match){
			match = {
				value: match[VALUE],
				text: match[TEXT],
				perfect: match[this._sift ? SIFTED : TEXT] === siftedTarget
			};
			if(!match.perfect){
				// figure out what suffix to put on text to make it a perfect match; to understand, how this can be hard, consider SSNs:
				// Let's say the client design considers 123-45-6789 equal to 123456789 (or, even, the "-" could be any non-digit);
				// then, sifted("123-45")===sifted("123-45-")===sifted("123 45")===sifted("123.45")==="12345". Now the problem...
				// What should the suffix hint be for text="123-45" compared to "123-45-" when the actual entry of "123-45-6789" exists?!
				// Notice "123-45", "123-45-", and "123-45-6789" all have the same sifted prefix, namely "12345". For "123-45", we want
				// the hint "-6789" for "123-45-" we want the hint "6789". Here's how we proceed:
				// 1. Note that "123-45" doesn't contain any sifted characters at the end.
				// 2. Note that "123-45-" does contain sifted characters at the end ("-").
				// 3. Note that the sifted prefix "12345" of the matched value ("123-45-6789") does contain sifted characters at the end ("-").
				// THEREFORE
				// * Since [1] doesn't and [3] does, choose to include [3]'s sifted characters in the hint.
				// * Since [2] does and [3] does, prefer to user's meaningless characters and do not include [3]'s sifted characters in the hint

				// find the minimal  match[TEXT] substring which sifted value === siftedTarget
				let i = siftedLength - 1;
				let matchText = match.text;
				while(i < matchText.length){
					if(this.sift(matchText.substring(0, i + 1)) !== siftedTarget){
						break;
					}
					i++;
				}
				// matchText[0..i] is the minimal prefix that matches the  prefix that sifted text gives
				// matchText[i+1..length-1] is the maximal suffix that can be added to text to make a perfect match

				// find any characters after the minimal substring above that are sifted
				let j = i;
				while(j < matchText.length && this.sift(matchText.substring(0, j + 1)) === siftedTarget) j++;
				// [i+1..j] are the characters in matchText that are actually sifted out (meaningless)
				// matchText[j+1..length-1] is the minimal suffix that can be added to text to make a perfect match

				if(j > i){
					// there are characters in matchText that are actually sifted out after prefix that matches sifted(text)
					// are there any such characters in text?
					if(siftedLength < text.length && this.sift(text.substring(0, siftedLength - 1)) === siftedTarget){
						// there is at least one character at the end of text that would be sifted
						// there are actually sifted out (meaningless) at the end of text
						// BOTH text AND matchText have sifted characters between the prefixes that match and the suffixes that don't
						// therefore...do not add matchText's sifted characters to the hint
						match.suffix = matchText.substring(j, matchText.length);
					}else{
						// no meaningless characters at the end of text; therefore give the hint of everything
						match.suffix = matchText.substring(i, matchText.length);
					}
				}else{
					// no meaningless characters at the end of matchText that matches the prefix that text gives
					match.suffix = matchText.substring(i, matchText.length);
				}
			}
		}
		return match;
	}

	getListBoxParams(text){
		let list = this.map(item => item[TEXT]);
		let match = this.match(text);
		return {list: list, focusedItem: match ? match.text : null};
	}
}

ComboList.VALUE = VALUE;
ComboList.TEXT = TEXT;
ComboList.SIFTED = SIFTED;

export default class ComboBox extends Component {
	constructor(kwargs){
		super(kwargs);
		this[pList] = kwargs.list instanceof ComboList ? kwargs.list : new ComboList(kwargs);
		let [value, text, vStat] = this.validateValue("value" in kwargs ? kwargs.value : this[pList].defaultValue);
		this[pValue] = value;
		this[pText] = text;
		this[pVStat] = vStat;
	}

	get closed(){
		// can't use defProps because the value is a calculation
		return this.static || this.kwargs.closed;
	}

	// closed is read-only

	get value(){
		return this[pValue];
	}

	set value(_value){
		let [value, text, vStat] = this.validateValue(_value);
		this.bdMutate("value", pValue, value, "text", pText, text, "vStat", pVStat, vStat);
	}

	get text(){
		return this[pText];
	}

	set text(_text){
		let [value, text, vStat] = this.validateText(_text);
		this.bdMutate("value", pValue, value, "text", pText, text, "vStat", pVStat, vStat);
	}

	// setting vStat directly is not allowed...it's done by clients by setting value/text
	// note, however, this returns a reference to vStat, so the internal state of vStat can be manipulated
	get vStat(){
		return this[pVStat];
	}

	// validateValue, validateText: very much analogous to design in ../input/Input.js; no formatter since we have the list

	validateValue(_value){
		let [value, text] = this[pList].getByValue(_value);
		if(value === undefined){
			if(this.closed){
				throw new Error("illegal value provided for closed combo list");
			}
			return [_value, _value + "", this.closed ? VStat.scalarError() : VStat.valid()];
		}else{
			return [value, text, VStat.valid()];
		}
	}

	validateText(_text){
		let [value, text] = this[pList].getByText(_text);
		if(value === undefined){
			if(this.closed){
				throw new Error("illegal value provided for closed combo list");
			}
			return [_text, _text + "", this.closed ? VStat.scalarError() : VStat.valid()];
		}else{
			return [value, text, VStat.valid()];
		}
	}

	// protected API/overrides...

	bdElements(){
		//
		// 1  div.bd-comboBox.bd-input [bd-disabled] [bd-focused] [bd-hidden] [vStat.className] [empty]
		// 2      Meta (optional)
		// 3      div
		// 4          input -or- div.static
		// 5          div.placeholder
		// 6      div.arrow.icon-caret-down
		//
		//  1. the component root; the tree rooted at [3] is identical to the tree in the same position for Input
		//     therefore we include the class bd-input so the tree uses the same CSS to get a uniform look
		//  2. optional Meta widget; defined by this.kwargs.Meta || this.constructor.Meta
		//  3. identical to the tree in the same position for Input; see Input
		//  6. the drop-down arrow
		//
		// Notice that [2] can be placed above/below/left/right of [3] by making [1] a flex box (row or column, block or inline)
		// and then setting the flex order of [2], [3], and [6]
		return e(
			"div", {
				//className: "bd-comboBox bd-input",
				className: "bd-comboBox",
				bdReflectClass: [
					"vStat", vStat => vStat.className,
					"text", text => (text.length ? "" : "empty")
				],
				bdAdvise: {
					mousedown: pOnMouseDown,
					keydown: pOnKeyDown
				}
			},
			(this.Meta ? e(this.Meta, {bdReflectProp: {vStat: "vStat"}}) : false),
			e("div", {className: "bd-rbox"},
				this.static ?
					e("div", {className: "bd-static", tabIndex: 0, bdReflect: ["text", (s) => s || "&nbsp;"]}) :
					e("input", Object.assign({
						tabIndex: 0,
						bdAttach: pInputNode,
						bdAdvise: {input: pOnInput},
						bdReflectProp: {disabled: "disabled"},
						bdReflect: "text"
					}, (this.inputAttrs || this.kwargs.inputAttrs || this.constructor.inputAttrs))),
				e("div", {className: "placeholder", bdReflect: "placeholder"})
			),
			e("div", {className: "arrow icon-caret-down"})
		);
	}

	// private API/overrides...
	[Component.pOnFocus](){
		super[Component.pOnFocus]();
		if(this.static){
			// no other way to pick a value than from the list; therefore, show it unconditionally
			this[pDisplayListBox]();
		}
	}

	[Component.pOnBlur](){
		super[Component.pOnBlur]();
		if(this[pListBox]){
			this[pListBox].destroy();
			delete this[pListBox];
			this.removeClassName("bd-listBox-visible");
		}
		this[pAcceptInput]();
	}

	[pAcceptInput](){
		if(this[pInputNode]){
			let srcText = this[pInputNode].value;
			let match = this[pList].match(srcText);
			if(match && match.perfect){
				this.bdMutate("value", pValue, match.value, "text", pText, match.text, "vStat", pVStat, VStat.valid());
			}else if(this.closed){
				// don't allow an illegal value...just revert
				this[pInputNode].value = this.text;
			}else{
				// delegate to the text getter to figure out what to do
				this.text = srcText;
			}
			this[pInputNode].setSelectionRange(0, 0);
		}
	}

	[pDisplayListBox](){
		if(this[pListBox]){
			return;
		}
		let posit = this[pComputeListBoxPosit]();
		if(!posit){
			return;
		}
		let text = this[pInputNode] ? this[pInputNode].value : this.text;
		let listBox = this[pListBox] = new this.ListBox(this[pList].getListBoxParams(text));
		listBox.own(listBox.watch("selectedItem", item => {
			if(item !== null){
				this.text = item;
				this[pListBox].destroy();
				delete this[pListBox];
				this.removeClassName("bd-listBox-visible");
			}
		}));
		setPosit(listBox, posit);
		document.body.appendChild(listBox.bdDom.root);
		this.addClassName("bd-listBox-visible");
	}

	[pComputeListBoxPosit](){
		let posit = getPosit(this);
		let h = document.documentElement.clientHeight;
		let w = document.documentElement.clientWidth;
		if(posit.b < 0 || posit.t > h || posit.r < 0 || posit.l > w){
			// this combobox is not visible; therefore, do not display the list box
			return false;
		}

		let result = {z: getMaxZIndex(document.body) + 1, w: Math.round(posit.w - (2 * getStyle(this, "borderWidth")))};
		let spaceBelow = h - posit.b;
		if(spaceBelow < 100 && spaceBelow < posit.t){
			// less than 100px below with more available above; therefore, put the list box above the combo box
			result.b = Math.round(posit.t + 1);
			//result.maxH = result.b;
		}else{
			result.t = Math.round(posit.b - 1);
			//result.maxH = h - result.t;
		}
		let spaceRight = w - posit.r;
		if(posit.l < 100 && spaceRight < posit.l){
			// less than 100px right with more available left; therefore, put the list box left the combo box
			result.r = posit.r;
			result.maxW = result.r;
		}else{
			result.l = posit.l;
			result.maxW = w - result.l;
		}
		return result;
	}

	[pOnKeyDown](e){
		let move = (listBox, direction) => {
			if(listBox){
				listBox[direction]();
				let item = listBox.focusedItem;
				if(item){
					if(this.pInputNode){
						this.pInputNode.value = item;
						this[pOnInput]({});
					}else{
						this.text = item;
					}
				}
			}
		};

		let listBox = this[pListBox];
		switch(e.keyCode){
			case keys.down:
				listBox ? move(listBox, "down") : this[pDisplayListBox]();
				break;
			case keys.up:
				move(listBox, "up");
				break;
			case keys.pageDown:
				move(listBox, "pageDown");
				break;
			case keys.pageUp:
				move(listBox, "pageUp");
				break;
			case keys.enter:
				if(listBox && listBox.focusedItem){
					listBox.selectedItem = listBox.focusedItem;
				}else{
					this[pAcceptInput]();
				}
				break;
			case keys.backspace:{
				let inputNode = this[pInputNode];
				if(inputNode.selectionStart){
					inputNode.value = inputNode.value.substring(0, inputNode.selectionStart - 1);
					this[pOnInput](e);
					break;
				}else{
					return;
				}
			}
			default:
				return;
		}
		stopEvent(e);
	}

	[pOnMouseDown](e){
		if(e.button !== 0){
			return;
		}
		if(!this.hasFocus){
			this.bdDom.tabIndexNode.focus();
		}
		if(e.target === this.bdDom.root.querySelector(".arrow")){
			if(this[pListBox]){
				if(!this.static){
					this[pListBox].destroy();
					delete this[pListBox];
					this.removeClassName("bd-listBox-visible");
				}// else keep static boxes open since that's the only way to edit the value
			}else{
				this[pDisplayListBox]();
			}
			stopEvent(e);
		}
	}

	[pOnInput](e){
		let inputNode = this[pInputNode];
		let srcText = inputNode.value;
		if(inputNode !== document.activeElement){
			// this is unusual, the input node received input but is not the active (focused) element
			this.text = srcText;
			return;
		}
		let match = this[pList].match(srcText);
		if(match){
			let matchText = match.text;
			if(!match.perfect){
				inputNode.value = srcText + match.suffix;
				inputNode.setSelectionRange(srcText.length, inputNode.value.length);
			}
			if(this[pListBox]){
				this[pListBox].focusedItem = matchText;
				if(!this[pListBox].isInView(matchText)){
					this[pListBox].scrollToItem(matchText, "top");
				}
			}
		}else if(this[pListBox]){
			this[pListBox].focusedItem = null;
		}
		this.bdNotify(e);
	}
}

// shut up eslint _and_ prove the variable exists before using it in a macro
pPlaceholder;

eval(defProps("ComboBox", [
	["ro", "ListBox"],
	["ro", "Meta"],
	["ro", "default"],
	["ro", "static"],
	["ro", "sift"],
	["ro", "noCase"],
	["ro", "sort"],
	["rw", "placeholder", "pPlaceholder"]
]));

ns.publish(ComboBox, {
		List: ComboList,
		ListBox: class ComboListBox extends ListBox {
			constructor(kwargs){
				kwargs = Object.assign({tabIndex: "", className: "bd-for-combo"}, kwargs);
				super(kwargs);
				this.render();
			}
		},
		Meta: false,
		static: false,
		sift: false,
		noCase: true,
		errorValue: Symbol("error"),
		inputAttrs: {type: "text"},
		placeholder: " enter value ",
		watchables: ["value", "text", "vStat", "placeholder"],
		events: ["input"]
	}
);
