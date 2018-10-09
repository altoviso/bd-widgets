import {Component} from "../lib.js";

function wrappedComponent(reactClass){
	return class extends React.Component {
		constructor(props){
			super();
			this.state = props;
		}

		bdSetRef(ref){
			this.ref = ref;
		}

		bdSetRefState(updater, callback){
			this.ref.setState(updater, callback);
		}

		render(){
			return React.createElement(reactClass, Object.assign({}, this.state, {ref: this.bdSetRef.bind(this)}));
		}

		componentWillUnmount(){
			delete this.ref;
		}
	}
}

export default class ReactComponent extends Component {
	constructor(kwargs){
		super(kwargs);
		this._props = kwargs.props || {};
	}

	render(
		proc // [function, optional] called after this class's render work is done, called in context of this
	){
		super.render();
		this._dom.reactComponent = ReactDOM.render(
			React.createElement(wrappedComponent(this.kwargs.component), this._props),
			this._dom.root
		);
		proc && proc();
	}

	unrender(){
		ReactDOM.unmountComponentAtNode(this._dom.root);
		super.unrender();
	}

	get ref(){
		return this.rendered && this._dom.reactComponent;
	}

	// props aren't watchable because a deep === would need to be executed to determine if a mutation occurred
	// and this doesn't seem worth the effort when props are _never_ changed internally, but rather only
	// by an external client. If you really need to watch props, then either watch the code that causes the external
	// client(s) to mutate props _or_ extend this class

	get props(){
		return this._props;
	}

	set props(
		value // [object] new props for contained react component
	){
		Object.assign(this._props, value);
		if(this.rendered){
			this._dom.reactComponent.setState(this._props);
		}
	}

	setState(updater, callback){
		if(this.rendered){
			this._dom.reactComponent.bdSetRefState(updater, callback);
		}
	}
}