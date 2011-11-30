var spider = require('../main');

var jsSpider = spider();

jsSpider.route('developer.mozilla.org', '/en/JavaScript/Reference', function ($) {
  var crawlfn = function() {
    var href = $(this).attr('href');
    jsSpider.get(href);
  };
  $('#section_2 a').each(crawlfn);
  $('#section_4 a').each(crawlfn);
  $('#section_5 a').each(crawlfn);
});

var subroutes = [
  'Javascript/Reference/Global_Objects',
  'Javascript/Reference/Statements',
  'Javascript/Reference/Operators',
  'JavaScript_typed_arrays',
];
for (var i = 0; i < subroutes.length; ++i) {
  var subroute = subroutes[i];
  jsSpider.route('developer.mozilla.org', '/en/' + subroute + '/*', function ($, url) {
    console.log(url + ' :: ' + $('#title').text().trim());
    var crawlfn = function() {
      var href = $(this).attr('href');
      jsSpider.get(href);
    };
    $('#pageText a').each(crawlfn);
  });
}

jsSpider.get('https://developer.mozilla.org/en/JavaScript/Reference').log('info');

