const path = require("path")
const path_resolve = require("path").resolve
const fs = require("fs")
const ejs = require("ejs")

const config = require("./config")
const compiler = require("./compiler")
const shortcodes = require("./shortcodes")
const markdown_compiler = require("./markdown_compiler")
const functions = require("./functions")

const contentDir = "./res/content/generated"

exports.compile_normal_dir = (source_path) => {
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
    
    // site data
    let site = {
        title: config.get("string", ["content", "title"]),
        header: compiler.get_header_content(),
        footer: compiler.get_footer_content(),
        theme: "clean",
        type: "normal"
    }
    if(config.get("string", ["content", "theme"]) != "") {
        site.theme = config.get("string", ["content", "theme"])
    }

    // normal data
    let normal = {
        title: "",
        meta_description: "",
        html: source_html
    }
    //title
    if(page_shortcodes.values.hasOwnProperty("[TITLE]")) {
        normal.title = page_shortcodes.values["[TITLE]"]
    }
    //description
    if(page_shortcodes.values.hasOwnProperty("[DESCRIPTION]")) {
        normal.meta_description = functions.remove_html_tags(
            markdown_compiler.compile(
               page_shortcodes.values["[DESCRIPTION]"]
            )
        )
    }
    else {
        normal.meta_description = functions.remove_html_tags(
            markdown_compiler.compile(
                shortcodes.remove_shortcode(source_file.substr(0, 500))
            )
        )
    }

    ejs.renderFile(`./res/content/front/themes/${site.theme}/templates/normal.ejs`, {
        site: site,
        normal: normal
    }, (err, str) => {
        if(err) {
            console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
            console.log(`    ${err}`.red)
        }
        else {
            // remove both source/ and .md
            let without_source_and_ext = compiler.remove_source_and_md_extension_from_path(source_path)
            let new_file_source_path = `${contentDir}${without_source_and_ext}.html`
            
            fs.mkdir(path.dirname(new_file_source_path), {recursive: true}, (err) => {
                if(err) {
                    console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
                    console.log(`    ${err}`.red)
                }
                else {
                    fs.writeFile(new_file_source_path, str, (err, data) => {
                        if(!err) {
                            compiler.look_for_conflict(source_path, new_file_source_path)
                        }
                        else {
                            console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
                            console.log(`    ${err}`.red)
                        }
                    }) 
                }
            })
        }
    })
}