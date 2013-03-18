/**
 * AS taken from this gist https://gist.github.com/gmarcus/934787
 * original dies after 840 fetches
 * @type {*}
 */

var sys = require('sys');
var util = require('util');
var spider = require('../main');
var counter = 0;

spider()
    .route('itunes.apple.com', '/us/genre/*', function (window, $) {
        if (this.fromCache) return;

        console.log("Fetching page: %s, for the %s th time", this.spider.currentUrl, ++counter);

        // spider all genres
        $('div#genre-nav.main.nav a').spider();

        // spider all letters per genre
        $('div#selectedgenre ul.list.alpha li a').spider();

        // spider all numbered pages of letters per genre
        $('div#selectedgenre ul.list.paginate li a').spider();


        // // fetch apps JSON and store in a database (not implemented yet)
        // $("#selectedgenre .column a").each(function(i,a) {
        // 	// extract the iTunes URL
        // 	var aHref = a.href;
        // 	console.log("Recording " + aHref);
        //
        // });

//	console.log(util.inspect(this.spider, false, null));
    })
    .get('http://itunes.apple.com/us/genre/ios/id36?mt=8')
    .log('info')
;