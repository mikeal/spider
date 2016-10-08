class MemCache {

    constructor() {
        this.cache = {};
    }
    get(url, cb) {
        if (!this.cache[url]) return cb(null);
        cb({headers: this.cache[url].headers, body: this.cache[url].body.toString()});
    }
    set(url, headers, body) {
        this.cache[url] = {headers: headers, body: new Buffer(body)};
    }
    getHeaders(url, cb) {
        if (!this.cache[url]) return cb(null);
        cb(this.cache[url].headers);
    }
}

module.exports = MemCache;