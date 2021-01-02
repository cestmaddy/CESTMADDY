module.exports = function (grunt) { 
    grunt.loadNpmTasks('grunt-contrib-cssmin')
    grunt.loadNpmTasks('grunt-contrib-watch')
    grunt.loadNpmTasks('grunt-contrib-clean')

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
                '!res/content/front/**/*.css', 'res/content/front/**/*.min.css']
        },
        watch: {
            cssmin: {
                files: [
                    'res/content/front/*.css', '!res/content/front/*.min.css', 
                    'res/content/front/**/*.css', '!res/content/front/**/*.min.css'],
                tasks: ['clean:css', 'cssmin:combine']
            }
        }
    })

    grunt.registerTask('minifyCSS', ['clean:css', 'cssmin:combine'])
    grunt.registerTask('minify', ['minifyCSS'])
}