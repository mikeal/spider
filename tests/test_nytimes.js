var spider = require('../main');

spider()
.route('www.nytimes.com', '/pages/dining/index.html', function (window, $) {
  $('a').spider();
})
.route('travel.nytimes.com', '*', function (window, $) {
  $('a').spider();
  if (this.fromCache) return;

  var article = { title: $('nyt_headline').text(), articleBody: '', photos: [] }
  article.body = '' 
  $('div.articleBody').each(function () {
    article.body += this.outerHTML;
  })
  $('div#abColumn img').each(function () {
    var p = $(this).attr('src');
    if (p.indexOf('ADS') === -1) {
      article.photos.push(p);
    }
  })
  // console.log(article);
})
.route('dinersjournal.blogs.nytimes.com', '*', function (window, $) {
  var article = {title: $('h1.entry-title').text()}
  // console.log($('div.entry-content').html())
})
.get('http://www.nytimes.com/pages/dining/index.html')
.log('info')
;