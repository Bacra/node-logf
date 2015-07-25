var QPD			= require('abq').QPD;
var events		= require('events');
var extend		= require('extend');
var debug		= require('debug')('logfd');
var dateformat	= require('dateformat');


exports = module.exports = main;
exports.defaults = {
	root		: process.cwd()+'/log/',
	prefdTime	: 5000
};

function Logfd(opts) {
	this.opts = extend({}, exports.defaults, opts);
	if (this.opts.prefdTime < 0) {
		this.opts.prefdTime = 0;
	}

	// 罗列成员变量
	this._deadline = 0;
	this.file = this.abq = this.preQpd = null;
	events.EventEmitter.call(this);

	this.init_();
}

require('util').inherits(Logfd, events.EventEmitter);

extend(Logfd.prototype, {
	init_: function() {
		var now = new Date;
		var abq = this._genQPD(now);
		this._switchQPD(abq, now);
	},
	handler: function(now, msg) {
		if (!(now instanceof Date)) {
			msg = now;
			now = new Date();
		}

		this._checkFdFilepath(now);
		this.abq.handler(msg);
	},
	// 每次写日志的时候，都要检查一次时间
	_checkFdFilepath: function(now) {
		var self = this;
		if (this._deadline < +now) {
			var abq = this.preQpd && this.preQpd._logfdTime && this._getFilepathFromDate(this.preQpd._logfdTime) == this._getFilepathFromDate(now) ? this.preQpd : this._genQPD(now);
			this._switchQPD(abq, now);
		}
	},
	// 通过时间获取文件路径
	_getFilepathFromDate: function(time) {
		return this.opts.root+'/'+dateformat(time, 'yyyymmddHH')+'.log';
	},
	// 通过时间创建abq对象
	_genQPD: function(time) {
		var file = this._getFilepathFromDate(time);
		delete this.opts.file;
		var abq = new QPD(this.opts);

		debug('gen abq: %s', file);

		abq.genfd(file);
		abq._logfdFile = file;
		abq._logfdTime = time;

		return abq;
	},
	// 切换写入的abq
	_switchQPD: function(abq, now) {
		var self = this;
		var oldQpd = self.abq;

		if (oldQpd) {
			oldQpd.write();
			oldQpd.once('flushEnd', function() {
				oldQpd.destroy();
				debug('free old abq');
			});
		}

		// 切换到新的abq
		debug('switch abq, now:%s, file:%s, old:%d', now, abq._logfdFile, oldQpd ? 1 : 0);
		self.abq	= abq;
		self.file	= abq._logfdFile;
		var next	= self._nextTime(now);
		self._deadline = +next;
		self.emit('switch', abq, oldQpd, now);

		// 提前准备fd
		if (self.opts.prefdTime) {
			setTimeout(function() {
				debug('pre abq: %d', self.opts.prefdTime);

				if (self.preQpd && self.preQpd !== self.abq) {
					self.preQpd.destroy();
					debug('pre destroy abq %s', self.preQpd._logfdTime);
				}

				var newQpdTime = new Date(self._deadline+1);
				self.preQpd = self._genQPD(newQpdTime);
				self.emit('preQpd', self.preQpd);

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
	var logfd = new Logfd(opts);
	var handler = logfd.handler.bind(logfd);
	handler.logfd = logfd;
	return handler;
}
