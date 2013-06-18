/*!
 * Connect RethinkDB
 * MIT Licensed
 */

var r = require('rethinkdb'),
  debug = require('debug')('connect:rethinkdb'),
  promisify = require('deferred').promisify;

function provideContext(context, func) {
  return function () {
    return func.apply(context, arguments);
  };
}

function promisifyMethod(object, methodName) {
  return promisify(provideContext(object, object[methodName]));
}

module.exports = function (connect) {

  var Store = connect.session.Store;

  function RethinkStore(options) {

    options = options || {};
    options.clientOptions = options.clientOptions || {};
    Store.call(this, options);

    this.clientPromise = options.clientPromise || promisify(r.connect)(options.clientOptions);
    var self = this;
    this.clientPromise.then(function () {
      self.emit('connect');
    });
    this.browserSessionsMaxAge = options.browserSessionsMaxAge || 86400000; // 1 day
    this.table = options.table || 'session';
    setInterval(function () {
      self.clientPromise.then(function (conn) {
        var now = (new Date()).getTime();
        return promisifyMethod(r.table(self.table).filter(r.row('expires').lt(now)).delete(), 'run')(conn);
      }, function (err) {
        throw err;
      }).then(function (data) {
        debug('DELETED EXPIRED %j', data);
      }, function (err) {
        throw err;
      }).end();
    }, options.flushOldSessIntvl || 60000);
  }

  RethinkStore.prototype = new Store();

  RethinkStore.prototype.get = function (sid, fn) {
    debug('GETTING "%s" ...', sid);
    var table = this.table;
    this.clientPromise.then(function (conn) {
      return promisifyMethod(r.table(table).get(sid), 'run')(conn);
    }, function (err) {
      throw err;
    }).then(function (data) {
      debug('GOT %j', data);
      return data ? JSON.parse(data.session) : null;
    }, function (err) {
      throw err;
    }).cb(fn);
  };

  RethinkStore.prototype.set = function (sid, sess, fn) {
    var sessionToStore = {
      id: sid,
      expires: (new Date()).getTime() + (sess.cookie.originalMaxAge || this.browserSessionsMaxAge),
      session: JSON.stringify(sess)
    };
    debug('SETTING "%j" ...', sessionToStore);
    var table = this.table;
    this.clientPromise.then(function (conn) {
      return promisifyMethod(r.table(table).insert(sessionToStore, {
        upsert: true
      }), 'run')(conn);
    }, function (err) {
      throw err;
    }).then(function (data) {
      debug('SET %j', data);
      return data;
    }, function (err) {
      throw err;
    }).cb(fn);
  };

  RethinkStore.prototype.destroy = function (sid, fn) {
    debug('DELETING "%s" ...', sid);
    var table = this.table;
    this.clientPromise.then(function (conn) {
      return promisifyMethod(r.table(table).get(sid).delete(), 'run')(conn);
    }, function (err) {
      throw err;
    }).then(function (data) {
      debug('DELETED %j', data);
      return data;
    }, function (err) {
      throw err;
    }).cb(fn);
  };

  return RethinkStore;
};