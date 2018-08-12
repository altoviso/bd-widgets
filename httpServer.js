#!/usr/bin/env node

let express = require('express');
let logger = require('morgan');
let app = express();
app.use(logger('dev'));
app.use(express.static(__dirname));

// catch 404 and forward to error handler
app.use(function(req, res, next){
	let err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function(err, req, res, next){
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error =  err ;

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});


// listen on provided port, on all network interfaces.
let http = require('http');
let port = process.env.PORT || '3002';
app.set('port', port);
let server = http.createServer(app);
server.listen(port);
server.on('error', (e)=>{throw e;});
server.on('listening', ()=>{console.log("listening on port ", server.address().port);});

console.log("top page: http://localhost:" + server.address().port + "/Examples.html");
