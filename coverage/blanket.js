'use strict';

var path = require('path');
var source = path.join(__dirname, '..', 'lib');

require('blanket')({
    pattern: source
});