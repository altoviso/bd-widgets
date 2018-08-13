# bd-widgets
## a library of user interface widgets built with Backdraft

This library contains a number of UI widgets built exclusively with Backdraft. It is a work in progress...mostly the consequence of pulling out special-purpose widgets that were constructed in other projects and enhancing them to be general purpose widgets.

All that said, this project is a great example of how quick and easy it is to construct UI components with Backdraft!

### Installation

```
$ git clone https://github.com/altoviso/bd-widgets.git
$ cd backdraft-widgets
$ npm install
```

A small [Express server](https://github.com/altoviso/bd-widgets/blob/master/httpServer.js) is included to serve the project root so the examples can be run. To start this server:

```
$ npm run server
```

Then navigate to (typically):
```
http://localhost:3002/index.html
```
## Website

Backdraft is extensively documented at [backdraftjs.org](http://backdraftjs.org).

## Examples

Serve the project root with a web server and load index.html. Alternatively, a small Express server is included to serve the project root; see "Installation", above.

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
