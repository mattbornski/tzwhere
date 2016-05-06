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

tzwhere.init();
var whiteHouse = {'lat': 38.897663, 'lng': -77.036562};

describe('Readme example', function () {
  it('should properly determine the timezone of the White House', function (done) {
    // This test will also test the callback for those who prefer the async flow.
    tzwhere.tzNameAt(whiteHouse['lat'], whiteHouse['lng'], function (error, result) {
      if (error) {
        return done(error);
      }
      console.log(result);
      assert(result === 'America/New_York');
      return done();
    });
  });

  it('should properly determine the UTC offset of the White House\'s timezone', function (done) {
    var offset = tzwhere.tzOffsetAt(whiteHouse['lat'], whiteHouse['lng']);
    console.log(offset);
    // TODO determine which is correct based on the current state of DST in Eastern time.
    assert(offset === -14400000 || offset === -18000000);
    return done();
  });

  it('should properly determine the times on either side of daylight savings', function (done) {
    // Warning, JS Date has zero-indexed months.
    var before2 = tzwhere.dateAt(whiteHouse['lat'], whiteHouse['lng'], 2012, 02, 10, 0, 0, 0, 0);
    console.log(before2.toString());
    var before = tzwhere.dateAt(whiteHouse['lat'], whiteHouse['lng'], 2012, 02, 11, 0, 0, 0, 0);
    console.log(before.toString());
    var after = tzwhere.dateAt(whiteHouse['lat'], whiteHouse['lng'], 2012, 02, 12, 0, 0, 0, 0);
    console.log(after.toString());
    var after2 = tzwhere.dateAt(whiteHouse['lat'], whiteHouse['lng'], 2012, 02, 13, 0, 0, 0, 0);
    console.log(after2.toString());
    assert((before - before2) === (after2 - after));
    assert((after - before) < (before - before2));
    assert(((after - before) / 23) === ((after2 - after) / 24));
    return done();
  });

  it('should determine nearest time zone for the sea coordinate', function (done) {
    var seaPlace = {'lat': 56.1460, 'lng': 5.1120};
    tzwhere.tzNameAt(seaPlace['lat'], seaPlace['lng'], function (error, result) {
      if (error) {
        return done(error);
      }
      // tzNameAt should find nothing
      assert(result === null);
      // tzNameNear should find nearest place
      var result = tzwhere.tzNameNear(seaPlace['lat'], seaPlace['lng']);
      assert(result['tz'] === 'Europe/Oslo');
      console.log(result['tz'] + ' ' + result['data']['distance']);
      return done();
    });
  });

  after(function () {
    console.log(util.inspect(process.memoryUsage()));
  });
});
