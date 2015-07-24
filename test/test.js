require('debug').enable('logfd');

var fs = require('fs');
var assert = require('assert');
var log = require('../')({root: __dirname+'/tmp'});

log(new Date, 'some msg\n');
log('some msg2');

var qpd = log.logfd.qpd;
var file = log.logfd.file;
fs.existsSync(file) && fs.unlinkSync(file);

qpd.once('open', function() {
	qpd.toWriteQuery();
	qpd.flushSync();

	assert(fs.existsSync(file), 'no has file'+file);
	var cont = fs.readFileSync(file, {encoding: 'utf8'});
	assert.equal(cont, 'some msg\nsome msg2', 'write content err:'+cont);
	process.exit();
});

