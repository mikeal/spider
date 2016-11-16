require('../main')()
  .route('distrowatch.com', '/', function (window, $) {
    console.log('lets go');
    $('.phr2 a').spider();
  })
  .route('distrowatch.com', '/:distro', function(window, $) {

    const distroName = $('h1').text();
    const pic = $('.TablesTitle > a > img').attr('src');
    console.log('got a distro', distroName, pic);
  })
  .get('http://distrowatch.com')
  .log('info');