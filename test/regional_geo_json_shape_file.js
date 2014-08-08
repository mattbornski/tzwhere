/* Mocha test
   to use:
     npm install mocha
     mocha <filename>
   or
     npm test
*/

'use strict';

var assert = require('assert');
var tzwhere = require('../lib/index');
var util = require('util');

describe.only( 'Create regional GEOJson shape file', function () {
    it( 'should throw an error if no region passed in', function (done) {
        try {
            tzwhere.createTimeZoneSubsetWorldFile();
            assert( false );
        }
        catch (err) {
            assert( true );
        }
        return done();
    });

    it( 'should throw an empty region is passed in ', function (done) {
        try {
            tzwhere.createTimeZoneSubsetWorldFile( '' );
            assert( false );
        }
        catch (err) {
            assert( true );
        }
        return done();
    });

    it( 'should be able to create the regional file and query the white house', function (done) {
        tzwhere.createRegionalGEOJsonShapeFile( 'America' );
        var fs = require( 'fs' );
        fs.exists( 'tz_America.json', function( exists ) {
            assert( exists );
            if( exists ) {
                tzwhere.init( 'tz_America.json' );
                var whiteHouse = {'lat': 38.897663, 'lng': -77.036562};
                tzwhere.tzNameAt(whiteHouse['lat'], whiteHouse['lng'], function (error, result) {
                    if (error) {
                        return done(error);
                    }
                    console.log(result);
                    assert(result === 'America/New_York');
                    return done();
                });
            }
        } );
    });

    after(function () {
        console.log(util.inspect(process.memoryUsage()));
    });
});