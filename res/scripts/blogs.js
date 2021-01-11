const path = require("path")
const path_resolve = require("path").resolve
var mkdirp = require('mkdirp')
const configYaml = require('config-yaml')

const config = configYaml("./config.yml")
const compiler = require("./compiler")

const contentDir = "./res/content/generated"

exports.compile_blog_dir = (source_path) => {
    let blog_config = this.get_blog_config(source_path)
    let generated_blog_path = `${contentDir}/blog/${compiler.get_last_portion_of_path(blog_config["dir"])}`

    mkdirp(generated_blog_path).then(() => {
        
    })

    if(!compiler.is_markdown_file(source_path)) {
        let copy_dest = `${generated_blog_path}${source_path.substr(blog_config["dir"].length-2, source_path.length)}`
        console.log(copy_dest)
        compiler.copy_file(source_path, `${copy_dest}`)
    }
    else {
        console.log(`\n${source_path.bold}`)
        console.log(`    blog à compiler !`.red)
    }
}

exports.make_rss_feed = (blog_config) => {
    return `
        <name>${blog_config["title"]}</name>
    `
}

exports.get_blog_config = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    if(Array.isArray(config.content.blogs) && 
        config.content.blogs.length != 0) {
        for(confblg_ctr = 0; confblg_ctr < config.content.blogs.length; confblg_ctr++) {
            if(absolute_source_path.startsWith(
                path_resolve(
                    config.content.blogs[confblg_ctr]["dir"]
                )
            )) {
                return config.content.blogs[confblg_ctr]
            }
        }
    }
}