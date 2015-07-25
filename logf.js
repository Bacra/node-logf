'use strict';

var ABQ			= require('abq').cls;
var events		= require('events');
var extend		= require('extend');
var debug		= require('debug')('logf');
var dateformat	= require('dateformat');


exports = module.exports = main;
exports.cls = LogF;
exports.defaults = {
	root		: process.cwd()+'/log/',
	prefdTime	: 5000
};

function LogF(opts) {
	this.opts = extend({}, exports.defaults, opts);
	if (this.opts.prefdTime < 0) {
		this.opts.prefdTime = 0;
	}

	// 罗列成员变量
	this._deadline = 0;
	this.file = this.fdmgr = this.preFdmgr = null;
	events.EventEmitter.call(this);

	this.init_();
}

require('util').inherits(LogF, events.EventEmitter);

extend(LogF.prototype, {
	init_: function() {
		var now = new Date;
		var fdmgr = this._genFdmgr(now);
		this._switchFdmgr(fdmgr, now);
	},
	handler: function(now, msg) {
		if (!(now instanceof Date)) {
			msg = now;
			now = new Date();
		}

		this._checkFdFilepath(now);
		this.fdmgr.handler(msg);
	},
	// 每次写日志的时候，都要检查一次时间
	_checkFdFilepath: function(now) {
		var self = this;
		if (this._deadline < +now) {
			var fdmgr = this.preFdmgr && this.preFdmgr._logfTime && this._getFilepathFromDate(this.preFdmgr._logfTime) == this._getFilepathFromDate(now) ? this.preFdmgr : this._genFdmgr(now);
			this._switchFdmgr(fdmgr, now);
		}
	},
	// 通过时间获取文件路径
	_getFilepathFromDate: function(time) {
		return this.opts.root+'/'+dateformat(time, 'yyyymmddHH')+'.log';
	},
	// 通过时间创建fdmgr对象
	_genFdmgr: function(time) {
		var file = this._getFilepathFromDate(time);
		delete this.opts.file;
		var fdmgr = new ABQ(this.opts);

		debug('gen fdmgr: %s', file);

		fdmgr.genfd(file);
		fdmgr._logfFile = file;
		fdmgr._logfTime = time;

		return fdmgr;
	},
	// 切换写入的fdmgr
	_switchFdmgr: function(fdmgr, now) {
		var self = this;
		var oldFdmgr = self.fdmgr;

		if (oldFdmgr) {
			oldFdmgr.write();
			oldFdmgr.once('flushEnd', function() {
				oldFdmgr.destroy();
				debug('free old fdmgr');
			});
		}

		// 切换到新的fdmgr
		debug('switch fdmgr, now:%s, file:%s, old:%d', now, fdmgr._logfFile, oldFdmgr ? 1 : 0);
		self.fdmgr	= fdmgr;
		self.file	= fdmgr._logfFile;
		var next	= self._nextTime(now);
		self._deadline = +next;
		self.emit('switch', fdmgr, oldFdmgr, now);

		// 提前准备fd
		if (self.opts.prefdTime) {
			setTimeout(function() {
				debug('pre fdmgr: %d', self.opts.prefdTime);

				if (self.preFdmgr && self.preFdmgr !== self.fdmgr) {
					self.preFdmgr.destroy();
					debug('pre destroy fdmgr %s', self.preFdmgr._logfTime);
				}

				var newTime = new Date(self._deadline+1);
				self.preFdmgr = self._genFdmgr(newTime);
				self.emit('preFdmgr', self.preFdmgr);

			}, self._deadline - now - self.opts.prefdTime);
		}
	},
	// 获取下个时间节点
	_nextTime: function(now) {
		now = +now;
		return new Date(now - now % 3600000 + 3600000);
	}
});


function main(opts) {
	var logf = new LogF(opts);
	var handler = logf.handler.bind(logf);
	handler.instance = logf;
	return handler;
}
