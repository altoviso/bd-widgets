# ReactComponent

A thin container for a React component which provides access to the contained component's props and state.

### Construction
In addition to superclass constructor arguments, the following keyword arguments are available during construction.

#### ```component [React-component, immutable]```
Provides the React component class to create upon rendering.

#### ```props [Object, mutable]```
Provides the initial value for ```props``` for the contained React component. Defaults to ```{}```.

#### Example

Import the widget:

    import ReactComponent from "<path-to>/ReactComponent.js";


In the example below, Select is assumed to be the  React Component  [react-select](https://github.com/JedWatson/react-select) imported in the main document by a bunch of `````<script>````` elements and a `````<link>````` like this:

    <script src="https://unpkg.com/react@15.6.1/dist/react.js"></script>
    <script src="https://unpkg.com/react-dom@15.6.1/dist/react-dom.js"></script>
    <script src="https://unpkg.com/prop-types@15.5.10/prop-types.js"></script>
    <script src="https://unpkg.com/classnames@2.2.5/index.js"></script>
    <script src="https://unpkg.com/react-input-autosize@2.0.0/dist/react-input-autosize.js"></script>
    <script src="https://unpkg.com/react-select@1.2.1/dist/react-select.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/react-select@1.2.1/dist/react-select.css">

This is just one simple way to do it. Any method that ensures the target React Component class is defined to the ReactComponent constructor is acceptable.

And finally, here is an example Backdraft component class that contains a react-select component instance:

    class DemoContainerForReactComponent extends Component {
        onChange(e){
            console.log("react-select onChange:", e.value);
            this.theSelect.props = {value: e.value};
        }
    
        _elements(){
            return e("div", e(ReactComponent, {
                component: Select,
                props: {
                    onChange: this.onChange.bind(this),
                    options: [
                        {value: 'chocolate', label: 'Chocolate'},
                        {value: 'strawberry', label: 'Strawberry'},
                        {value: 'vanilla', label: 'Vanilla'}
                    ]
                },
                [e.attach]: "theSelect"
            }));
        }
    }

### Superclass

ReactComponent derives from Backdraft [Component](http://backdraftjs.org/ref/component.html). While the entirety of Backdraft's Component API is available, it applies to the ```div``` containing the React component, and, therefore, probably has no affect. For example, although setting ```enabled``` to ```false``` *will* add the CSS class ```bd-disabled``` the the ```div``` containing the React component, it won't have any affect on the contained React component. The contained React component can be controlled by the ```props``` setter and the ```setState()``` method.

### Public API

#### immutable properties

```ref```

When rendered, provides a reference to the contained React component instance; false otherwise.

#### mutable properties
 ```props```
 
 Setting ```props``` shallow-merges the previous value of ```props ``` with the provided value. If the instance is rendered, then a React (re)render is executed with the new properties.
 
#### methods
```setState(updater, callback)```

If the instance is rendered, then causes React ```Component::setState(updater, callback)``` to be applied to the contained React component.

### Structure

A ```div``` is created to contain the React Component.

### Styling

None; see the contained component's capabilities.


