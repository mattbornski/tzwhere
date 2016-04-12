'use strict';

module.exports = function (grunt) {
    // Show elapsed time at the end
    require('time-grunt')(grunt);
    // Load all grunt tasks
    require('load-grunt-tasks')(grunt);

    // Project configuration.
    grunt.initConfig({
        watch: {
            mochaTest: {
                files: '<%= mochaTest.moduleBDD.src %>',
                tasks: ['mochaTest']
            }
        },
        mochaTest: {
            moduleBDD: {
                options: {
                    reporter: 'spec',
                    require: 'coverage/blanket'
                },
                src: [
                    'test/**/*.js'
                ]
            },
            moduleBDDCoverageHTML: {
                options: {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: 'coverage/coverage.html'
                },
                src: [
                    'test/**/*.js'
                ]
            },
            moduleBDDCoverageJSON: {
                options: {
                    reporter: 'json-cov',
                    quiet: true,
                    captureFile: 'coverage/coverage.json'
                },
                src: [
                    'test/**/*.js'
                ]
            }
        }
    });

    grunt.registerTask('test', ['mochaTest']);

    // Default task.
    grunt.registerTask('default', ['test']);
};
