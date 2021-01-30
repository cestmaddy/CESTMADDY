const path = require("path")
const path_resolve = require("path").resolve
var mkdirp = require('mkdirp')
const fs = require("fs")
const ejs = require("ejs")

const config = require("./config")
const compiler = require("./compiler")
const shortcodes = require("./shortcodes")
const markdown_compiler = require("./markdown_compiler")

const contentDir = "./res/content/generated"

exports.compile_normal_dir = (source_path) => {
    /*
    if(!compiler.should_it_be_compiled(source_path)) {
        if(compiler.should_reload_every_files(source_path)) {
            console.log(`\nRecompile everything because of the modification of a file included in all the others\n`.yellow.bold)
            compiler.recompile_every_markdown()
        }
    }
    */
    if(!compiler.is_markdown_file(source_path)) {
        let without_source = compiler.remove_source_from_path(source_path)
        let copy_dest = `${contentDir}${without_source}`
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
        console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
        console.log(`    ${err}`.red)
        return
    }

    let page_shortcodes = shortcodes.get_shortcodes(source_file)

    source_file = shortcodes.replace_shortcode(
        source_file,
        source_path,
        "normal"
    )
    let source_html = markdown_compiler.compile(source_file)
    
    // PAGE TITLE
    let page_title = ""
    if(page_shortcodes.values.hasOwnProperty("[TITLE]")) {
        page_title = page_shortcodes.values["[TITLE]"]
    }

    ejs.renderFile("./res/templates/render_template.ejs", {
        site_title: config.get("string", ["content", "title"]),
        page_title: page_title,
        html_content: source_html,
        html_header: compiler.get_header_content(),
        html_footer: compiler.get_footer_content(),
        theme: config.get("string", ["content", "theme"]),
        type: "normal"
    }, (err, str) => {
        if(err) {
            console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
            console.log(`    ${err}`.red)
        }
        else {
            // remove both source/ and .md
            let without_source_and_ext = compiler.remove_source_and_md_extension_from_path(source_path)
            let new_file_source_path = `${contentDir}${without_source_and_ext}.html`
            
            mkdirp(path.dirname(new_file_source_path)).then(() => {
                fs.writeFile(new_file_source_path, str, (err, data) => {
                    if(!err) {
                        compiler.look_for_conflict(source_path, new_file_source_path)
                    }
                    else {
                        console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
                        console.log(`    ${err}`.red)
                    }
                }) 
            }).catch((err) => {
                console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
                console.log(`    ${err}`.red)
            })
        }
    })
}