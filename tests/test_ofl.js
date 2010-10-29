var spider = require('../main');

var uri = "http://www.openfontlibrary.org/files";

spider({uri:uri}, function (window, $) {
  var self = this;
  'Latest Files &amp;mdash; Open Font Library.org'
  if (window.location.href == "http://www.openfontlibrary.org/files") {
    $('h2 a').each(function(e, n){
      var href = $(n).attr('href')
      if (href.indexOf('/files/') !== -1) {
        self.spider(href);
      }
    })
  } else {
    var doc = {name: $('span[property="dc:title"]').text(), urls:[]}
    $('h4 a').each(function (i, n) {
      if ($(n).attr('href').slice(0,4) == 'http' && doc.urls.indexOf($(n).attr('href')) === -1) {
        doc.urls.push($(n).attr('href'))
      }      
    })
    console.dir(doc)
  }
})
