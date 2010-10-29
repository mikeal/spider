var request = require('request')
  , fs = require('fs')
  , sys = require('sys')
  , path = require('path')
  , jsdom = require('jsdom')
  , url = require('url')
  ;


var headers = {
     referer:          "http://www.taschen.com/pages/en/community/archive_type_2/index.1.htm"
  ,  accept:           "application/xml,application/xhtml+xml,text/" +
                       "html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5"
  , 'accept-language': 'en-US,en;q=0.8'
  , 'accept-charset':  'ISO-8859-1,utf-8;q=0.7,*;q=0.3'
  , 'cache-control':   'max-age=0'
  , 'user-agent':      'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-US) ' +
                       'AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0.517.41 Safari/534.7'
}

  
var jqueryFilename = path.join(__dirname, 'jquery.js')

var copy = function (obj) {
  var n = {}
  for (i in obj) {
    n[i] = obj[i];
  }
  if (obj.headers) obj.headers = copy(obj.headers);
  return n
}

var crawl = function (options, handler) {
  var opts = copy(options);
  for (i in headers) if (!opts[i]) opts[i] = headers[i];
  request(opts, function (err, resp, body) {
    if (!err && resp.statusCode == 200) {
      var window = jsdom.jsdom(body).createWindow();
      var spider = function (u) {
        var o
        if (typeof u === 'string') {
          o = copy(opts)
          o.uri = u
        } else {
          o = copy(opts)
          for (i in u) {
            o[i] = u[i]
          }
        }
        o.uri = url.resolve(opts.uri.href, o.uri.href || o.uri);
        o.headers.referer = opts.uri;
        crawl(o, handler);
      }
      jsdom.jQueryify(window, jqueryFilename, function (window, jquery) {
        window.location.href = opts.uri.href;
        handler.apply({spider:spider, body:body, resp:resp}, [window, jquery]);
      });
    }
  })
}

module.exports = crawl;


// var referer = "http://www.taschen.com/pages/en/community/archive_type_2/{{filename}}"
// 


