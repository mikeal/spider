var request = require('request')
  , jsdom = require('jsdom')
  , jquery = require('jquery')
  , util = require('util')
  , urlParse = require('url').parse
  , urlResolve = require('url').resolve
  , routes = require('routes')
  , events = require('events')
  , util = require('util')
  , async = require('async')
  , parseContentType = require("content-type-parser")
  , whatwgEncoding = require("whatwg-encoding")
  ;

var headers =
  { 'accept': "application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5"
  , 'accept-language': 'en-US,en;q=0.8'
  , 'accept-charset':  'ISO-8859-1,utf-8;q=0.7,*;q=0.3'
  };

var firefox = 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-US) ' +
              'AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0.517.41 Safari/534.7';

var copy = function (obj) {
  var n = {};
  for (var i in obj) {
    n[i] = obj[i];
  }
  return n;
};

var debug = 1
  , info = 50
  , error = 100
  ;

var logLevels = {debug:debug, info:info, error:error, 1:'debug', 50:'info', 100:'error'};

jsdom.defaultDocumentFeatures =
  { FetchExternalResources   : []
  , ProcessExternalResources : false
  , MutationEvents           : false
  , QuerySelector            : false
  };

function MemoryCache () {
  this.cache = {};
}
MemoryCache.prototype.get = function (url, cb) {
  if (!this.cache[url]) { return cb(null); }
  cb({headers:this.cache[url].headers, body:this.cache[url].body.toString()});
};
MemoryCache.prototype.set = function (url, headers, body) {
  this.cache[url] = {headers:headers, body:new Buffer(body)};
};
MemoryCache.prototype.getHeaders = function (url, cb) {
  if (!this.cache[url]) { return cb(null); }
  cb(this.cache[url].headers);
};

function NoCache () {}
NoCache.prototype.get = function (url, cb) { cb(null); };
NoCache.prototype.getHeaders = function (url, cb) { cb(null); };
NoCache.prototype.set = function (url, headers, body) {};

