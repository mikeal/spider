const dom = require('../lib/dom');

describe('dom', function () {

    let htmlFragment;

    beforeEach(function () {
        htmlFragment = '<h1>hello</h1>';
    });

    it('should return a window object with a $ property', function () {
        let result = dom(htmlFragment);
        should.exist(result.$);
    });

    it('should return a window object with a functioning $ jquery like function.', function() {
        let result = dom(htmlFragment);
        result.$('h1').text().should.equal('hello');
    });
})
