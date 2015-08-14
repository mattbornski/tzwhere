# tzwhere [![Build Status](https://travis-ci.org/mattbornski/tzwhere.png)](http://travis-ci.org/mattbornski/tzwhere)

Determine timezone from lat/long in NodeJS

## TODO: fix tests

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

## Caching in cluster
If application runs in cluster mode, tzwhere can proper handle it. In case of no cache, first worker makes the lock file and starts data calculation. When data is calculated, process write it in the cache file and removes the lock file. Other workers watching for the lock file changes and when its gone, them trying to load data from cache. So only one worker makes calculations, and other reuses its result. If cache exists, each worker tries to load it.

## Events
`tzwhere` is a EventEmitter itself and it emits data loading progression  
* `loading` - starting data load  
* `loaded` – data loaded. Provides an object `{ from: 'Source of load: cache|calc', time: ms }`  
* `lock` - data calculating in another process. Provides an object `{ state: 'watching|unlock', time: ms }`  
* `error` - provides an error object

## License

tzwhere is free software, and is distributed under the terms of the MIT license (see LICENSE.txt).
