Connect RethinkDB
=================

###RethinkDB session store for Connect

*Inspired by TJ Holowaychuk's [Connect Redis](https://github.com/visionmedia/connect-redis)*

##Installation

```npm install connect-rethinkdb```

##Getting started

Note that you must already have Connect installed (```npm install connect```).

```javascript
var connect = require('connect'),
  RDBStore = require('connect-rethinkdb')(connect);

var rDBStore = new RDBStore({
  flushOldSessIntvl: 60000,
  clientOptions: {
    db: 'test'
    host: 'localhost',
    port: '28015'
  }
  table: 'session'
});

connect().
use(connect.favicon()).
use(connect.cookieParser()).
use(connect.session({
  secret: 'keyboard cat',
  cookie: {
    maxAge: 10000
  },
  store: rDBStore
})).
use(...);
```

##Constructor options

###flushOldSessIntvl
Unlike Redis, RethinkDB does not provide a ```SETEX``` function. So we have to flush expired sessions periodically. This defines the amount of time between two flushes.
*Defaults to 60 seconds*

###clientPromise - **REMOVED IN 0.4.0 !**
A promise (see [Deferred module](https://github.com/medikoo/deferred)) that resolves with a RethinkDB connection.
*Defaults to ```undefined```. See ```clientOptions``` below if you can't provide this.*

###clientOptions
We need these to connect to our DB. Used only when no ```clientPromise``` is provided.
*See [RethinkDB's doc](http://rethinkdb.com/api/#js:accessing_rql-connect).*

###table
Name of the table in which session data will be stored.
*Defaults to 'session'*

###browserSessionsMaxAge
If you do not set ```cookie.maxAge``` in ```session``` middleware, sessions will last until the user closes his/her browser. However we cannot keep the session data infinitely (for size and security reasons). In this case, this setting defines the maximum length of a session, even if the user doesn't close his/her browser.
*Defaults to 1 day*

## Changelog

### 0.4.0
Removed `clientPromise` option in constructor. Just use classic RethinkDB `clientOptions`. (It's because we now use under the hood [RQL-Promise](https://github.com/guillaumervls/rql-promise)).
