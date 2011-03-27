var request = require('request')
  , fs = require('fs')
  , sys = require('sys')
  , path = require('path')
  , jsdom = require('jsdom')
  , urlParse = require('url').parse
  , routes = require('routes')
  , events = require('events')
  , util = require('util')
  ;


var headers = 
  { 'accept': "application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5"
  , 'accept-language': 'en-US,en;q=0.8'
  , 'accept-charset':  'ISO-8859-1,utf-8;q=0.7,*;q=0.3'
  }

var firefox = 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-US) ' +
              'AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0.517.41 Safari/534.7'

  
var jqueryFilename = path.join(__dirname, 'jquery.js')
  , jquery = fs.readFileSync(jqueryFilename).toString()
  ;

var copy = function (obj) {
  var n = {}
  for (i in obj) {
    n[i] = obj[i];
  }
  return n
}

jsdom.defaultDocumentFeatures = 
  { FetchExternalResources   : []
  , ProcessExternalResources : false
  , MutationEvents           : false
  , QuerySelector            : false
  }
  
var Context = process.binding('evals').Context,
    Script = process.binding('evals').Script;
jqueryify = function(window, document) {
  var filename = jqueryFilename
    , document = window.document
    ;
  if (window) {
    var ctx = window.__scriptContext;
    if (!ctx) {
      window.__scriptContext = ctx = new Context();
      ctx.__proto__ = window;
    }
    var tracelimitbak = Error.stackTraceLimit;
    Error.stackTraceLimit = 100;
    try {
      Script.runInContext(jquery, ctx, filename);
    }
    catch(e) {
      document.trigger(
        'error', 'Running ' + filename + ' failed.', 
        {error: e, filename: filename}
      );
    }
    Error.stackTraceLimit = tracelimitbak;
  }
};

var debug = 1
  , info = 50
  , error = 100
  ;
  
var logLevels = {debug:debug, info:info, error:error, 1:'debug', 50:'info', 100:'error'}

function MemoryCache () {
  this.cache = {};
}
MemoryCache.prototype.get = function (url, cb) {
  if (!this.cache[url]) return cb(null);
  cb({headers:this.cache[url].headers, body:this.cache[url].body.toString()});
}
MemoryCache.prototype.set = function (url, headers, body) {
  this.cache[url] = {headers:headers, body:new Buffer(body)};
}
MemoryCache.prototype.getHeaders = function (url, cb) {
  if (!this.cache[url]) return cb(null);
  cb(this.cache[url].headers);
}

function Spider (options) {
  this.maxSockets = options.maxSockets || 4;
  this.userAgent = options.userAgent || firefox;
  this.cache = options.cache || new MemoryCache();
  this.pool = options.pool || {maxSockets: options.maxSockets};
  this.options = options;
  this.currentUrl = null;
  this.routers = {};
  this.urls = [];
}
util.inherits(Spider, events.EventEmitter)
Spider.prototype.get = function (url) {
  var self = this
    , h = copy(headers)
    ;
  if (this.urls.indexOf(url) !== -1) {
    // Already handled this request
    this.emit('log', debug, 'Already received one get request for '+url+'. skipping.')
    return;
  } 
  this.urls.push(url);
  
  var u = urlParse(url);
  if (!this.routers[u.host]) {
    this.emit('log', debug, 'No routes for host: '+u.host+'. skipping.')
    return;
  }
  if (!this.routers[u.host].match(u.href.slice(u.href.indexOf(u.host)+u.host.length))) {
    this.emit('log', debug, 'No routes for path '+u.href.slice(u.href.indexOf(u.host)+u.host.length)+'. skipping.')
    return;
  }

  if (this.currentUrl) h.referer = currentUrl;
  h['user-agent'] = this.userAgent;
  
  this.cache.getHeaders(url, function (c) {
    if (c) {
      if (c['last-modifed']) {
        h['if-modified-since'] = c['last-modified'];
      }
      if (c.etag) {
        h['if-none-match'] = c.etag;
      }
    }

    request.get({url:url, headers:h, pool:self.pool}, function (e, resp, body) {
      if (resp.statusCode === 304) {
        self.cache.get(url, function (c_) {
          self._handler(url, {fromCache:true, headers:c_.headers, body:c_.body})
        });
        return;
      } else if (resp.statusCode !== 200) {
        self.emit('log', debug, 'Request did not return 200. '+url);
        return;
      } else if (!resp.headers['content-type'] || resp.headers['content-type'].indexOf('html') === -1) {
        self.emit('log', debug, 'Content-Type does not match. '+url);
        return;
      }
      self.cache.set(url, resp.headers, body);
      self._handler(url, {fromCache:false, headers:resp.headers, body:body});
    })
  });
  
}
Spider.prototype.route = function (hosts, pattern, cb) {
  var self = this;
  if (typeof hosts === 'string') {
    hosts = [hosts];
  }
  hosts.forEach(function (host) {
    if (!self.routers[host]) self.routers[host] = new routes.Router();
    self.routers[host].addRoute(pattern, cb);
  })
}
Spider.prototype._handler = function (url, response) {
  var u = urlParse(url)
    , self = this
    ;
  if (this.routers[u.host]) {
    var r = this.routers[u.host].match(u.href.slice(u.href.indexOf(u.host)+u.host.length));
    r.spider = this;
    r.response = response
    var window = jsdom.jsdom(response.body).createWindow();
    jqueryify(window);
    window.$.fn.spider = function () {
      this.each(function () {
       var h = window.$(this).attr('href');
       self.get(h);
      })
    }
    r.fn.call(r, window, window.$);
  }
}
Spider.prototype.log = function (level) {
  if (typeof level === 'string') level = logLevels[level];
  this.on('log', function (l, text) {
    if (l >= level) {
      console.log('['+(logLevels[l] || l)+']', text)
    }
  })
}

exports.createSpider = function (options) {return new Spider(options || {})}

// 
// var crawl = function (options, handler) {
//   var opts = copy(options);
//   for (i in headers) if (!opts[i]) opts[i] = headers[i];
//   request(opts, function (err, resp, body) {
//     if (!err && resp.statusCode == 200) {
//       var window = jsdom.jsdom(body).createWindow();
//       var spider = function (u) {
//         var o
//         if (typeof u === 'string') {
//           o = copy(opts)
//           o.uri = u
//         } else {
//           o = copy(opts)
//           for (i in u) {
//             o[i] = u[i]
//           }
//         }
//         o.uri = url.resolve(opts.uri.href, o.uri.href || o.uri);
//         o.headers.referer = opts.uri;
//         crawl(o, handler);
//       }
//       jsdom.jQueryify(window, jqueryFilename, function (window, jquery) {
//         window.location.href = opts.uri.href;
//         handler.apply({spider:spider, body:body, resp:resp}, [window, jquery]);
//       });
//     }
//   })
// }
// 
// module.exports = crawl;


// var referer = "http://www.taschen.com/pages/en/community/archive_type_2/{{filename}}"
// 


