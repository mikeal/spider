var spider = require('../main');

var COUNT = {
  total: 0,
  node: 0
};

spider({
  delay: 6 * 1000,
  concurrency: 2,
  finish: function() {
    process.exit();
  }
})
.route('www.v2ex.com', '/planes', function(window, $) {
  if (this.fromCache) {
    return;
  }

  console.log('nodes ' + $('a.item_node').size());

  $('a.item_node').spider();
})
.route('www.v2ex.com', '/go/*', function(window, $) {
  if (this.fromCache) {
    return;
  }

  var count = parseInt($('.header .fr .gray').text().trim(), 10);
  var go = {
    name: window.document.title.replace('V2EX ›', '').trim(),
    count: Number.isInteger(count) ? count : 0
  };

  console.log('node (' + (++COUNT.node) + ') ' + go.name + ' [' + go.count + ']');
  COUNT.total = COUNT.total + go.count;
  console.log('total [' + COUNT.total + ']');
})
.get('https://www.v2ex.com/planes')
.log('debug');
