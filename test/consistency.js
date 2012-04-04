/* Mocha test
   to use:
     npm install mocha
     mocha <filename>
   or
     npm test
*/

var assert = require('assert');
var tzwhere = require('../lib/index');
var util = require('util');

var targetLocation = {'lat': 38.649005786109, 'lng': -121.51802471851};
var targetDateString = '01/01/2012';

describe('Times at locations', function () {
  it('should be consistent across multiple requests', function (done) {
    var targetDate = Date.parse(targetDateString, 'M/d/y');
    var dates = [];
    for (var i = 0; i < 10; i++) {
      dates.push(+tzwhere.dateAt(targetLocation['lat'], targetLocation['lng'], targetDate));
    }
    console.log(dates);
    assert(dates.length === 10);
    var min = Math.min.apply(this, dates);
    var max = Math.max.apply(this, dates);
    assert(min === max);
    assert(min === dates[0]);
    return done();
  });

  after(function () {
    console.log(util.inspect(process.memoryUsage()));
  });
});