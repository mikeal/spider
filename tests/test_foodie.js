var spider = require('../main')
  , urlParse = require('url').parse
  ;

var dishes = [];

process.on('exit', function () {
  console.log('number,dish,restaurant,address,telephone,info,title')
  dishes.forEach(function (row) {
    var line = '';
    line += JSON.stringify(row.number || '')
    line += ','
    line += JSON.stringify(row.dish || '')
    line += ','
    line += JSON.stringify(row.restaurant || '')
    line += ','
    line += JSON.stringify(row.address || '')
    line += ','
    line += JSON.stringify(row.telephone || '')
    line += ','
    line += JSON.stringify(row.info || '')
    line += ','
    line += JSON.stringify(row.title || '')
    console.log(line)
  })
})

var s = spider()
s.route('blogs.sfweekly.com', '/foodie/sfoodies_92/index.php*', function (window, $) {
  $('div.primaryCategory:contains("SFoodie\'s 92")')
  .each(function () {
    var entry = $(this).parent()
      , title = entry.find('h2').text()
      ;

    number = parseInt(title.slice(4, title.indexOf(':')))
    
    if (isNaN(number)) return;
    
    title = title.slice(title.indexOf(':')+2)
    
    var restaurant, dish;
    if (title.indexOf(' at ') !== -1) {
      dish = title.slice(0, title.indexOf(' at '))
      restaurant = title.slice(title.indexOf(' at ')+' at '.length);
    } else if (title.indexOf(' from ') !== -1) {
      dish = title.slice(0, title.indexOf(' from '))
      restaurant = title.slice(title.indexOf(' from ')+' from '.length);
    } else if (title.indexOf('\'s') !== -1) {
      restaurant = title.slice(0, title.indexOf('\'s'))
      dish = title.slice(title.indexOf('\'s')+'\'s '.length);
    } else if (title.indexOf('s\'') !== -1) {
      restaurant = title.slice(0, title.indexOf('s\'')+1)
      dish = title.slice(title.indexOf('s\'')+'s\' '.length);
    }
    
    var infourl = entry.find('a.moreLink')
      , csv = {number:number,title:title,dish:dish,restaurant:restaurant}
      , info
      ;
    if (infourl.length !== 0) {
      var u = urlParse(infourl.attr('href'));
      s.route(u.hostname, u.pathname, function (window, $) {
        var text = $('strong:contains("'+restaurant+'")').parent().text()
        text = text.slice(text.indexOf(restaurant+':')+(restaurant+':').length+1)
        info = text.slice(0, text.indexOf('\n'))
        csv.info = info
        if (info.lastIndexOf('-') !== -1) {
          var phone = info.slice(info.lastIndexOf('-')-3, info.lastIndexOf('-')+5);
          if (!isNaN(parseInt(phone.replace('-','')))) {
            csv.telephone = phone
            csv.address = info.slice(0, info.indexOf(csv.phone)-2)
          }
        }
      })
      s.get(u.href)
    }
    
    dishes.push(csv)
  })

  $('a').spider();
})
s.get('http://blogs.sfweekly.com/foodie/sfoodies_92/index.php?page=1');
  