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

describe('Coverage checker', function () {
  it('should be able to identify distinct timezones at a high percentage of locations at 48°N', function (done) {
    var results = {};
    for (var longitude = -180 ; longitude < 180 ; longitude++) {
      var tzname = tzwhere.tzNameAt(48, longitude);
      if (!(tzname in results)) {
        results[tzname] = 0;
      }
      results[tzname] += 1;
    }
    for (var tzname in results) {
      console.log(tzname + ': ' + results[tzname]);
    }
    // Coverage should include Europe, Asia, and America
    var continents = {};
    for (var tzname in results) {
      var continent = tzname.split('/')[0];
      if (!(continent in continents)) {
        continents[continent] = 0;
      }
      continents[continent] += results[tzname];
    }
    assert(Object.keys(continents).length === 4);
    console.log(continents);
    assert('Europe' in continents);
    assert('Asia' in continents);
    assert('America' in continents);
    assert(null in continents);
    // At this latitude, there is more land area than water area.
    assert(continents['Asia'] + continents['Europe'] + continents['America'] > continents[null]);
    assert(continents['Asia'] > continents['America']);
    assert(continents['America'] > continents['Europe']);
    return done();
  });
  
  it('should find appropriate timezones and offsets in Australia', function (done) {
    var results = {};
    for (var latitude = -30; latitude <= -22; latitude++) {
      for (var longitude = 117 ; longitude <= 147 ; longitude++) {
        var tzname = tzwhere.tzNameAt(latitude, longitude);
        if (!(tzname in results)) {
          results[tzname] = 0;
        }
        results[tzname] += 1;
      }
    }
    for (var tzname in results) {
      console.log(tzname + ': ' + results[tzname]);
    }
    assert(results[null] === undefined);
    for (var tzname in results) {
      assert(tzname.indexOf('Australia/') === 0);
    }
    return done();
  });
  
  after(function () {
    console.log(util.inspect(process.memoryUsage()));
  });
});