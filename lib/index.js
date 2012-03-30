var fs = require('fs');
var geolib = require('geolib');
var path = require('path');
var time = require('time');

// The "shortcut" iterates the timezone polygons when they are read in, and
// determines the minimum/maximum longitude of each.  Because there are what
// we professionals refer to as "a shitload" of polygons, and because the
// naive method I use for determining which timezone contains a given point
// could in the worst case require calculations on the order of O(shitload),
// I take advantage of the fact that my particular dataset clusters very
// heavily by degrees longitude.
// TODO cache this with file and read from cached file.
var SHORTCUT_DEGREES = 1;
// Maybe you only care about one region of the earth.  Exclude "America" to
// discard timezones that start with "America/", such as "America/Los Angeles"
// and "America/Chicago", etc.
var EXCLUDE_REGIONS = [];

var timezoneNamesToPolygons = null;
var timezoneLongitudeShortcuts = null;
var geoJsonTimezoneFilePath = path.join(__dirname, 'tz_world.json');
var constructedShortcutFilePath = path.join(__dirname, 'shortcuts.json');

var constructShortcuts = function () {
  // Construct once
  if ((timezoneNamesToPolygons === null) || (timezoneLongitudeShortcuts === null)) {
    // Try to read from cache first
    if (false) {
      // TODO read from cached shortcut file
    } else {
      var now = Date.now();
      var featureCollection = JSON.parse(fs.readFileSync(geoJsonTimezoneFilePath, 'utf-8'));
      timezoneNamesToPolygons = {};
      for (var featureIndex in featureCollection['features']) {
        var tzname = featureCollection['features'][featureIndex]['properties']['TZID'];
        var region = tzname.split('/')[0];
        if (EXCLUDE_REGIONS.indexOf(region) === -1) {
          if (featureCollection['features'][featureIndex]['geometry']['type'] === 'Polygon') {
            var polys = featureCollection['features'][featureIndex]['geometry']['coordinates'];
            if (polys.length > 0 && !(tzname in timezoneNamesToPolygons)) {
              timezoneNamesToPolygons[tzname] = [];
            }
            for (var polyIndex in polys) {
              // WPS84 coordinates are [long, lat], while many conventions are [lat, long]
              // Our data is in WPS84.  Convert to an explicit format which geolib likes.
              var poly = [];
              for (var pointIndex in polys[polyIndex]) {
                poly.push({'lat': polys[polyIndex][pointIndex][1], 'lng': polys[polyIndex][pointIndex][0]});
              }
              timezoneNamesToPolygons[tzname].push(poly);
            }
          } else {
            console.log('WARNING Non-polygon region "' + tzname + '", ignored');
          }
        }
      }
      timezoneLongitudeShortcuts = {};
      for (var tzname in timezoneNamesToPolygons) {
        for (var polyIndex in timezoneNamesToPolygons[tzname]) {
          var poly = timezoneNamesToPolygons[tzname][polyIndex]
          var bounds = geolib.getBounds(poly);
          var minLng = Math.floor(bounds['minLng'] / SHORTCUT_DEGREES) * SHORTCUT_DEGREES;
          var maxLng = Math.floor(bounds['maxLng'] / SHORTCUT_DEGREES) * SHORTCUT_DEGREES;
          for (var degree = minLng; degree <= maxLng; degree += SHORTCUT_DEGREES) {
            if (!(degree in timezoneLongitudeShortcuts)) {
              timezoneLongitudeShortcuts[degree] = {};
            }
            if (!(tzname in timezoneLongitudeShortcuts[degree])) {
              timezoneLongitudeShortcuts[degree][tzname] = [];
            }
            timezoneLongitudeShortcuts[degree][tzname].push(polyIndex);
          }
        }
      }
      console.log(Date.now() - now + 'ms to construct shortcut table');
      // Now that we've painstakingly constructed the shortcut table, let's
      // write it to cache so that future generations will be saved the ten
      // seconds of agony.
      // TODO
    }
  }
};
// Incur this cost at module import.
constructShortcuts();

var tzNameAt = function (latitude, longitude) {
  var degree = Math.floor(longitude / SHORTCUT_DEGREES) * SHORTCUT_DEGREES;
  var possibleTimezones = timezoneLongitudeShortcuts[degree];
  if (possibleTimezones) {
    if (Object.keys(possibleTimezones).length === 1) {
      return Object.keys(possibleTimezones)[0];
    } else {
      for (var tzname in possibleTimezones) {
        for (var polyIndexIndex in possibleTimezones[tzname]) {
          var polyIndex = possibleTimezones[tzname][polyIndexIndex];
          var poly = timezoneNamesToPolygons[tzname][polyIndex];
          if (geolib.isPointInside({'lat': latitude, 'lng': longitude}, poly)) {
            return tzname;
          }
        }
      }
    }
  }
  return null;
};

// Accepts latitude, longitude, ... where ... are arguments applicable to a "new Date(...)" call
var dateAt = function () {
  var tzname = tzNameAt(arguments[0], arguments[1]);
  if (tzname) {
    return time.Date.apply(new time.Date(), Array.prototype.slice.call(arguments, 2).concat([tzname]));
  }
  return null;
};

// This will return "number of milliseconds to add to UTC to get a date in
// this time".  I know that's not a terribly obvious format, but it does let
// you go:
//   UTC standard date + offset = local date.
// Which is a little bit useful for things like when some event expressed in
// UTC happens in local time for multiple timezones around the world.
// Personally I don't get much use out of it, YMMV.
// Why milliseconds?  Because it's the time denomination of choice for JS.
var tzOffsetAt = function (latitude, longitude) {
  var tzname = tzNameAt(latitude, longitude);
  if (tzname) {
    var utc = new time.Date(1970, 0, 1, 0, 0, 0, 0, 'UTC');
    var local = new time.Date(1970, 0, 1, 0, 0, 0, 0, tzname);
    // utc - local = offset
    // utc + offset = local
    return (utc - local);
  }
  return null;
};

// Allows you to call
// tzwhere.tzoffset(lat, long, function (error, offset) {
//   console.log(error ? error : offset);
// });
// with error handling and callback syntax, as well as
// console.log(tzwhere.tzoffset(lat, long));
// without error handling.
var wrap = function (f) {
  return function () {
    var error = null;
    var result = null;

    var callback = (typeof(arguments[arguments.length - 1]) == 'function') ? arguments[arguments.length - 1] : null;
    try {
      result = f.apply(this, callback ? Array.prototype.slice.call(arguments, 0, arguments.length - 1) : arguments);
    } catch (e) {
      error = e;
    }

    if (callback) {
      callback(error, result);
    } else if (error) {
      throw error;
    } else {
      return result;
    };
  };
}

module.exports = {
  'tzNameAt': wrap(tzNameAt),
  'dateAt': wrap(dateAt),
  'tzOffsetAt': wrap(tzOffsetAt),
};