# Button

A stylable button component with a mutable label and easy-to-connect handler. Clicking the button or key-pressing a space when the button has the focus causes the handler to be applied and the ```click``` event to be signaled.

### Construction
In addition to superclass constructor arguments, the following keyword arguments are available during construction.

#### ```label [string, mutable, watchable]```
sets the inner contents of the label node; defaults to ""

#### ```handler [function, mutable]```
applied when button is clicked/pressed

#### ```enabled [boolean, mutable, watchable]```
 enable/disable the button; defaults to enable

#### Examples
```
import Button from "<path-to>/Button.js";

// a simple button with the label "OK"
e(Button, {label: "OK", handler: myOkHandler})

// as above with a simple tooltip
e(Button, {label: "OK", title: "click me!", handler: myOkHandler})

// as above, but now in the tab sequence
e(Button, {label: "OK", tabIndex: 1, handler: myOkHandler})

// start it out as disabled
e(Button, {label: "OK", tabIndex: 1, enabled: false, handler: myOkHandler})

// another way to set up a handler
e(Button, {label: "OK", [e.advise]: {click::myOkHandler}})

// a button with an image (a floppy disk in the demo) instead of a label
e(Button, {className: "icon-", label: "\u{e904}", handler: myOkHandler})
```

### Superclass

Button derives from Backdraft [Component](http://backdraftjs.org/ref/component.html).

### Public API

#### mutable, watchable properties
 ```label```
 
 ```enabled```

#### mutable properties
 ```handler```
 
#### events
```click```

signaled when the button is clicked/pressed; the raw DOM event object is provided

### Structure

The button is comprised if a div nested in a div; the inner div holds the label.

### Styling

[Less](http://lesscss.org/) is used to express all CSSS. Button's CSS is described in less/button-vars.less and less/button.less. Most common styling can be accomplished by editing/replacing less/button-vars.less.


