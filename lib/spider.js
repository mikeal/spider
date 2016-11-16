"use strict";
var request = require('request')
    , fs = require('fs')
    , sys = require('sys')
    , path = require('path')
    , vm = require('vm')
    , util = require('util')
    , urlParse = require('url').parse
    , urlResolve = require('url').resolve
    , routes = require('routes')
    , cookiejar = require('cookiejar')
    ;

const {EventEmitter} = require('events');

const NoCache = require('./noCache');
const dom = require('./dom');
const {jsdom} = dom;

var headers = {
    'accept': "application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5"
    , 'accept-language': 'en-US,en;q=0.8'
    , 'accept-charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3'
};

var firefox = 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-US) ' +
    'AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0.517.41 Safari/534.7';

var debug = 1
    , info = 50
    , error = 100
    ;

var isUrl = /^https?:/;

var logLevels = {debug: debug, info: info, error: error, 1: 'debug', 50: 'info', 100: 'error'};

class Spider extends EventEmitter {

    constructor({maxSockets = 4, userAgent = firefox, cache = new NoCache(), pool}) {
        super();
        this.maxSockets = maxSockets;
        this.userAgent = userAgent;
        this.cache = cache;
        this.pool = pool || {maxSockets};
        this.currentUrl = null;
        this.routers = {};
        this.urls = [];
        this.jar = cookiejar.CookieJar();
    }

    get(url, referer) {
        var self = this
            , h = Object.assign({}, headers);
        referer = referer || this.currentUrl;

        url = url.slice(0, (url.indexOf('#') === -1) ? url.length : url.indexOf('#'));

        if (this.urls.indexOf(url) !== -1) {
            // Already handled this request
            this.emit('log', debug, 'Already received one get request for ' + url + '. skipping.');
            return this;
        }
        this.urls.push(url);

        var u = urlParse(url);
        if (!this.routers[u.host]) {
            this.emit('log', debug, 'No routes for host: ' + u.host + '. skipping.')
            return this;
        }
        if (!this.routers[u.host].match(u.href.slice(u.href.indexOf(u.host) + u.host.length))) {
            this.emit('log', debug, 'No routes for path ' + u.href.slice(u.href.indexOf(u.host) + u.host.length) + '. skipping.')
            return this;
        }

        if (referer) h.referer = referer;
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

            var cookies = self.jar.getCookies(cookiejar.CookieAccessInfo(u.host, u.pathname));
            if (cookies) {
                h.cookie = cookies.join(";");
            }

            request.get({url: url, headers: h, pool: self.pool}, function (e, resp, body) {
                self.emit('log', debug, 'Response received for ' + url + '.')
                if (e) {
                    self.emit('log', error, e);
                    return;
                }
                if (resp.statusCode === 304) {
                    self.cache.get(url, function (c_) {
                        self._handler(url, referer, {fromCache: true, headers: c_.headers, body: c_.body})
                    });
                    return;
                } else if (resp.statusCode !== 200) {
                    self.emit('log', debug, 'Request did not return 200. ' + url);
                    return;
                } else if (!resp.headers['content-type'] || resp.headers['content-type'].indexOf('html') === -1) {
                    self.emit('log', debug, 'Content-Type does not match. ' + url);
                    return;
                }
                if (resp.headers['set-cookie']) {
                    try {
                        self.jar.setCookies(resp.headers['set-cookie'])
                    }
                    catch (e) {
                    }
                }
                self.cache.set(url, resp.headers, body);
                self._handler(url, referer, {fromCache: false, headers: resp.headers, body: body});
            })
        });
        return this;
    }

    route(hosts, pattern, cb) {
        var self = this;
        if (typeof hosts === 'string') {
            hosts = [hosts];
        }
        hosts.forEach(function (host) {
            if (!self.routers[host]) self.routers[host] = new routes.Router();
            self.routers[host].addRoute(pattern, cb);
        });
        return self;
    }

    _handler(url, referer, response) {
        var u = urlParse(url)
            , self = this
            ;
        if (this.routers[u.host]) {
            var r = this.routers[u.host].match(u.href.slice(u.href.indexOf(u.host) + u.host.length));
            r.spider = this;
            r.response = response
            r.url = u;
            let window = dom(response.body);
            window.$.fn.spider = function () {
                this.each(function () {
                    var h = window.$(this).get(0).href;
                    if (!isUrl.test(h)) {
                        h = urlResolve(url, h);
                    }
                    self.get(h, url);
                })
            };
            this.currentUrl = url;
            if (jsdom.defaultDocumentFeatures.ProcessExternalResources) {
                $(function () {
                    r.fn.call(r, window, window.$);
                })
            } else {
                r.fn.call(r, window, window.$);
            }
            this.currentUrl = null;
            window.close(); //fix suggested by
        }
    }

    log(level) {
        if (typeof level === 'string') level = logLevels[level];
        this.on('log', function (l, text) {
            if (l >= level) {
                console.log('[' + (logLevels[l] || l) + ']', text)
            }
        });
        return this;
    }

}

Spider.jsdom = jsdom;

module.exports = Spider;