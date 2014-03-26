module.exports = function(grunt) {

    grunt.initConfig({

        pkg : grunt.file.readJSON('package.json'),

        shell: {
            bumpVersion: {
                command: 'npm version patch'
            },
            npmPublish: {
                command: 'npm publish'
            }
        },
        concat : {
            options : {
                separator : "\n\n"
            },
            dist : {
                src : [ 'src/*'],
                dest : 'dist/<%= pkg.name.replace(".js", "") %>.js'
            }
        },

        uglify : {
            options : {
                banner : '/*! <%= pkg.name.replace(".js", "") %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist : {
                files : {
                    'dist/<%= pkg.name.replace(".js", "") %>.min.js' : ['<%= concat.dist.dest %>']
                }
            }
        },
        mochaTest : {
            test : {
                options : {
                    reporter : 'spec'
                },
                src : ['test/*.js']
            }
        },

        jshint : {
            files : ['src/**/*.js'],
            options : {
                globals : {
                    console : true,
                    module : true,
                    document : true
                },
                jshintrc : '.jshintrc'
            }
        },

        watch : {
            files : ['<%= jshint.files %>'],
            tasks : ['concat', 'jshint', 'qunit']
        }

    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('test', ['jshint', 'mochaTest']);
    grunt.registerTask('build', ['concat', 'jshint', 'uglify']);
    grunt.registerTask('publish', ['shell:bumpVersion', 'build', 'shell:npmPublish']);


};
