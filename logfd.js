var QPD		= require('qpd').QPD;
var xtend	= require('xtend');
var moment	= require('moment');
var debug	= require('debug')('logfd');


exports = module.exports = main;
exports.defaults = {
	root		: process.cwd()+'/log/',
	prefdTime	: 5000
};

function Logfd(opts) {
	this.opts = xtend({}, exports.defaults, opts);
	if (this.opts.prefdTime < 0) {
		this.opts.prefdTime = 0;
	}

	// 罗列成员变量
	this._deadline = this._preline = 0;
	this.file = this.qpd = this.preQpd = null;

	this.init_();
}

Logfd.prototype = {
	init_: function() {
		var qpd = this._genQPD(new Date);
		this._switchQPD(qpd);
	},
	handler: function(now, msg) {
		if (!(now instanceof Date)) {
			msg = now;
			now = new Date();
		}

		this._checkFdFilepath(now);
		this.qpd.handler(msg);
	},
	// 每次写日志的时候，都要检查一次时间
	_checkFdFilepath: function(now) {
		var self = this;
		if (this._deadline < +now) {
			var qpd = this.preQpd && this.preQpd._logfdTime && this._getFilepathFromDate(this.preQpd._logfdTime) == this._getFilepathFromDate(now) ? this.preQpd : this._genQPD(now);
			this._switchQPD(qpd, now);
		}
	},
	// 通过时间获取文件路径
	_getFilepathFromDate: function(time) {
		return this.opts.root+'/'+moment(time).format('YYYYMMDDHH')+'.log';
	},
	// 通过时间创建qpd对象
	_genQPD: function(time) {
		var file = this._getFilepathFromDate(time);
		delete this.opts.file;
		var qpd = new QPD(this.opts);

		debug('gen qpd: %s', file);

		qpd.genfd(file);
		qpd._logfdFile = file;
		qpd._logfdTime = time;

		return qpd;
	},
	// 切换写入的qpd
	_switchQPD: function(qpd, now) {
		var self = this;
		var oldQpd = self.qpd;

		if (oldQpd) {
			oldQpd.write();
			oldQpd.once('flushEnd', function() {
				oldQpd.destroy();
				debug('free old qpd');
			});
		}

		debug('switch qpd, now:%s, old:%d', now, oldQpd ? 1 : 0);
		self.qpd = qpd;
		self.file = qpd._logfdFile;

		var next =  self._nextTime(now);
		self._deadline = +next;

		// 提前准备fd
		if (self.opts.prefdTime) {
			setTimeout(function() {
				debug('pre qpd: %d', self.opts.prefdTime);

				if (self.preQpd && self.preQpd !== self.qpd) {
					self.preQpd.destroy();
					debug('pre destroy qpd %s', self.preQpd._logfdTime);
				}

				var newQpdTime = new Date(self._deadline+1);
				self.preQpd = self._genQPD(newQpdTime);

			}, self._deadline - now - self.opts.prefdTime);
		}
	},
	// 获取下个时间节点
	_nextTime: function(now) {
		now = +now;
		return new Date(now - now % 3600000 + 3600000);
	}
};


function main(opts) {
	var logfd = new Logfd(opts);
	var handler = logfd.handler.bind(logfd);
	handler.logfd = logfd;
	return handler;
}
