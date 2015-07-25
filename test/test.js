require('debug').enable('logfd');

var fs = require('fs');
var assert = require('assert');
var log = require('../')({root: __dirname+'/tmp'});

log(new Date, 'some msg\n');
log('some msg2');

var abq = log.logfd.abq;
var file = log.logfd.file;
fs.existsSync(file) && fs.unlinkSync(file);

abq.once('open', function() {
	abq.toWriteQuery();
	abq.flushSync();

	assert(fs.existsSync(file), 'no has file'+file);
	var cont = fs.readFileSync(file, {encoding: 'utf8'});
	assert.equal(cont, 'some msg\nsome msg2', 'write content err:'+cont);
	process.exit();
});

