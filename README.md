# tzwhere [![Build Status](https://travis-ci.org/mattbornski/tzwhere.png)](http://travis-ci.org/mattbornski/tzwhere)

Determine timezone from lat/long in NodeJS

## Installation

### Installing npm (node package manager)
```
curl http://npmjs.org/install.sh | sh
```

### Installing tzwhere
```
npm install tzwhere
```

## Example Usage

```javascript
var tzwhere = require('tzwhere')
tzwhere.init();
// OR
tzwhere.init('path/to/alternative/tz/file');

//

```
