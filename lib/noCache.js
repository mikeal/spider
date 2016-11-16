class NoCache {
    get(url, cb) { cb(null)}
    getHeaders(url, cb) {cb(null)}
    set(url, headers, body) {}
}

module.exports = NoCache;