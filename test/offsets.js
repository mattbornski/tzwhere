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

describe('Known timezones', function () {
  it('should return knowns deltas', function (done) {
    var ny = tzwhere.dateIn(2012, 3, 1, 0, 0, 0, 0, 'America/New_York');
    var chicago = tzwhere.dateIn(2012, 3, 1, 0, 0, 0, 0, 'America/Chicago');
    var la = tzwhere.dateIn(2012, 3, 1, 0, 0, 0, 0, 'America/Los_Angeles');
    assert(+ny + 1 * 3600 * 1000 === +chicago);
    assert(+ny + 3 * 3600 * 1000 === +la);
    assert(+la === 1333263600000);
    assert(+ny === 1333252800000);
    return done();
  });
  
  after(function () {
    console.log(util.inspect(process.memoryUsage()));
  });
});