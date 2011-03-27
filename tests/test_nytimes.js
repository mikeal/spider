var spider = require('../main');

var s = spider.createSpider();

s.route('www.nytimes.com', '/pages/dining/index.html', function (window, $) {
  $('a').each(function () {
    s.get($(this).attr('href'));
  })
})
s.route('travel.nytimes.com', '*', function (window, $) {
  var article = { title: $('nyt_headline').text(), articleBody: '', photos:[] }
  article.body = '' 
  console.log(this.outerHTML)
  $('div.articleBody').each(function () {
    article.body += $(this).html();
  })
  $('div#abColumn img').each(function () {
    var p = $(this).attr('src');
    if (p.indexOf('ADS') === -1) {
      article.photos.push(p);
    }
  })
  console.log(article);
})
// s.route('dinersjournal.blogs.nytimes.com', '*', function (window, $) {
//   var article = {title: $('h1.entry-title').text()}
//   console.log($('div.entry-content').html())
// })
s.get('http://www.nytimes.com/pages/dining/index.html');
s.log('info')