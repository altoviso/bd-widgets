# StateButton

A stylable state button component with a label and/or mark and customizable value mapping. Clicking the button or key-pressing a space when the button has the focus causes the value property to cycle through the values given by the states; cycling past the last state resets the state to the first state. Two- and three-state checkbox and radio button subclasses are provided.

### Construction
In addition to superclass constructor arguments, the following keyword arguments are available during construction.

#### ```states [array of Object]```
Each element in the array must be an Object with properties as follows (all properties are optional, other properties are ignored):
* ```value [any]```
* ```className [string```
* ```label [string]```
* ```mark [string]```

Instructs the sequence of state values and their associated display information. Upon setting a particular value, the associated ```label``` (if any) and associated ```mark``` (if any) are displayed and the associated ```className``` is added to the instance's ```className``` after removing the previous value's ```className```. For each state, if ```value``` is not provided, then it defaults to the index of the state; if ```className``` is not provided, then it defaults to the string ```"state-" + <index-of-the-state>```; ```label``` and ```mark``` default to ```""```.

#### ```values [array or any]```
Equivalent to providing a ```states``` value of ```value.map(v=>({value:v, mark:v+""}))```

####```value [optional, and]```
The initial value of the ```value``` property. If provided, it must be ```===``` to a ```value``` in ```states```; not providing a value or providing an invalid value causes ```value``` to be initialized to ```states[0].value```.

#### Superclass Notes
* If a particular state does not provide a ```label``` property and an instance ```label``` property (a string) *is* provided, then that instance-level label value is displayed upon selection of that state. This can be used to, e.g., place a single label next to a button that displays state changes via the ```mark``` property only.

* Although the ```handler``` (if any) is applied as in the superclass, it provides no value information. Usually, clients should connect a watch handler to the ```value``` property.

#### Examples

```
import Button from "<path-to>/StateButton.js";

e(StateButton, {
    label: "State: ", // optional
    value: 456, // optional
    states: [{value: 123, mark: "A"}, {value: 456, mark: "B"} , {value: 789, mark: "C"}], // required
    tabIndex: tabIndex++,
    [e.watch]: {"value": myHandler}
})

// for the states below, the values default to [0, 1, 2] 
e(StateButton, {
    states: [{mark: "A"}, {mark: "B"} , {mark: "C"}]
})

// for the states below, the values default to [0, 1, 2, ... 5] 
e(StateButton, {
    states: [..."ABCDEF"].map(c => ({mark: c})),
})

// equivalent to states:[{value:"U", mark:"U"},... ]
e(StateButton, {
    values: [..."UVWXYZ"]
})

```

#### Built-in Subclasses
```StateButton``` provides the following built-in subclasses:

##### StateButton.Checkbox
A two- or three-state checkbox (a rectangular box with/without a check mark). For two states, the states are...
* ```false``` displays an box without a check mark
* ```true``` displays an box with a check mark

To specify a three-state checkbox, provide a truthy value for the keyword argument ```nullable``` at construction. Optionally, any value may be provided for the keyword argument ```nullValue``` at construction when a truthy ```nullable``` is provided; ```nullValue``` is ignored if ```nullable``` is falsey. Neither ```nullable``` or ```nullable``` are mutable after construction. For the three states, the states are...
* ```<nullValue>``` displays an box with a "?"
* ```false``` displays an box without a check mark
* ```true``` displays an box with a check mark

##### Examples
```
import Button from "<path-to>/StateButton.js";

// two-state with default values and marks
e(StateButton.Checkbox, {
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
})

// two-state with default values and marks, explicit initial value
e(StateButton.Checkbox, {
    value: true,
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
})

// three-state with default values and marks
e(StateButton.Checkbox, {
    nullable: true,
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
}

// two-state with explicit values and default marks
e(StateButton.Checkbox, {
    values: ["A", "B"],
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
}

// three-state with explicit values and default marks
e(StateButton.Checkbox, {
    nullable: true,
    values: ["A", "B", "C"],
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
}

// two-state with explicit values and marks
e(StateButton.Checkbox, {
    states: [{value: false, mark: "F"}, {value: true, mark: "T"}],
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
}

// three-state with explicit values and marks
e(StateButton.Checkbox, {
    states: [{value: null, mark: "?"}, {value: false, mark: "F"}, {value: true, mark: "T"}],
    nullable: true,
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
}
```

##### StateButton.RadioButton
A two- or three-state radio button is provided exactly as in ```StateButton.Checkbox```, above except that the output is modified as follows:
* ```<nullValue>``` displays an unchecked radio button in different color
* ```false``` displays an unchecked radio button
* ```true``` displays an checked radio button

##### Examples
```
import Button from "<path-to>/StateButton.js";

// two-state with default values and marks
e(StateButton.RadioButton, {
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
})

// two-state with default values and marks, explicit initial value
e(StateButton.RadioButton, {
    value: true,
    tabIndex: tabIndex++,
    [e.watch]: {"value": showValueChange}
})

// all of the examples above for StateButton.Checkbox work for StateButton.RadioButton
```


### Superclass

Button derives from Button.

### Public API

#### mutable, watchable properties
 ```value```
 
 ```enabled```
 
 ```label```

#### mutable properties
 ```handler```
 
#### methods
```reset(statesOrValues, value)```

```statesOrValues```  either an array of new states or new values as per constructor keyword arguments requirements for ```states``` and ```values```, respectively.

```value```, optional, as per constructor keyword argument ```value```.

Resets the states and value of the instance.

#### events
```click```

signaled when the button is clicked/pressed; the raw DOM event object is provided

### Structure
```
<div className="bd-state-button">
    <div>
        <div>label-content</div>
        <div>mark-content</div>
    </div>
</div>
```
### Styling

[Less](http://lesscss.org/) is used to express all CSS. StateButton's CSS is described in less/state-button-vars.less and less/state-button.less. Most common styling can be accomplished by editing/replacing less/state-button-vars.less.


