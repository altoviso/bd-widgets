# bd-widgets
## a library of user interface widgets built with Backdraft

This library contains a number of UI widgets built exclusively with Backdraft. It is a work in progress...mostly the consequence of pulling out special-purpose widgets that were constructed in other projects and enhancing them to be general purpose widgets. Currently, this library is set for its first complete release before end of 2018.

All that said, this project is a great example of how quick and easy it is to construct UI components with Backdraft!

### Installation

```
$ npm install bd-core
$ npm install bd-widgets
```

Note that bd-core must be installed as a sibling to bd-widgets.

A small [Express server](https://github.com/altoviso/bd-widgets/blob/master/httpServer.js) is included to serve the project root so the examples can be run. To start this server:

```
$ npm run server
```

It will automatically open a top-level test page, typically:
```
http://localhost:3002/bd-widgets/node_modules/bd-smoke/browser-runner.html
```
## Website

Backdraft is extensively documented at [backdraftjs.org](https://backdraftjs.org).


### Contents

#### Button
A stylable button component with a mutable label and easy-to-connect handler. Clicking the button or key-pressing a space when the button has the focus causes the handler to be applied and the click event to be signaled.


source: [```src/button/Button.js```](https://github.com/altoviso/bd-widgets/blob/master/src/button/Button.js)

docs: [```src/button/button.md```](https://github.com/altoviso/bd-widgets/blob/master/src/button/button.md)

#### StateButton
A stylable state button component with a label and/or mark and customizable value mapping. Clicking the button or key-pressing a space when the button has the focus causes the value property to cycle through the values given by the states; cycling past the last state resets the state to the first state. Two- and three-state checkbox and radio button subclasses are provided.


source: [```src/stateButton/StateButton.js```](https://github.com/altoviso/bd-widgets/blob/master/src/stateButton/StateButton.js)

docs: [```src/stateButton/stateButton.md```](https://github.com/altoviso/bd-widgets/blob/master/src/stateButton/stateButton.md)


#### ReactComponent
A thin container for a React component which provides access to the contained component's props, state, and instance.

source: [```src/reactComponent/ReactComponent.js```](https://github.com/altoviso/bd-widgets/blob/master/src/reactComponent/ReactComponent.js)

docs: [```src/reactComponent/reactComponent.md```](https://github.com/altoviso/bd-widgets/blob/master/src/reactComponent/reactComponent.md)

#### ComboBox
A validatable input control that includes a drop-down pick list. The pick list may be populated dynamically or statically.

source: [```src/comboBox/ComboBox.js```](https://github.com/altoviso/bd-widgets/blob/master/src/comboBox/ComboBox.js)

#### Dialog
A dialog box with a customizable body by means of a Backdraft element tree. The class provides a static member function that returns a promise to return the value of the dialog box after it is displayed and the user causes a termination event--usually pressing an "OK" or "Cancel" button.

source: [```src/comboBox/ComboBox.js```](https://github.com/altoviso/bd-widgets/blob/master/src/comboBox/ComboBox.js)

#### Input
A validatable input control that collects user keyboard input of various types. Validatable widgets include a validation status property of type `VStat` that gives the validation status of the widget value. The visual presentation may optionally display the validation status. Input widgets are designed to easily customize the type of values they can receive and present. The library includes customizations for booleans, integers, maps, and numbers.

source: [```src/comboBox/ComboBox.js```](https://github.com/altoviso/bd-widgets/blob/master/src/comboBox/ComboBox.js)

#### Labeled
In input widget within a stylized, labeled box. The label is mutable.

source: [```src/comboBox/ComboBox.js```](https://github.com/altoviso/bd-widgets/blob/master/src/comboBox/ComboBox.js)

#### ListBox
A scrollable, pick list of items. The pick list may be populated dynamically or statically.

source: [```src/comboBox/ComboBox.js```](https://github.com/altoviso/bd-widgets/blob/master/src/comboBox/ComboBox.js)

#### Meta
A static control that displays a mutable `VStat` value.

source: [```src/comboBox/ComboBox.js```](https://github.com/altoviso/bd-widgets/blob/master/src/comboBox/ComboBox.js)

#### Calendar
Planned for release before end of 2018.


#### ScrollBar
Planned for release before end of 2018.

#### SimpleGrid
Planned for release before end of 2018.

#### Progress
Planned for release before end of 2018.

#### Tab
Planned for release before end of 2018.

#### Tree
Planned for release before end of 2018.

#### RadioGroup
Planned for release before end of 2018.
