var fs = require('fs');
var geolib = require('geolib');
var path = require('path');
var sets = require('simplesets');
var EE = require('events').EventEmitter;

function hr(time) {
	if (!time) {
		return process.hrtime();
	}
	var diff = process.hrtime(time);
	return +(diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
}

var events = new EE();

// Create a Timezone function that knows about all the world's time zones. Add a
// custom `strftime` format specifier `%+` that returns the time zone offset in
// milliseconds.
var tz = require('timezone')(require('timezone/zones'), function () {
  this["+"] = function () { return this.entry.offset + this.entry.save }
});

// The "shortcut" iterates the timezone polygons when they are read in, and
// determines the minimum/maximum longitude of each.  Because there are what
// we professionals refer to as "a shitload" of polygons, and because the
// naive method I use for determining which timezone contains a given point
// could in the worst case require calculations on the order of O(shitload),
// I take advantage of the fact that my particular dataset clusters very
// heavily by degrees longitude.
// TODO cache this with file and read from cached file.
var SHORTCUT_DEGREES_LATITUDE = 1;
var SHORTCUT_DEGREES_LONGITUDE = 1;
// Maybe you only care about one region of the earth.  Exclude "America" to
// discard timezones that start with "America/", such as "America/Los Angeles"
// and "America/Chicago", etc.
var EXCLUDE_REGIONS = [];

var timezoneNamesToPolygons = null;
var timezoneLongitudeShortcuts = null;
var timezoneLatitudeShortcuts = null;
// Later initialized as array [lat][lon], where lat and lon are Math.floor
// product for given coords - contains just polygon points having same coords
// after applying Math.floor() to point coords.
var polyPointsShortcuts = null;
var currentTzWorld;
var constructedShortcutFilePath = null;
var constructionLock = null;
var cache;

// Init
// by default using the provided tz_world.json file, alternativly a similar file
// can be passed ie. for debugging and testing
var init = function(params){
  events.emit('loading');
  params = params || {};

  constructedShortcutFilePath = path.join(params.tmpDir || __dirname, 'shortcuts.json');
  constructionLock = path.join(params.tmpDir || __dirname, 'shortcuts.lock');

  var tzWorldFile = typeof params === 'string' ? params :
  params.tzFile || path.join(__dirname, 'tz_world.json');

  if(currentTzWorld !== tzWorldFile) {
    currentTzWorld = tzWorldFile;
    // reinit on change
    timezoneNamesToPolygons = null;
    timezoneLongitudeShortcuts = null;
    timezoneLatitudeShortcuts = null;
    polyPointsShortcuts = null;
    load(tzWorldFile);
    return true;
  } else {
    return false
  }
};

var load = function () {
	var now = hr();
	if (fs.existsSync(constructedShortcutFilePath)) {
		cache = JSON.parse(fs.readFileSync(constructedShortcutFilePath, 'utf-8'));
		events.emit('loaded', { from: 'cache', time: hr(now) });
	} else if (fs.existsSync(constructionLock)) {
		events.emit('lock', { state: 'watching', time: hr(now) });
		fs.watchFile(constructionLock, { interval: 300 }, function (curr) {
			// there is one modification available: unlink
			fs.unwatchFile(constructionLock);
			events.emit('lock', { state: 'unlock', time: hr(now) });
			load.apply(null, arguments);
		});
		return;
	}
	constructShortcuts.apply(null, arguments);
};

var saveCache = function () {
	var now = hr();
	var _cache = JSON.stringify({
		timezoneNamesToPolygons: timezoneNamesToPolygons,
		timezoneLatitudeShortcuts: timezoneLatitudeShortcuts,
		timezoneLongitudeShortcuts: timezoneLongitudeShortcuts,
		polyPointsShortcuts: polyPointsShortcuts
	});
	fs.writeFile(constructedShortcutFilePath, _cache, function (err) {
		try {
			fs.unlinkSync(constructionLock);
		} catch (e) {
			// there is possible race between workers
			events.emit('error', e);
		}

		if (err) {
			return events.emit('error', err);
		}
		events.emit('cache', { state: 'saved', time: hr(now) });
	});
};

var addPolyPointShortcut = function (tzname, pointObj) {
  var latFloor = Math.floor(pointObj.lat);
  var lngFloor = Math.floor(pointObj.lng);
  if (polyPointsShortcuts[latFloor] === undefined) {
    polyPointsShortcuts[latFloor] = [];
  }
  if (polyPointsShortcuts[latFloor][lngFloor] === undefined) {
    polyPointsShortcuts[latFloor][lngFloor] = {};
  }
  if (polyPointsShortcuts[latFloor][lngFloor][tzname] === undefined) {
    polyPointsShortcuts[latFloor][lngFloor][tzname] = [];
  }
  polyPointsShortcuts[latFloor][lngFloor][tzname].push(pointObj);
};

var constructShortcuts = function (tzWorldFile) {
  // Construct once
	var now = hr();
	if ((timezoneNamesToPolygons === null) || (timezoneLongitudeShortcuts === null)) {
    if (cache) {
	    timezoneNamesToPolygons = cache.timezoneNamesToPolygons;
	    timezoneLatitudeShortcuts = cache.timezoneLatitudeShortcuts;
	    timezoneLongitudeShortcuts = cache.timezoneLongitudeShortcuts;
	    polyPointsShortcuts = cache.polyPointsShortcuts;
    } else {
      fs.writeFileSync(constructionLock, '1');
      var featureCollection = JSON.parse(fs.readFileSync(tzWorldFile, 'utf-8'));
      timezoneNamesToPolygons = {};
      polyPointsShortcuts = [];
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
                var point = {'lat': polys[polyIndex][pointIndex][1], 'lng': polys[polyIndex][pointIndex][0]};
                poly.push(point);
                // create polygon members shortcuts
                addPolyPointShortcut(tzname, point);
              }
              timezoneNamesToPolygons[tzname].push(poly);
            }
          } else {
            console.log('WARNING Non-polygon region "' + tzname + '", ignored');
          }
        }
      }
      timezoneLongitudeShortcuts = {};
      timezoneLatitudeShortcuts = {};
      for (var tzname in timezoneNamesToPolygons) {
        for (var polyIndex in timezoneNamesToPolygons[tzname]) {
          var poly = timezoneNamesToPolygons[tzname][polyIndex]
          var bounds = geolib.getBounds(poly);
          var minLng = Math.floor(bounds['minLng'] / SHORTCUT_DEGREES_LONGITUDE) * SHORTCUT_DEGREES_LONGITUDE;
          var maxLng = Math.floor(bounds['maxLng'] / SHORTCUT_DEGREES_LONGITUDE) * SHORTCUT_DEGREES_LONGITUDE;
          var minLat = Math.floor(bounds['minLat'] / SHORTCUT_DEGREES_LATITUDE) * SHORTCUT_DEGREES_LATITUDE;
          var maxLat = Math.floor(bounds['maxLat'] / SHORTCUT_DEGREES_LATITUDE) * SHORTCUT_DEGREES_LATITUDE;
          for (var degree = minLng; degree <= maxLng; degree += SHORTCUT_DEGREES_LONGITUDE) {
            if (!(degree in timezoneLongitudeShortcuts)) {
              timezoneLongitudeShortcuts[degree] = {};
            }
            if (!(tzname in timezoneLongitudeShortcuts[degree])) {
              timezoneLongitudeShortcuts[degree][tzname] = [];
            }
            timezoneLongitudeShortcuts[degree][tzname].push(polyIndex);
          }
          for (var degree = minLat; degree <= maxLat; degree += SHORTCUT_DEGREES_LATITUDE) {
            if (!(degree in timezoneLatitudeShortcuts)) {
              timezoneLatitudeShortcuts[degree] = {};
            }
            if (!(tzname in timezoneLatitudeShortcuts[degree])) {
              timezoneLatitudeShortcuts[degree][tzname] = [];
            }
            timezoneLatitudeShortcuts[degree][tzname].push(polyIndex);
          }
        }
      }

      events.emit('loaded', { from: 'calc', time: hr(now) });
      saveCache();
    }
  }
};

