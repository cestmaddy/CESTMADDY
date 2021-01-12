const fs = require("fs")
const path_resolve = require("path").resolve
const configYaml = require('config-yaml')

const config = configYaml("./config.yml")
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

    // Shortcodes of value to define
    let shortcodes_to_define = [
        // GENERAL
        'TITLE', 
        'DESCRIPTION',

        // BLOG
        'AUTHOR',
        'ENCLOSURE',
        'DATE',

        // PODCAST
        'PODCAST_AUDIO',
        'PODCAST_IMAGE'
    ]

    for(short in shortcodes_to_define) {
        let reg = new RegExp(`\\[${shortcodes_to_define[short]}([\\s\\S]*?)\\]`, 'g')
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
                        results.values[`[${shortcodes_to_define[short]}]`] = found[1].substr(1)
                    }

                    results.replace.push({
                        is_get: false,
                        shortcode: found[0],
                        index: found.index
                    })
                }
            }
        } while (found)
    }

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

    for(short_ctr in shortcode_data.replace) {
        let key = shortcode_data.replace[short_ctr].shortcode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // [ => \[

        if(!shortcode_data.replace[short_ctr].is_get) {
            str = str.replace(new RegExp(key, "g"), "")
        }
        else {
            if(shortcode_data.replace[short_ctr].shortcode == '[DATE]') {
                str = str.replace(new RegExp(key, "g"), this.date_to_relative_date(
                    shortcode_data.values[shortcode_data.replace[short_ctr].shortcode]
                ))
            }
            else {
                str = str.replace(new RegExp(key, "g"), shortcode_data.values[shortcode_data.replace[short_ctr].shortcode])
            }
        }
    }

    return str
}

exports.date_to_relative_date = (u_date) => {
    u_date = new Date(u_date)
    let formatter = new Intl.RelativeTimeFormat(config.content.language, {
        localeMatcher: "best fit",
        numeric: "always",
        style: "long",
    })

    let divisions = [
        { amount: 60, name: 'seconds' },
        { amount: 60, name: 'minutes' },
        { amount: 24, name: 'hours' },
        { amount: 7, name: 'days' },
        { amount: 4.34524, name: 'weeks' },
        { amount: 12, name: 'months' },
        { amount: Number.POSITIVE_INFINITY, name: 'years' }
    ]
      
    let duration = (u_date - new Date()) / 1000
        
    for (i = 0; i <= divisions.length-1; i++) {
        let division = divisions[i]
        if (Math.abs(duration) < division.amount) {
            return `${formatter.format(Math.round(duration), division.name)}, ${u_date.toLocaleString(config.content.language)}`
        }
        duration /= division.amount
    }

    return "Invalid Date"
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