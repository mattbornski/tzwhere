# tzwhere [![Build Status](https://travis-ci.org/mattbornski/tzwhere.png)](http://travis-ci.org/mattbornski/tzwhere)

Determine timezone from lat/long in NodeJS

## PROBABLY DON'T USE THIS IN NEW PROJECTS

It probably still works!  But, timezone boundaries actually change over time, and this hasn't been updated in a while.  Also, bugs are discovered over time, and in this particular library, they're not fixed anymore!  New language features are added over time, and this library makes no attempt to take advantage of them!  Until somebody puts in the time to polish this up I would recommend you don't start a new project using it.  Here's a library that looks like it does the same thing but has an active maintainer:

https://github.com/evansiroky/node-geo-tz
https://www.npmjs.com/package/geo-tz

## CALL FOR MAINTAINERS

I am no longer actively working on this project and review PRs about once every three or four months.  If you believe you'd be a good maintainer of this project, please get in touch.

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

## License

tzwhere is free software, and is distributed under the terms of the MIT license (see LICENSE.txt).
