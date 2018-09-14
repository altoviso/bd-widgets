import {Component, e, connect, getPosit, setStyle, stopEvent, defProps, keys} from "../lib.js";

let ns = Component.getNamespace();

// private data
const pFocusedItem = ns.get("pFocusedItem");
const pSelectedItem = ns.get("pSelectedItem");
const pMouseOverItem = ns.get("pMouseOverItem");
const pList = ns.get("pList");
const pMap = ns.get("pMap");
const pUpArrow = ns.get("pUpArrow");
const pDownArrow = ns.get("pDownArrow");
const pItemAttachPoint = ns.get("pItemAttachPoint");
const pMoreBeforePromise = ns.get("pMoreBeforePromise");
const pMoreAfterPromise = ns.get("pMoreAfterPromise");
// eslint-disable-next-line no-unused-vars
const pNoItemsMessage = ns.get("pNoItemsMessage");
// eslint-disable-next-line no-unused-vars
const pSelectable = ns.get("pSelectable");

// private methods
const pConditionList = ns.get("pConditionList");
const pInsChild = ns.get("pInsChild");
const pRenderList = ns.get("pRenderList");
const pUnrenderList = ns.get("pUnrenderList");
const pItemFromNode = ns.get("pItemFromNode");

// private events
const pOnMouseDown = ns.get("pOnMouseDown");
const pOnKeyDown = ns.get("pOnKeyDown");
const pOnClickArrow = ns.get("pOnClickArrow");
const pOnMouseOver = ns.get("pOnMouseOver");

// properties that ListBox adds to item Components
// since these components may not be owned by listBox, it is important listBox not pollute their namespace
const pListBoxCreated = ns.get("pListBoxCreated");
const pItem = ns.get("pItem");

function twiddleClass(className, item, oldItem){
	let index = this[pMap].get(oldItem);
	if(index !== undefined){
		this.children[index].removeClassName(className);
	}
	index = this[pMap].get(item);
	if(index !== undefined){
		this.children[index].addClassName(className);
	}
}

export default class ListBox extends Component {
	constructor(kwargs){
		super(kwargs);
		this[pList] = [];
		this[pMap] = new Map();
		this.setList(kwargs.list, kwargs.selectedItem, kwargs.focusedItem);
	}

	setList(list, selectedItem, focusedItem){
		this.focusedItem = null;
		this.selectedItem = null;
		this.bdMutate("mouseOverItem", pMouseOverItem, null);
		this[pUnrenderList]();

		list = this[pList] = this[pConditionList](list);
		selectedItem = this[pMap].has(selectedItem) ? selectedItem : null;
		focusedItem = this[pMap].has(focusedItem) ? focusedItem : selectedItem || (list.length ? list[0] : null);
		this[list.length ? "removeClassName" : "addClassName"]("no-data");
		this.rendered && this[pRenderList]();
		this.selectedItem = selectedItem;
		this.focusedItem = focusedItem;
	}

	splice(start, deleteCount, insertItems){
		// note: unlike Array.splice, insertItems is _always_ an array of zero to many items to insert at start

		// juggle for optional deleteCount
		if(Array.isArray(deleteCount)){
			insertItems = deleteCount;
			deleteCount = 0;
		}

		// start===-1 is sugar for this[pList].length
		let list = this[pList];
		if(start === -1){
			start = list.length;
		}

		// check args; don' to anything is args irrational
		if(start < 0 || list.length < start){
			throw new Error("start must be in [0..list.length] (start===-1 implies list.length) in ListBox::splice");
		}
		if(deleteCount && start + deleteCount > list.length){
			throw new Error("trying to delete items that don't exist in ListBox::splice");
		}

		let children = this.children;
		let childrenStart = this[pUpArrow] ? start + 1 : start;
		for(let count = 0; count < deleteCount; count++){
			let item = list[start];
			if(item === this[pSelectedItem]){
				this.selectedItem = null;
			}
			if(item === this[pFocusedItem]){
				this.focusedItem = null;
			}
			list.splice(start, 1);
			if(children){
				let child = children[childrenStart];
				delete child[pItem];
				super.delChild(child, !child[pListBoxCreated]);
			}
		}

		if(insertItems){
			let itemComponentType = this.kwargs.itemComponentType || this.constructor.itemComponentType;
			let ref, posit;
			if(children){
				if(children && children[childrenStart]){
					ref = children[childrenStart].bdDom.root;
					posit = "before";
				}else{
					ref = this[pItemAttachPoint];
					posit = "last";
				}
			}
			insertItems.map((item, i) => {
				list.splice(start + i, 0, item);
				if(children){
					let child = this[pInsChild](item, ref, posit, itemComponentType);
					children.pop();
					children.splice(childrenStart + i, 0, child);
				}
			});

		}

		let itemMap = this[pMap];
		itemMap.clear();
		children.forEach((child, i) => itemMap.set(child[pItem], i));

		if(list.length){
			this.removeClassName("no-data");
			let focusIndex = start < list.length ? start : list.length - 1;
			this.focusedItem = children[this[pUpArrow] ? ++focusIndex : focusIndex][pItem];
			if(!this.isInView(this.focusedItem)){
				this.scrollToItem(this.focusedItem, "top");
			}
		}else{
			this.addClassName("no-data");
		}
	}

