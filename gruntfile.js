const path = require("path")

module.exports = function (grunt) { 
    grunt.loadNpmTasks('grunt-contrib-cssmin')
    grunt.loadNpmTasks('grunt-contrib-watch')
    grunt.loadNpmTasks('grunt-contrib-clean')
    grunt.loadNpmTasks('grunt-run')
    grunt.loadNpmTasks('grunt-concurrent')

    // Project configuration. 
    grunt.initConfig({ 
        pkg: grunt.file.readJSON('package.json'), 
        cssmin: {
            combine: {
                options: {
                    style: 'expanded',
                    report: "min"
                },
                files: [{
                    expand: true,
                    cwd: "res/content/front",
                    src: ["*.css", "**/*.css"],
                    dest: "res/content/front",
                    ext: ".min.css"
                }]
            }
        },
        clean: {
            css: ['!res/content/front/*.css', 'res/content/front/*.min.css', 
                '!res/content/front/**/*.css', 'res/content/front/**/*.min.css'],
            generated: [
                'res/content/generated/*', 
                '!res/content/generated/__favicons/**'
            ],
            favicons: [
                'res/content/generated/__favicons/*',
            ]
        },
        run: {
            npm_build: {
              cmd: 'npm',
              args: [
                'run',
                'build'
              ]
            },
            npm_generate: {
              cmd: 'npm',
              args: [
                'run',
                'generate'
              ]
            }
        },
        watch: {
            cssmin: {
                files: [
                    'res/content/front/*.css', '!res/content/front/*.min.css', 
                    'res/content/front/**/*.css', '!res/content/front/**/*.min.css'],
                tasks: ['clean:css', 'cssmin:combine'],
                options: {
                    spawn: false,
                    debounceDelay: 1000
                }
            },

            build: {
                files: ['source/**/*.md'],
                tasks: ['run:npm_build'],
                options: {
                    spawn: false,
                    debounceDelay: 1000
                }
            },

            scripts: {
                files: ['res/scripts/*'],
                tasks: ['run:npm_generate'],
                options: {
                    spawn: false,
                    debounceDelay: 3000
                }
            }
        },
        concurrent: {
            watch_all: {
                options: {
                    logConcurrentOutput: true
                },
                tasks: ["watch:build", "watch:cssmin", "watch:scripts"]
            }
        }
    })

    grunt.event.on('watch', (action, filepath, target) =>{
        if(target == "build") {
            if(action == "added" || action == "changed") {
                grunt.config('run.npm_build.args', ['run', 'build', filepath])
            }
            else {
                // TODO:
                console.log(action)
            }
        }
        else if(target == "cssmin") {
            if(action == "added" || action == "changed") {
                let min_filepath = filepath.slice(0, -4) + ".min.css"

                grunt.config('clean.css', [min_filepath])
                grunt.config('cssmin.combine.files', [{
                    expand: true,
                    cwd: path.dirname(filepath),
                    src: [path.basename(filepath)],
                    dest: path.dirname(filepath),
                    ext: ".min.css"
                }])
            }
            else {
                // TODO:
                console.log(action)
            }
        }
    })

    grunt.registerTask('minifyCSS', ['clean:css', 'cssmin:combine'])
    grunt.registerTask('minify', ['minifyCSS'])

    grunt.registerTask('clear-generated', ['clean:generated'])
    grunt.registerTask('clear-favicons', ['clean:favicons'])
    grunt.registerTask('clear-all', ['clear-generated', 'clear-favicons', 'clean:css'])

    grunt.registerTask('watch_all', ['concurrent:watch_all'])
}