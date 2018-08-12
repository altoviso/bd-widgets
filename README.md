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

```src/Button.js``` implements a button component:

* ```label``` property (mutable); label content of the button
* ```enabled``` property (mutable); causes the button to be disabled/enabled
* ```handler``` method (mutable); executed upon button push
* `````"click"````` event: signaled upon button click
* several CSS configurable with less via ```less/button-vars.less```
* otherwise, CSS at ```less/button.less```


#### React Component Container