var tzNameAt = function (latitude, longitude) {
  var latTzOptions = timezoneLatitudeShortcuts[Math.floor(latitude / SHORTCUT_DEGREES_LATITUDE) * SHORTCUT_DEGREES_LATITUDE];
  var latSet = new sets.Set(Object.keys(latTzOptions));
  var lngTzOptions = timezoneLongitudeShortcuts[Math.floor(longitude / SHORTCUT_DEGREES_LONGITUDE) * SHORTCUT_DEGREES_LONGITUDE];
  var lngSet = new sets.Set(Object.keys(lngTzOptions));
  var possibleTimezones = lngSet.intersection(latSet).array();
  if (possibleTimezones.length) {
    if (possibleTimezones.length === 1) {
      return possibleTimezones[0];
    } else {
      for (var tzindex in possibleTimezones) {
        var tzname = possibleTimezones[tzindex];
        var polyIndices = new sets.Set(latTzOptions[tzname]).intersection(new sets.Set(lngTzOptions[tzname])).array();
        for (var polyIndexIndex in polyIndices) {
          var polyIndex = polyIndices[polyIndexIndex];
          var poly = timezoneNamesToPolygons[tzname][polyIndex];
          var found = geolib.isPointInside({'lat': latitude, 'lng': longitude}, poly);
          if (found) {
            return tzname;
          }
        }
      }
    }
  }
  return null;
};

// Accepts [date constructor arguments ...], tzname
var dateIn = function () {
  if (arguments.length === 0) {
    return null;
  } else {
    var vargs = [], tzname, date;
    vargs.push.apply(vargs, arguments);
    tzname = vargs.pop();
    vargs.length > 1 && vargs[1]++; // zero month to humane month.
    date = vargs.length ? vargs.length == 1 ? vargs[0] : vargs.slice(0, 7) : Date.now();
    return tz(date, tzname);
  }
};

