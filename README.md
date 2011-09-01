# Spider -- Programmable spidering of web sites with node.js and jQuery

## Install

From source:

<pre>
  git clone git://github.com/mikeal/spider.git 
  cd spider
  npm link ../spider
</pre>

## (How to use the) API

### Creating a Spider
<pre>
  var spider = require('spider');
  var s = spider();
</pre>

#### spider(options)

The `options` object can have the following fields:

* `maxSockets` - Integer containing the maximum amount of sockets in the pool. Defaults to `4`.
* `userAgent` - The User Agent String to be sent to the remote server along with our request. Defaults to `Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-US) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0.517.41 Safari/534.7` (firefox userAgent String).
* `cache` -  The Cache object to be used as cache. Defaults to NoCache, see code for implementation details for a new Cache object.
* `pool` - A hash object containing the agents for the requests. If omitted the requests will use the global pool which is set to maxSockets.

### Adding a Route Handler

#### spider.route(hosts, pattern, cb)
Where the params are the following : 

* `hosts` - A string -- or an array of string -- representing the `host` part of the targeted URL(s).
* `pattern` - The pattern against which spider tries to match the remaining (`pathname` + `search` + `hash`) of the URL(s).
* `cb` - A function of the form `function(window, $)` where
  * `this` - Will be a variable referencing the `Routes.match` return object/value with some other goodies added from spider. For more info see https://github.com/aaronblohowiak/routes.js
  * `window` - Will be a variable referencing the document's window.
  * `$` - Will be the variable referencing the jQuery Object.

### Queuing an URL for spider to fetch.

`spider.get(url)` where `url` is the url to fetch.

### Extending / Replacing the MemoryCache 

Currently the MemoryCache must provide the following methods:

* `get(url, cb)` - Returns `url`'s `body` field via the `cb` callback/continuation if it exists. Returns `null` otherwise.
  * `cb` - Must be of the form `function(retval) {...}`
* `getHeaders(url, cb)` - Returns `url`'s `headers` field via the `cb` callback/continuation if it exists. Returns `null` otherwise.
  * `cb` - Must be of the form `function(retval) {...}`
* `set(url, headers, body)` - Sets/Saves `url`'s `headers` and `body` in the cache.

### Setting the verbose/log level
`spider.log(level)` - Where `level` is a string that can be any of `"debug"`, `"info"`, `"error"`
