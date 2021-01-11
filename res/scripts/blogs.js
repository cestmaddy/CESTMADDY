const path = require("path")
const path_resolve = require("path").resolve
var mkdirp = require('mkdirp')
const configYaml = require('config-yaml')
const fs = require("fs")
const ejs = require("ejs")

const config = configYaml("./config.yml")
const compiler = require("./compiler")
const shortcodes = require("./shortcodes")
const markdown_compiler = require("./markdown_compiler")

const contentDir = "./res/content/generated"

exports.compile_blog_dir = (source_path) => {
    let blog_config = this.get_blog_config(source_path)
    let generated_blog_path = `${contentDir}/blog/${compiler.get_last_portion_of_path(blog_config["dir"])}`

    if(!compiler.is_markdown_file(source_path)) {
        let copy_dest = `${generated_blog_path}${source_path.substr(blog_config["dir"].length-2, source_path.length)}`
        compiler.copy_file(source_path, `${copy_dest}`)
    }
    else {
        this.compile_html(source_path, generated_blog_path, blog_config["dir"])
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

exports.compile_html = (source_path, generated_blog_path, blog_dir) => {
    let source_file = ""
    try {
        source_file = fs.readFileSync(path_resolve(source_path), "utf-8")
    }
    catch(err) {
        console.log(`\n${source_path.bold}`)
        console.log(`    ${err}`.red)
        return
    }

    source_file = shortcodes.replace_shortcode(source_file)
    let source_html = markdown_compiler.compile(source_file)

    ejs.renderFile("./res/templates/render_template.ejs", {
        html_content: source_html,
        html_header: compiler.get_header_content(),
        html_footer: compiler.get_footer_content(),
        theme: config.content.theme
    }, (err, str) => {
        if(err) {
            console.log(`\n${source_path.bold}`)
            console.log(`    ${err}`.red)
        }
        else {
            // remove both source/ and .md
            let new_file_source_path = `${generated_blog_path}${source_path.substr(blog_dir.length-2, source_path.length - blog_dir.length - 1)}.html`
            let folder = compiler.folder_of_file(new_file_source_path)
            
            mkdirp(folder).then((made) => {
                fs.writeFile(new_file_source_path, str, (err, data) => {
                    if(!err) {
                        compiler.look_for_conflict(source_path, new_file_source_path)
                    }
                    else {
                        console.log(`\n${source_path.bold}`)
                        console.log(`    ${err}`.red)
                    }
                }) 
            }).catch((err) => {
                console.log(`\n${source_path.bold}`)
                console.log(`    ${err}`.red)
            })
        }
    })
}