	get selectedItem(){
		return this[pSelectedItem];
	}

	set selectedItem(target){
		if(this.selectable){
			this.bdMutate("selectedItem", pSelectedItem, this[pMap].has(target) ? target : null);
		}else{
			throw new Error("can't select item in ListBox that was created with selectable false");
		}
	}

	get focusedItem(){
		let focusedItem = this[pFocusedItem];
		return focusedItem === this[pUpArrow] || focusedItem === this[pDownArrow] ? null : focusedItem;
	}

	set focusedItem(target){
		let oldValue = this[pFocusedItem];
		let normalizedOldValue = this.focusedItem;
		let newValue = this[pFocusedItem] = this[pMap].has(target) ? target : null;
		let normalizedNewValue = this.focusedItem;
		if(normalizedOldValue !== normalizedNewValue){
			this.bdMutateNotify("focusedItem", normalizedOldValue, normalizedNewValue);
		}
		if(this.rendered && oldValue !== newValue){
			twiddleClass.call(this, "focusedItem", newValue, oldValue);
		}
	}

	get mouseOverItem(){
		return this[pMouseOverItem];
	}

	// illegal to set mouseOverItem

	scrollToItem(item, location){
		let root = this.bdDom.root;
		let scrollHeight = root.scrollHeight;
		let scrollTop = root.scrollTop;
		if(scrollHeight <= root.clientHeight){
			//everything is visible; therefore nothing to scroll
			root.scrollTop = 0;
			return;
		}

		let delta, newScrollTop;
		let children = this.children;
		let posit = getPosit(root);
		let targetPosit = getPosit(children.byItem(item));
		delta = location === "top" ? targetPosit.t - posit.t : targetPosit.b - posit.b;
		delta = Math.min(Math.max(-scrollTop, delta), scrollHeight - scrollTop - posit.h);
		newScrollTop = scrollTop + delta;

		// delta = Math.min(delta, getPosit(children[children.length - 1]).b - posit.b);
		// newScrollTop = Math.min(scrollHeight - posit.h + 1, Math.max(0, scrollTop + delta));

		if(scrollTop !== newScrollTop){
			// eslint-disable-next-line no-undef
			anime({
				targets: root,
				scrollTop: newScrollTop,
				duration: 300,
				easing: "easeOutQuad"
			});
			this.bdMutate("mouseOverItem", pMouseOverItem, null);
			return Math.abs(delta) > 1;
		}else{
			return false;
		}
	}

	down(){
		if(!this.rendered || !this.children || !this[pList].length) return;
		if(this[pFocusedItem] === this[pList].last){
			if(this[pDownArrow]){
				if(this.scrollToItem(this[pDownArrow], "bottom")){
					// the bottom arrow was out of view, so don't get more items
				}else{
					// the top arrow was already in view, so get more items
					this[pOnClickArrow]({}, "down");
				}
			}// else, already at the top; nothing to do
			return;
		}else{
			let index = this[pMap].get(this[pFocusedItem]);
			if(index !== undefined){
				// if the up arrow exists, then the map indexes are +1 of the list indexes
				this[pUpArrow] && (--index);
				this.focusedItem = this[pList][Math.min(index + 1, this[pList].length - 1)];
			}else{
				this.focusedItem = this[pList][0];
			}
		}
		if(!this.isInView(this[pFocusedItem])){
			this.scrollToItem(this[pFocusedItem], "bottom");
		}
	}

	up(){
		if(!this.rendered || !this.children) return;
		if(this[pFocusedItem] === this[pList][0]){
			if(this[pUpArrow]){
				if(this.scrollToItem(this[pUpArrow], "top")){
					// the top arrow was out of view, so don't get more items
				}else{
					// the top arrow was already in view, so get more items
					this[pOnClickArrow]({}, "up");
				}
			}// else, already at the top; nothing to do
			return;
		}else{
			let index = this[pMap].get(this[pFocusedItem]);
			if(index !== undefined){
				// if the up arrow exists, then the map indexes are +1 of the list indexes
				this[pUpArrow] && (--index);
				this.focusedItem = this[pList][Math.max(index - 1, 0)];
			}else{
				this.focusedItem = this[pList][this[pList].length - 1];
			}
		}
		if(!this.isInView(this[pFocusedItem])){
			this.scrollToItem(this[pFocusedItem], "top");
		}
	}

