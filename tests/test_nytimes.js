var spider = require('../main')();

spider.
    route('www.nytimes.com', '/pages/dining/index.html',
    function ($) {
        $('a').each(function() {
            var href = $(this).attr('href');
            console.log("spidering " + href);
            spider.get(href);
        });
    }).
    route('travel.nytimes.com', '*',
    function ($) {
        $('a').each(function() {
            var href = $(this).attr('href');
            spider.get(href);
        });
        if (this.fromCache) return;

        var article = { title: $('nyt_headline').text(), photos: [] };
        article.body = '';
        $('div.articleBody').each(function () {
            article.body += this.outerHTML;
        });
        $('div#abColumn img').each(function () {
            var p = $(this).attr('src');
            if (p.indexOf('ADS') === -1) {
                article.photos.push(p);
            }
        });
        console.log(article.photos);
    }).
    get('http://www.nytimes.com/pages/dining/index.html').log('info');