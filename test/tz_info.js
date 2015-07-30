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

describe('Full info', function () {
  it('should return object with tzdata', function (done) {
    assert.deepEqual(tzwhere.tzInfo(57.182631, 65.558412), { offset: 18000000, name: 'Asia/Yekaterinburg' });
    assert.deepEqual(tzwhere.tzInfo(55.755768, 37.617671), { offset: 10800000, name: 'Europe/Moscow' });
    assert.deepEqual(tzwhere.tzInfo(55.030199, 82.920430), { offset: 21600000, name: 'Asia/Novosibirsk' });
    assert.deepEqual(tzwhere.tzInfo(41.006611, 28.978200), { offset: 10800000, name: 'Europe/Istanbul',
      near: {
        key      : '100',
        latitude : 41.009945,
        longitude: 28.976223,
        distance : 406
        }
      });
    return done();
  });

  after(function () {
    console.log(util.inspect(process.memoryUsage()));
  });
});
