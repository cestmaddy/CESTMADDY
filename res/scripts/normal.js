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

exports.compile_normal_dir = (source_path) => {
    if(!compiler.should_it_be_compiled(source_path)) {
        if(compiler.should_reload_every_files(source_path)) {
            console.log(`\nRecompile everything because of the modification of a file included in all the others\n`.yellow.bold)
            compiler.recompile_every_markdown()
        }
    }
    else if(!compiler.is_markdown_file(source_path)) {
        let copy_dest = `${contentDir}/${source_path.substr(6, source_path.length)}`
        compiler.copy_file(source_path, `${copy_dest}`)
    }
    else {
        this.compile_html(source_path)
    }
}

exports.compile_html = (source_path) => {
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
            let new_file_source_path = `${contentDir}${source_path.substr(6, source_path.length - 9)}.html`
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