// Accepts latitude, longitude, ... where ... are arguments applicable to a "new
// Date(...)" call.
//
// Like new Date() and unlike Date.UTC(), dateAt() treats a single integer value
// as milliseconds since the epoch.
var dateAt = function () {
  var tzname = tzNameAt(arguments[0], arguments[1]);
  if (tzname) {
    // Pass any date constructors through.
    return dateIn.apply(this, Array.prototype.slice.call(arguments, 2).concat([tzname]));
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
//
// Now accepts a wall clock time for the location and converts the wall clock
// time to the time zone offset for the location at the given wall clock time.
//
// Like new Date() and unlike Date.UTC(), tzOffsetAt() treats a single integer
// value as milliseconds since the epoch.
var tzOffsetAt = function () {
  var vargs = [], tzname, date;
  vargs.push.apply(vargs, arguments);
  tzname = tzNameAt(vargs.shift(), vargs.shift());
  if (tzname) {
    vargs.length > 1 && vargs[1]++; // zero month to humane month.
    date = vargs.length ? vargs.length == 1 ? vargs[0] : vargs.slice(0, 7) : Date.now();
    return + tz(date, '%+', tzname);
  }
  return null;
};

// Search for some points near (latFl, lonFl) = latitude and longitude floor.
// Do not use if precisely nearest point has to be searched.
//
// Requires polyPointsShortcuts to be filled in (array of timezone polygon points
// present in <(latFl, lonFl), (latFl + 1, lonFl + 1)) interval).
//
// Search is stopped when first data field is encountered, althrough it is not
// the nearest possible point. Search is done in clockwise iteration around input
// point, starting by 1 step left, 1 step up, 2 steps right, 2 steps down,
// 3 steps left, 3 steps up and so forth and so on.
//
// Return object with timezones and its polygon points for (latFl, lonFl).
//   {tzname: [points for latFl, lonFl]}
var searchNeighbours = function(latFl, lonFl, maxDist) {
  // maximum sides to process - one "circle" is 4 sides
  // thus maxRectSides/4 is approx distance in degrees to search.
  // (Very inaccurate, because corners are 1.4 * more distant then line centers)
  var maxRectSides = maxDist * 4;
  var y = latFl, x = lonFl;
  // (lat, lon) diffs for [left, up, right, down]
  var dirDiff = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  var dir = 0, step = 1, stepInc = true;

  // process sides up to limit
  for (var i = 0; i < maxRectSides; i++) {
    // process whole direction
    for (var j = 0; j < step; j++) {
      x += dirDiff[dir][1];
      y += dirDiff[dir][0];
	  // out of latitude bounds?
	  if (! polyPointsShortcuts[y]) continue;
	  // return first occurence, if there are some timezones on this tile
	  if (polyPointsShortcuts[y][x]) return polyPointsShortcuts[y][x];
    }
	// increment step every second iteration
	stepInc = !stepInc;
	if (stepInc) step++;
	// change direction after each processed side
	dir = (dir + 1) % 4;
  }
  return undefined;
}

// Search for roughly nearest timezone at given coords. If no timezone polygon
// border points are present for 1 degree rounding of (lat, lon), surrounding
// points are searched up to distance approx maxDistance degrees.
// Distance is measured to timezone polygons border points only, so precision
// should be very low for two very distant polygon points connecting straight
// border.
//
// Return object with properties:
//   .tz    Timezone name.
//   .data  Polygon border point marked as nearest to input coords:
//     .distance  Distance from input coords in meters.
//     .latitude  Point lat.
//     .longitude Point lon.
var tzNameNear = function (latitude, longitude, maxDistance) {
  var maxDistance = typeof maxDistance === 'undefined' ? 10 : maxDistance;
  var latFl = Math.floor(latitude);
  var lngFl = Math.floor(longitude);
  var latShortcuts = polyPointsShortcuts[latFl];
  if (! latShortcuts) return undefined;
  var points = latShortcuts[lngFl];
  var minDist = Infinity;
  var minTz = {};
  // search for near points, if there is nothing on this tile
  if (points === undefined) points = searchNeighbours(latFl, lngFl, maxDistance);
  // tile could have more timezones, search for nearest polygon point
  for (var tzname in points) {
    var near = geolib.findNearest({'lat': latitude, 'lng': longitude}, points[tzname]);
    if (near.distance < minDist) {
      minDist = near.distance;
      minTz.data = near;
      minTz.tz = tzname;
    }
  }
  return minTz;
}

var tzInfo = function () {
  var tzData = { tz: tzNameAt.apply(this, arguments) };
  if (!tzData.tz) {
    tzData = tzNameNear.apply(this, arguments);
  }
  var name = tzData.tz;
  if (name) {
    var result = {
      offset: + tz(Date.now(), '%+', name),
      name  : name
    };
    if (tzData.data) {
      result.near = tzData.data;
    }
    return result;
  }
  return null;
}

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

events.init = init;
events.tzNameAt = wrap(tzNameAt);
events.dateAt = wrap(dateAt);
events.dateIn = wrap(dateIn);
events.tzOffsetAt = wrap(tzOffsetAt);
events.initzNameNear = wrap(tzNameNear);
events.tzInfo = wrap(tzInfo);

module.exports = events;
