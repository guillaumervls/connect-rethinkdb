/*!
 * Connect RethinkDB
 * MIT Licensed
 */

var r = require('rethinkdb'),
  debug = require('debug')('connect:rethinkdb');



module.exports = function (connect) {

  var Store = connect.session.Store;
  var options = null;

  function RethinkStore(opts) {

    options = opts || {};
    options.table = options.table || 'session';
    options.clientOptions = options.clientOptions || {};
    Store.call(this, options); // Inherit from Store


    this.emit('connect');
    this.browserSessionsMaxAge = options.browserSessionsMaxAge || 86400000; // 1 day
    this.table = options.table || 'session';
    setInterval(function () {
      var now = (new Date()).getTime();
      r.connect(options.clientOptions, function (err, conn) {
        if (err) return false;
        r.table(options.table).filter(r.row('expires').lt(now)).delete().run(conn, function (err, data) {
          conn.close();
        });
      });
    }.bind(this), options.flushOldSessIntvl || 60000);
  }

  RethinkStore.prototype = new Store();

  RethinkStore.prototype.get = function (sid, fn) {
    debug('GETTING "%s" ...', sid);
    r.connect(options.clientOptions, function (err, conn) {
      if (err) { return fn(err); }
      r.table(options.table).get(sid).run(conn, function (err, data) {
        conn.close();
        if (err) { return fn(err); }
        var sess = data ? JSON.parse(data.session) : null;
        return fn(null, sess)
      });
    });
  };

  RethinkStore.prototype.set = function (sid, sess, fn) {
    var sessionToStore = {
      id: sid,
      expires: (new Date()).getTime() + (sess.cookie.originalMaxAge || this.browserSessionsMaxAge),
      session: JSON.stringify(sess)
    };
    debug('SETTING "%j" ...', sessionToStore);
    r.connect(options.clientOptions, function (err, conn) {
      if (err) { return fn(err); }
      r.table(options.table).insert(sessionToStore, { upsert: true }).run(conn, function (err, data) {
        conn.close();
        if (err) { return fn(err); }
        debug('SET %j', data);
        fn();
      });
    })
  };

  RethinkStore.prototype.destroy = function (sid, fn) {
    debug('DELETING "%s" ...', sid);
    r.connect(options.clientOptions, function (err, conn) {
      r.table(options.table).get(sid).delete().run(conn, function (err, result) {
        if (err) { return fn(err); }
        conn.close();
        if (err) { return fn(err); }
        debug('DELETED %j', data);
        fn();

      });
    });
  };

  return RethinkStore;
};
