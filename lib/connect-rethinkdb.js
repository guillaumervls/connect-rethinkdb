/*!
 * Connect RethinkDB
 * MIT Licensed
 */

var r = require('rethinkdb'),
  debug = require('debug')('connect:rethinkdb'),
  rql = require('rql-promise');

module.exports = function (connect) {

  var Store = connect.session.Store;

  function RethinkStore(options) {

    options = options || {};
    options.clientOptions = options.clientOptions || {};
    Store.call(this, options); // Inherit from Store

    rql.connect(options.clientOptions);

    this.emit('connect');
    this.browserSessionsMaxAge = options.browserSessionsMaxAge || 86400000; // 1 day
    this.table = options.table || 'session';
    setInterval(function () {
      var now = (new Date()).getTime();
      rql(r.table(this.table).filter(r.row('expires').lt(now)).delete()).
      then(debug.bind(null, 'DELETED EXPIRED %j')).
      done(null, debug.bind(null, 'WARNING ! COULD NOT DELETE EXPIRED !'));
    }.bind(this), options.flushOldSessIntvl || 60000);
  }

  RethinkStore.prototype = new Store();

  RethinkStore.prototype.get = function (sid, fn) {
    debug('GETTING "%s" ...', sid);
    rql(r.table(this.table).get(sid)).then(function (data) {
      debug('GOT %j', data);
      return data ? JSON.parse(data.session) : null;
    }).done(function (data) {
      debug('GOT %j', data);
      fn(null, data);
    }, function (err) {
      fn(err);
    });
  };

  RethinkStore.prototype.set = function (sid, sess, fn) {
    var sessionToStore = {
      id: sid,
      expires: (new Date()).getTime() + (sess.cookie.originalMaxAge || this.browserSessionsMaxAge),
      session: JSON.stringify(sess)
    };
    debug('SETTING "%j" ...', sessionToStore);
    rql(r.table(this.table).insert(sessionToStore, {
      upsert: true
    })).done(function (data) {
      debug('SET %j', data);
      fn();
    }, function (err) {
      fn(err);
    });
  };

  RethinkStore.prototype.destroy = function (sid, fn) {
    debug('DELETING "%s" ...', sid);
    rql(r.table(this.table).get(sid).delete()).done(function (data) {
      debug('DELETED %j', data);
      fn();
    }, function (err) {
      fn(err);
    });
  };

  return RethinkStore;
};