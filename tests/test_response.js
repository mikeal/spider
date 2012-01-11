var assert = require("assert");
var spider = require('../main')();

spider
    .route('nodejs.org', '/',
    function ($) {
        assert.ok(this.response);
        assert.ok(this.response.statusCode);
        assert.ok(this.response.body);
        assert.ok(this.response.body.indexOf("head") !== -1);
        assert.ok($);
        assert.ok($('html').text.length > 0);
        assert.ok($('head').text().length > 0);
        assert.ok($('body').text().length > 0);
        $('a').each(function() {
            var href = $(this).attr('href');
            spider.get(href);
        });
    })
    .route('nodejs.org', '/docs/*', function () {
        assert.equal(this.response.request.href.indexOf("http://nodejs.org/docs/"), 0);
        assert.equal(this.response.statusCode, 200);
    })
    .get('http://nodejs.org/')
    .log('info');

spider
    .route('nodejs.org', '/idonotexist',
    function ($) {
        assert.ok(this.response);
        assert.equal(this.response.statusCode, 404);
        assert.ok($);
        assert.ok($('html').text.length > 0);
        assert.ok($('head').text().length > 0);
        assert.ok($('body').text().length > 0);
    })
    .get('http://nodejs.org/idonotexist')
    .log('info');