	pageDown(){
		if(!this.rendered || !this.children) return;
		let posit = getPosit(this);
		let newTopChild;
		for(const child of this.children){
			let childPosit = getPosit(child);
			if(childPosit.b > posit.b) break;
			newTopChild = child;
		}
		let newTopItem = newTopChild[pItem];
		if(this.scrollToItem(newTopItem, "top")){
			this.focusedItem = newTopItem;
		}else{
			this.focusedItem = this[pList].last;
		}
	}

	pageUp(){
		if(!this.rendered || !this.children) return;
		let posit = getPosit(this);
		let newBottomChild;
		for(let i = this.children.length - 1; i >= 0; i--){
			let child = this.children[i];
			let childPosit = getPosit(child);
			if(childPosit.t < posit.t) break;
			newBottomChild = child;
		}
		let newBottomItem = newBottomChild[pItem];
		if(this.scrollToItem(newBottomItem, "bottom")){
			this.focusedItem = newBottomItem;
		}else{
			this.focusedItem = this[pList][0];
		}
	}

	isInView(item){
		let posit = getPosit(this.bdDom.root);
		let targetPosit = getPosit(this.children.byItem(item));
		let result = posit.t <= targetPosit.t && targetPosit.b <= posit.b;
		return result;
	}

	// public overrides...

	insChild(){
		throw new Error("insChild is private in ListBox");
	}

	delChild(){
		throw new Error("delChild is private in ListBox");
	}

	render(proc){
		return super.render(() => {
			this[pRenderList]();
			twiddleClass.call(this, "selectedItem", this[pSelectedItem], null);
			twiddleClass.call(this, "focusedItem", this[pFocusedItem], null);
			this[pMouseOverItem] = null;
			this.ownWhileRendered(
				this.watch("selectedItem", twiddleClass.bind(this, "selectedItem")),
				this.watch("mouseOverItem", twiddleClass.bind(this, "mouseOverItem"))
			);
			proc && proc();
		});
	}

	unrender(){
		this[pUnrenderList]();
		super.unrender();
	}

	// protected methods...

	bdElements(){
		//
		// 1  div.bd-listBox [bd-disabled] [bd-focused] [bd-hidden]
		// 2      div
		// 3          div.up-arrow
		// 4          div
		// 5          div.down-arrow
		// 6      div.no-items
		//
		// [1] Component root with Component's capabilities
		// [2, 6] one of [2] or [6] is visible depending on whether or not there are items in the list
		// [3, 5] are visible only if the list is dynamic
		// [4] holds items
		//
		return e("div", {
				className: "bd-listBox unselectable",
				tabIndex: 0,
				bdAdvise: {keydown: pOnKeyDown, mousedown: pOnMouseDown, mouseover: pOnMouseOver}
			},
			e("div",
				e("div", {className: "items", bdAttach: pItemAttachPoint}),
			),
			e("div", {className: "no-items", bdReflect: "noItemsMessage"})
		);
	}

	bdAttachToDoc(attach){
		if(super.bdAttachToDoc(attach)){
			if(attach && this[pFocusedItem]){
				this.scrollToItem(this[pFocusedItem], "top");
			}
			return true;
		}
		return false;
	}

	// private API...

	[pInsChild](item, ref, posit, itemComponentType){
		let child;
		if(item instanceof Component){
			child = item;
			if(child.parent){
				child.parent.delChild(child, true);
			}
			// child[pListBoxCreated] remains undefined
		}else{
			child = new itemComponentType(item);
			child[pListBoxCreated] = true;
		}
		child[pItem] = item;
		child.render();
		Component.insertNode(child.bdDom.root, ref, posit);
		this.bdAdopt(child);
		return child;
	}

	[pConditionList](list){
		// this guarantees that list is a *private*, *array* with getter for "last"; initializes pMap
		let result;
		if(!list){
			result = [];
		}else if(!Array.isArray(list)){
			throw new Error("a list provided to ListBox must be an array or false");
		}else if(!list.length){
			result = [];
		}else{
			result = list.slice();
		}

		let map = this[pMap];
		let offset = this.kwargs.get ? 1 : 0;
		map.clear();
		result.forEach((item, i) => map.set(item, i + offset));

		Object.defineProperty(result, "last", {
			get(){
				return this.length ? this[this.length - 1] : undefined;
			}
		});

		return result;
	}

