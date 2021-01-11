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

exports.make_html = (source_path) => {
    return new Promise((resolve, reject) => {
        let source_file = ""
        try {
            source_file = fs.readFileSync(path_resolve(source_path), "utf-8")
        }
        catch(err) {
            console.log(`\n${source_path.bold}`)
            console.log(`    ${err}`.red)
            return
        }

        let source_html = markdown_compiler.compile(source_file)

        /* [LIST_DIR] */
        let list_dir_reg = /\[LIST_DIR\]/g
        let found
        do {
            found = list_dir_reg.exec(source_html)
            if(found) {
                console.log(shortcodes.list_dir_html(source_path))
            }
        } while (found)

        resolve(source_html)
    })
}

exports.compile_html = (source_path) => {
    // RENDER FILE
    this.make_html(source_path).then((html_content) => {
        ejs.renderFile("./res/templates/render_template.ejs", {
            html_content: html_content,
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
                            // look for conflict
                            if(new_file_source_path.endsWith("index.html")) {
                                file = `${folder}.html`
                                fs.access(`${file}`, fs.F_OK, (err) => {
                                    console.log(`\n${source_path.bold}`)
                                    console.log(`    Successfully compiled!`.green)
    
                                    if(!err && config.server.hide_html_extension) {
                                        console.log(`    ${`You have enabled the `.yellow}${`hide_html_extension`.yellow.bold}${` option, `.yellow}${source_path.gray.bold}${` and `.yellow}${`${source_path.match(/^(.*)\//)[1]}.md`.gray.bold}${` could enter a conflict, you can rename the `.yellow}${`${source_path.match(/^(.*)\//)[1]}.md`.gray.bold}${` file or rename the `.yellow}${source_path.match(/^(.*)\//)[1].gray.bold}${` folder.`.yellow}`)
                                    }
                                })
                            }
                            else {
                                console.log(`\n${source_path.bold}`)
                                console.log(`    Successfully compiled!`.green)
                            }
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
    }).catch((err) => {
        console.log(`\n${source_path.bold}`)
        console.log(`    ${err}`.red)
    })
}