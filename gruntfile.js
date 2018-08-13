module.exports = function(grunt){
	'use strict';
	grunt.initConfig({
		less: {
			main: {
				options: {
					sourceMap: true,
					sourceMapFilename: './less/main.css.map',
					sourceMapURL: 'http://localhost:8080/altoviso/bd-widgests/less/main.css.map',
					sourceMapBasepath: './less/'
				},
				files: {
					'./less/main.css': './less/main.less'
				}
			}
		},
		watch: {
			options: {
				livereload: true
			},
			less: {
				files: ['./less/**/*.less', './src/**/*.less'],
				tasks: ['less'],
				options: {
					// Start a live reload server on the default port 35729
					livereload: false
				}
			},
			css: {
				files: ['./less/main.css'],
				tasks: []
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-watch');
};
