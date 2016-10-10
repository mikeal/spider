const jsdom = require('jsdom');

jsdom.defaultDocumentFeatures = {
    FetchExternalResources: []
    , ProcessExternalResources: false
    , MutationEvents: false
    , QuerySelector: false
};

module.exports = function dom(html) {
    let jsDom = jsdom.jsdom;
    let doc = jsDom(html);
    var window = doc.defaultView;
    let $ = require('jquery')(window);
    return window;
};

module.exports.jsdom = jsdom;