	[pRenderList](){
		this.children = [];
		this.children.byItem = (item) => {
			return this.children[this[pMap].get(item)];
		};

		let itemComponentType = this.kwargs.itemComponentType || this.constructor.itemComponentType;
		let arrowComponent = this.kwargs.arrowComponent || this.constructor.arrowComponent;
		let createArrow = (direction) => {
			let arrow = new arrowComponent({direction: direction});
			arrow[pItem] = arrow;
			arrow[pListBoxCreated] = true;
			arrow.render();
			Component.insertNode(arrow.bdDom.root, this[pItemAttachPoint], direction === "up" ? "first" : "last");
			this[pMap].set(arrow, this.children.length);
			this.bdAdopt(arrow);
			return arrow;
		};
		this.kwargs.get && (this[pUpArrow] = createArrow("up"));
		this[pList].forEach((item) => this[pInsChild](item, this[pItemAttachPoint], "last", itemComponentType));
		this.kwargs.get && (this[pDownArrow] = createArrow("down"));
	}

	[pUnrenderList](){
		if(this.children) for(const child of this.children.slice()){
			delete child[pItem];
			super.delChild(child, !child[pListBoxCreated]);
		}
		delete this[pUpArrow];
		delete this[pDownArrow];
	}

	[pItemFromNode](node){
		let itemAttachPoint = this[pItemAttachPoint];
		while(node){
			if(node.parentNode === itemAttachPoint){
				let item = Component.get(node)[pItem];
				return item === this[pUpArrow] || item === this[pDownArrow] ? null : item;
			}
			node = node.parentNode;
		}
		return null;
	}

	[Component.pOnFocus](){
		super[Component.pOnFocus]();
		if(!this[pFocusedItem] && this[pList].length){
			this.focusedItem = this[pList][0];
		}
	}

	[pOnKeyDown](e){
		switch(e.keyCode){
			case keys.down:
				this.down();
				break;
			case keys.up:
				this.up();
				break;
			case keys.pageDown:
				this.pageDown();
				break;
			case keys.pageUp:
				this.pageUp();
				break;
			case keys.enter:
				if(this.focusedItem && this.selectable){
					this.selectedItem = this.focusedItem === this.selectedItem ? null : this.focusedItem;
				}
				break;
			default:
				return;
		}
		stopEvent(e);
	}

	[pOnMouseDown](e){
		stopEvent(e);
		if(e.button !== 0){
			return;
		}
		if(this.kwargs.multiSelect){
			// TODO: RFE
		}else{
			let item = this[pItemFromNode](e.target);
			if(item){
				this.focusedItem = item;
				if(this.selectable){
					this.selectedItem = item === this.selectedItem ? null : item;
				}
			}
		}
	}

	[pOnClickArrow](e, direction){
		stopEvent(e);
		this.focusedItem = direction === "up" ? this[pUpArrow] : this[pDownArrow];
		if(this.kwargs.get){
			let up = direction === "up";
			if((up && this[pMoreBeforePromise]) || (!up && this[pMoreAfterPromise])){
				// already waiting for data...
				return;
			}
			let ref = up ? pMoreBeforePromise : pMoreAfterPromise;
			let p = this[ref] = this.kwargs.get(up ? "before" : "after");
			let className = up ? "query-before" : "query-after";
			this.addClassName(className);
			p.then(newItems => {
				delete this[ref];
				this.removeClassName(className);
				if(newItems && newItems.length){
					this.splice(up ? 0 : -1, 0, newItems);
					if(!up){
						this.focusedItem = this[pList].last;
						this.scrollToItem(this[pDownArrow], "bottom");
					}
				}
			});
		}// else ignore
	}

	[pOnMouseOver](e){
		this.bdMutate("mouseOverItem", pMouseOverItem, this[pItemFromNode](e.target));
		let h1 = connect(this.bdDom.root, "mousemove", (e) => {
			this.bdMutate("mouseOverItem", pMouseOverItem, this[pItemFromNode](e.target));
		});
		let h2 = connect(this.bdDom.root, "mouseleave", () => {
			this.bdMutate("mouseOverItem", pMouseOverItem, null);
			h1.destroy();
			h2.destroy();
		});
	}
}

eval(defProps("ListBox", [
	["ro", "selectable"],
	["rw", "noItemsMessage", "pNoItemsMessage"]
]));

ns.publish(ListBox, {
	noItemsMessage: "no items",
	selectable: true,
	itemComponentType: class extends Component {
		constructor(item){
			let kwargs = {text: item + ""};
			super(kwargs);
		}

		bdElements(){
			return e("div", this.kwargs.text);
		}
	},
	arrowComponent: class extends Component {
		constructor(kwargs){
			super(kwargs);
			this.addClassName(kwargs.direction === "up" ? "up-arrow icon-caret-up" : "down-arrow icon-caret-down");
		}

		bdElements(){
			return e("div", {bdAdvise: {click: (e) => this.parent[pOnClickArrow](e, this.kwargs.direction)}});
		}
	},
	watchables: ["focusedItem", "selectedItem", "mouseOverItem", "noItemsMessage"]
});
