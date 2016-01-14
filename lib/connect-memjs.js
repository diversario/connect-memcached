/*!
 * connect-memjs
 * MIT Licensed
 */

var MemJS = require('memjs');
var oneDay = 86400;
function ensureCallback(fn) {
	return function() {
		fn && fn.apply(null, arguments);
	};
}

/**
 * Return the `MemJsStore` extending `connect`'s session Store.
 *
 * @param {object} session
 * @return {Function}
 * @api public
 */
module.exports = function(session) {
	var Store = session.Store;

	/**
	 * Initialize MemJsStore with the given `options`.
	 *
	 * @param {Object} options
	 * @api public
	 */
	function MemJsStore(options) {
		options = options || {};
		Store.call(this, options);

    var servers = options.hosts.join(',')

		this.prefix = options.prefix || '';

		if (!options.client) {
			if (!options.hosts) {
				options.hosts = '127.0.0.1:11211';
			}

			options.client = MemJS.Client.create(servers, options);
		}

		this.client = options.client;
	}

	MemJsStore.prototype.__proto__ = Store.prototype;

	/**
	 * Translates the given `sid` into a memcached key, optionally with prefix.
	 *
	 * @param {String} sid
	 * @api private
	 */
	MemJsStore.prototype.getKey = function getKey(sid) {
		return this.prefix + sid;
	};

	/**
	 * Attempt to fetch session by the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Function} fn
	 * @api public
	 */
	MemJsStore.prototype.get = function(sid, fn) {
		sid = this.getKey(sid);

    this.client.get(sid, function (err, data) {
      if (err) {
        return fn(err, {});
      }

      if (!data) {
        return fn();
      }

      try {
        fn(null, JSON.parse(data.toString()));
      } catch (e) {
        fn(e);
      }
    });
  };

	/**
	 * Commit the given `sess` object associated with the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Session} sess
	 * @param {Function} fn
	 * @api public
	 */
	MemJsStore.prototype.set = function(sid, sess, fn) {
		sid = this.getKey(sid);

		try {
			var maxAge = sess.cookie.maxAge;
			var ttl = 'number' == typeof maxAge ? maxAge / 1000 | 0 : oneDay;
			var sess = JSON.stringify(sess);

			this.client.set(sid, sess, ensureCallback(fn), ttl);
		} catch (err) {
			fn && fn(err);
		}
	};

	/**
	 * Destroy the session associated with the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Function} fn
	 * @api public
	 */
	MemJsStore.prototype.destroy = function(sid, fn) {
		sid = this.getKey(sid);

    var del = (typeof this.client.del == 'function') ? 'del' : 'delete'

    this.client[del](sid, ensureCallback(fn));
	};

	/**
	 * Fetch number of sessions.
	 *
	 * @param {Function} fn
	 * @api public
	 */
	MemJsStore.prototype.length = function(fn) {
    // memjs has no built-in count
    // maybe could use stats for this?
		return fn(null)
	};

	/**
	 * Clear all sessions.
	 *
	 * @param {Function} fn
	 * @api public
	 */
	MemJsStore.prototype.clear = function(fn) {
		this.client.flush(ensureCallback(fn));
	};

	return MemJsStore;
};
