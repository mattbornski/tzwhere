/* Mocha test
   to use:
     npm install mocha
     mocha <filename>
   or
     npm test
*/

var assert = require('assert');
var path = require('path');
var tzwhere = require('../lib/index');
var util = require('util');

var everythingEuropeTzFile = path.join(__dirname + '/../lib/fake_tz_world.json');
var somelocation = {'lat': 40.0, 'lng': 80.0};

describe('Provide alternative tz world file', function () {
  it('should get the timezone information from the alternative file', function (done) {
    tzwhere.init(everythingEuropeTzFile);
    tzwhere.tzNameAt(somelocation['lat'], somelocation['lng'], function (error, result) {
      if (error) {
        return done(error);
      }
      assert(result === 'Europe/Berlin');
      return done();
    });
  });

  it('should not reparse the file if the same is given again', function () {
    tzwhere.init(everythingEuropeTzFile);
    assert(false == tzwhere.init(everythingEuropeTzFile));
  });
});
