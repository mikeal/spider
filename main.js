let Spider = require('./lib/spider');





module.exports = function (options) {
    return new Spider(options || {})
}



