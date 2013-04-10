# tzwhere [![Build Status](https://travis-ci.org/mattbornski/tzwhere.png)](http://travis-ci.org/mattbornski/tzwhere)

Determine timezone from lat/long in NodeJS

## Installation

### Installing tzwhere
```
npm install tzwhere
```

## Example Usage

```javascript
var tzwhere = require('tzwhere')
tzwhere.init();

var whiteHouse = {'lat': 38.897663, 'lng': -77.036562};

// Determine the timezone of the White House
console.log(tzwhere.tzNameAt(whiteHouse['lat'], whiteHouse['lng']));

// Determine the current offset from UTC, in milliseconds, of the White House's timezone
console.log(tzwhere.tzOffsetAt(whiteHouse['lat'], whiteHouse['lng']));
```

yields:

```bash
America/New_York
-14400000
```

or

```bash
America/New_York
-18000000
```

depending on the current state of daylight savings time in the America/New_York timezone.  You can also do it asynchronously.

```javascript
...
tzwhere.tzNameAt(whiteHouse['lat'], whiteHouse['lng'], function (error, result) {
	if (error) {
		console.log(error);
	} else {
		console.log(result);
	}
}
...
```

You can also pass alternative GeoJSON shape files:

```javascript
var tzwhere = require('tzwhere')
tzwhere.init('path/to/alternative/tz/file');

...
```

Check the tests for more comprehensive usage, including determining the timezone offsets at arbitrary dates (very useful for scheduling future events expressed in local time).
