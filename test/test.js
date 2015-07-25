require('debug').enable('logf');

var fs = require('fs');
var assert = require('assert');
var log = require('../')({root: __dirname+'/tmp'});

log(new Date, 'some msg\n');
log('some msg2');

var fdmgr = log.instance.fdmgr;
var file = log.instance.file;
fs.existsSync(file) && fs.unlinkSync(file);

fdmgr.once('open', function() {
	fdmgr.toWriteQuery();
	fdmgr.flushSync();

	assert(fs.existsSync(file), 'no has file'+file);
	var cont = fs.readFileSync(file, {encoding: 'utf8'});
	assert.equal(cont, 'some msg\nsome msg2', 'write content err:'+cont);
	process.exit();
});

