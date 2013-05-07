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

    this.table = options.table || 'session';
  }

  RethinkStore.prototype = new Store();

  RethinkStore.prototype.get = function (sid, fn) {
    if (!sid) {
      return fn(new Error('No session ID provided !'));
    }
    debug('GETTING "%s" ...', sid);
    var table = this.table;
    this.clientPromise.then(function (conn) {
      return promisifyMethod(r.table(table).get(sid), 'run')(conn);
    }, function (err) {
      throw err;
    }).then(function (data) {
      debug('GOT %j', data);
      return data;
    }, function (err) {
      throw err;
    }).cb(fn);
  };

  RethinkStore.prototype.set = function (sid, sess, fn) {
    if (!sid || !sess || typeof sess !== 'object') {
      return fn(new Error('No session ID provided or invalid session !'));
    }
    debug('SETTING "%s" ...', sid);
    sess.sid = sid;
    var table = this.table;
    this.clientPromise.then(function (conn) {
      return promisifyMethod(r.table(table).insert(sess), 'run')(conn);
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