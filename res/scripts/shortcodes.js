const fs = require("fs")
const path_resolve = require("path").resolve

const compiler = require("./compiler")

exports.get_shortcodes = (str) => {
    var results = {
        replace: [
            /*
                {
                    is_get: true, // is_get => replace with value, else => erase
                    shortcode: '[TITLE]',
                    index: 52
                }
            */
        ],
        values: {
            /*
                '[TITLE]': "Good Title"
            */
        }
    }

    /* [TITLE] */
    let reg = /\[TITLE(.+?)?\]/g
    let found
    do {
        found = reg.exec(str)
        if(found) {
            if(found[1] == undefined) { // is get
                results.replace.push({
                    is_get: true,
                    shortcode: found[0],
                    index: found.index
                })
            }
            else {
                if(found[1].startsWith("=")) {
                    results.values["[TITLE]"] = found[1].substr(1)
                }

                results.replace.push({
                    is_get: false,
                    shortcode: found[0],
                    index: found.index
                })
            }
        }
    } while (found)

    /* [DESCRIPTION] */
    reg = /\[DESCRIPTION(.+?)?\]/g
    found
    do {
        found = reg.exec(str)
        if(found) {
            if(found[1] == undefined) { // is get
                results.replace.push({
                    is_get: true,
                    shortcode: found[0],
                    index: found.index
                })
            }
            else {
                if(found[1].startsWith("=")) {
                    results.values["[DESCRIPTION]"] = found[1].substr(1)
                }

                results.replace.push({
                    is_get: false,
                    shortcode: found[0],
                    index: found.index
                })
            }
        }
    } while (found)

    return results

    /* [LIST_DIR] */
    /*
    let list_dir_reg = /\[LIST_DIR\]/g
    let found
    do {
        found = list_dir_reg.exec(str)
        if(found) {
            //console.log(this.list_dir_html(source_path))
        }
    } while (found)
    */
}

exports.replace_shortcode = (str) => {
    shortcode_data = this.get_shortcodes(str)

    for(srtcd in shortcode_data.replace) {
        let key = shortcode_data.replace[srtcd].shortcode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // [ => \[

        if(!shortcode_data.replace[srtcd].is_get) {
            str = str.replace(new RegExp(key, "g"), "")
        }
        else {
            str = str.replace(new RegExp(key, "g"), shortcode_data.values[shortcode_data.replace[srtcd].shortcode])
        }
    }

    return str
}

exports.list_dir_html = (source_path) => {
    try {
        files = fs.readdirSync(compiler.folder_of_file(source_path), {withFileTypes: true})
  
        files.forEach(file => {
            let filepath = `${compiler.folder_of_file(source_path)}/${file.name}`
            
            if(compiler.should_it_be_compiled(filepath) && 
                file.isFile() && 
                path_resolve(filepath) != path_resolve(source_path)
            ) {
                console.log(`f ${filepath}`)
            }
        })    
    }
    catch(err) {
        console.log(`\n${source_path.bold}`)
        console.log(`    ${err}`.red)
        return
    }
}