function Spider (options) {
  var self = this;

  this.timeout = options.timeout || 20 * 1000;
  this.delay = options.delay || 3 * 1000;
  this.retry = options.retry || 3;
  this.concurrency = options.concurrency || 1;
  this.maxSockets = options.maxSockets || 10;
  this.userAgent = options.userAgent || firefox;
  this.cache = options.cache || new NoCache();
  this.pool = options.pool || {maxSockets: this.maxSockets};
  this.proxy = options.proxy;
  this.cookieJar = options.cookieJar || request.jar();
  this.taskTrigger = options.taskTrigger || function() {};
  this.finish = options.finish || function() { this.emit('log', info, 'All items have been processed.'); };

  this.routers = {};

  this.queue = async.queue(function(task, callback) {
    self.get(task.url, task.referer, task.retry, function() {
      if (typeof self.taskTrigger === 'function') {
        self.taskTrigger();
      }
      setTimeout(callback, self.delay);
    });
  }, self.concurrency);
  this.queue.drain = this.finish.bind(this);
}
util.inherits(Spider, events.EventEmitter);
Spider.prototype.get = function (url, referer, retry, done) {
  var self = this;
  var newHeaders = copy(headers);

  const urlObj = urlParse(url);
  const router = this.routers[urlObj.host];
  const route = router ? router.match(urlObj.pathname) : null;

  done = done || function() {};

  if (!router) {
    this.emit('log', debug, 'No routes for host: '+ urlObj.host + '. skipping.');
    done();
    return this;
  }

  if (!route) {
    this.emit('log', debug, 'No routes for path ' + urlObj.path + '. skipping.');
    done();
    return this;
  }

  this.cache.getHeaders(url, function (cacheHeaders) {
    if (cacheHeaders) {
      if (cacheHeaders['last-modified']) {
        newHeaders['if-modified-since'] = cacheHeaders['last-modified'];
      }
      if (cacheHeaders.etag) {
        newHeaders['if-none-match'] = cacheHeaders.etag;
      }
    }

    newHeaders['user-agent'] = self.userAgent;
    if (referer) { newHeaders['referer'] = referer; }

    request.get({
      url: url,
      headers: newHeaders,
      pool: self.pool,
      proxy: self.proxy,
      timeout: self.timeout,
      jar: self.cookieJar,
      encoding: null
    }, function (err, response, bufferData) {
      self.emit('log', debug, 'Response received for ' + url + '.');

      if (err) {
        self.emit('log', error, 'Request error: ' + err.message + '. ' + url);
        self.push(url, referer, retry);
        done();
        return;
      }

      if (response.statusCode === 304) {
        self.cache.get(url, function (cacheResponse) {
          self._handler(url, referer, {
            fromCache:true,
            headers:cacheResponse.headers,
            body:cacheResponse.body
          }, done);
        });
        self.emit('log', debug, 'Request return 304. ' + url);
        return;
      } else if (response.statusCode !== 200) {
        self.emit('log', debug, 'Request did not return 200. ' + url);
        self.push(url, referer, retry);
        done();
        return;
      }

      const contentType = parseContentType(response.headers['content-type']) || parseContentType('text/plain');

      // @TODO support more types like image, json, script, etc.
      if (!contentType.isText()) {
        self.emit('log', error, 'Content-Type is ' + contentType.type + '/' + contentType.subtype + ', NOT text. ' + url);
        done();
        return;
      }

      const encoding = whatwgEncoding.getBOMEncoding(bufferData) ||
                      whatwgEncoding.labelToName(contentType.get('charset')) ||
                      'windows-1252';
      const decoded = whatwgEncoding.decode(bufferData, encoding);

      contentType.set('charset', encoding);
      response.headers['content-type'] = contentType.toString();

      self.cache.set(url, response.headers, decoded);
      self._handler(url, referer, {
        fromCache: false,
        headers: response.headers,
        body: decoded
      }, done);
      self.emit('log', debug, 'Request finish. ' + url);
      return;
    });
  });
  return this;
};
Spider.prototype.route = function (hosts, pattern, cb) {
  var self = this;
  if (typeof hosts === 'string') {
    hosts = [hosts];
  }
  hosts.forEach(function (host) {
    if (!self.routers[host]) { self.routers[host] = new routes.Router(); }
    self.routers[host].addRoute(pattern, cb);
  });
  return self;
};
Spider.prototype._handler = function (url, referer, response, done) {
  var self = this;
  var urlObj = urlParse(url);
  var route = this.routers[urlObj.host].match(urlObj.pathname);

  route.spider = this;
  route.body = response.body;
  route.url = urlObj;

  jsdom.env({
    html: response.body,
    headers: response.headers,
    userAgent: self.userAgent,
    pool: self.pool,
    cookieJar: self.cookieJar,
    done: function(err, window) {
      if (err) {
        self.emit('log', error, 'jsdom error: ' + err.message);
      } else if (window) {
        jquery(window);
        window.jQuery.fn.spider = function () {
          this.each(function () {
            var href = window.jQuery(this).attr('href');
            if (!/^https?:/.test(href)) {
              href = urlResolve(url, href);
            }
            self.push(href, url);
          });
        };
        route.fn.call(route, window, window.jQuery);
        done();
      } else {
        self.emit('log', error, 'jsdom window error.');
        done();
      }
    }
  });
};
Spider.prototype.push = function(url, referer, retry) {
  var task = {
    url: url,
    referer: referer,
    retry: retry
  };
  if (Number.isInteger(task.retry)) {
    task.retry = task.retry - 1;
    if (task.retry >= 0) {
      this.emit('log', info, 'Retry(' + (this.retry - task.retry) + ') ' + url);
    }
  } else {
    task.retry = this.retry;
  }

  if (task.retry >= 0) {
    this.queue.push(task);
  }
};
Spider.prototype.log = function (level) {
  if (typeof level === 'string') { level = logLevels[level]; }
  this.on('log', function (l, text) {
    if (l >= level) {
      console.log('['+(logLevels[l] || l)+']', text);
    }
  });
  return this;
};

module.exports = function (options) { return new Spider(options || {}); };
module.exports.jsdom = jsdom;
module.exports.request = request;
