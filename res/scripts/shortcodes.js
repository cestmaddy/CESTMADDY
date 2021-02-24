const fs = require("fs")
const path = require("path")
const path_resolve = require("path").resolve
const { htmlToText } = require('html-to-text')

const config = require("./config")
const compiler = require("./compiler")
const blogs = require("./blogs") 
const podcasts = require("./podcasts") 
const functions = require("./functions")

/*
    SHORTCODES
*/

// \w*(?<!\$) is used to not include the shortcodes that start with $.

exports.get_shortcodes = (str) => {
    var results = {
        replace: [
            /*
                {
                    replace: true, // replace => replace with values, else => define values (and erase)
                    shortcode: '[TITLE]',
                    index: 52,
                    value: "The title" => To value to replace with (only if replace)
                }
            */
        ],
        values: { // the last defined values
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

        // BLOG n PODCAST
        'DATE',
        'AUTHOR',

        // BLOG
        'ENCLOSURE',
        'LIST_BLOG_RECUR',

        // PODCAST
        'PODCAST_AUDIO',
        'PODCAST_IMAGE',
        'LIST_PODCAST_RECUR',
        'PODCAST_LINKS'
    ]

    for(short in shortcodes_to_define) {
        let reg = new RegExp(`\\w*(?<!\\$)\\[${shortcodes_to_define[short]}([\\s\\S]*?)\\]`, 'g')
        
        let found
        do {
            found = reg.exec(str)
            if(found) {
                if(found[1] == undefined || found[1] == '') { // is get
                    results.replace.push({
                        replace: true,
                        shortcode: found[0],
                        index: found.index,
                        value: results.values[found[0]]
                    })
                }
                else {
                    if(found[1].startsWith("=")) {
                        results.values[`[${shortcodes_to_define[short]}]`] = found[1].substr(1)
                    }

                    results.replace.push({
                        replace: false,
                        shortcode: found[0],
                        index: found.index,
                    })
                }
            }
        } while (found)
    }

    return results
}

exports.replace_shortcode = (str, source_path, type) => {
    shortcode_data = this.get_shortcodes(str)

    for(short_ctr in shortcode_data.replace) {
        if(shortcode_data.replace[short_ctr]) {
            let key = shortcode_data.replace[short_ctr].shortcode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // [ => \[

            if(source_path == "/home/cestoliv/Documents/DOCS/Developpement/web_workspace/cestmaddy/source/index.md") {
                console.log(shortcode_data.replace[short_ctr].shortcode)
            }

            if(!shortcode_data.replace[short_ctr].replace) {
                str = str.replace(new RegExp(`\\w*(?<!\\$)${key}`), "")
            }
            else {
                switch (shortcode_data.replace[short_ctr].shortcode) {
                    case "[LIST_BLOG_RECUR]":
                        let blog_source_path = source_path
                        
                        if(shortcode_data.replace[short_ctr].value) {
                            // is there is some settings
                            let list_data = JSON.parse(shortcode_data.replace[short_ctr].value)
                            
                            if(list_data.path) {
                                blog_source_path = path_resolve(`source/${list_data.path}/index.md`)
                            }
                        }

                        str = str.replace(
                            new RegExp(`\\w*(?<!\\$)${key}`),
                            this.list_blog_recursively(blog_source_path, str)
                        )
                        break

                    case "[LIST_PODCAST_RECUR]":
                        let podcast_source_path = source_path
                        
                        if(shortcode_data.replace[short_ctr].value) {
                            // is there is some settings
                            let list_data = JSON.parse(shortcode_data.replace[short_ctr].value)
                            
                            if(list_data.path) {
                                podcast_source_path = path_resolve(`source/${list_data.path}/index.md`)
                            }
                        }

                        str = str.replace(
                            new RegExp(`\\w*(?<!\\$)${key}`),
                            this.list_podcast_recursively(podcast_source_path, str)
                        )
                        break

                    default:
                        if(shortcode_data.replace[short_ctr].shortcode == '[DATE]') {
                            str = str.replace(new RegExp(`\\w*(?<!\\$)${key}`), functions.date_to_relative_date(
                                shortcode_data.replace[short_ctr].value
                            ))
                        }
                        else if(shortcode_data.replace[short_ctr].value) {
                            str = str.replace(new RegExp(`\\w*(?<!\\$)${key}`), shortcode_data.replace[short_ctr].value)
                        }
                        else {
                            str = str.replace(new RegExp(`\\w*(?<!\\$)${key}`), "")
                        }
                }
            }
        }
    }

    // $[..] -> [..]
    str = str.replace(/\$\[([\s\S]*?)\]/g, "[$1]")

    return str
}

/*
    CONTENT GENERATION
*/

exports.list_blog_recursively = (source_path, file_content) => {
    let list_content = `<ul class="list_blog">`

    let blog_config = blogs.get_blog_config(source_path)
    let posts = compiler.get_every_files_with_extension_of_dir(path.dirname(source_path), "md")

    // get posts_datas
    let posts_data = []
    for(i_post = 0; i_post < posts.length; i_post++) {
        // exclude the current page from the list
        if(path_resolve(source_path) != posts[i_post]) {
            let post_content = ""
            try {
                post_content = fs.readFileSync(posts[i_post], "utf-8")
            }
            catch(err) {
                console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
                console.log(`    ${err}`.red)
                return
            }

            posts_data.push(
                blogs.get_post_data(
                    post_content, 
                    blog_config, 
                    posts[i_post]
                )
            )
        }
    }

    // sort by date
    posts_data = posts_data.sort((a, b) => {
        return a.date_object < b.date_object ? 1 : -1
    })

    for(i_data in posts_data) {
        list_content += `<li>
            <a href="${posts_data[i_data]["link"]}">
                <p class="list_blog_date">${posts_data[i_data]["author"]["name"]}, <strong>${functions.date_to_relative_date(posts_data[i_data]["date"])}</strong> ${posts_data[i_data]["date_object"].toLocaleString(config.get("string", ["content", "language"]))}</p>
                <p class="list_blog_title">${posts_data[i_data]["title"]}</p>
                <div class="list_blog_description">${htmlToText(posts_data[i_data]["description"])}</div>
            </a>
        </li>`
    }

    list_content += "</ul>"

    return list_content
}

exports.list_podcast_recursively = (source_path, file_content) => {
    let list_content = `<ul class="list_podcast">`

    let podcast_config = podcasts.get_podcast_config(source_path)
    let podcasts_list = compiler.get_every_files_with_extension_of_dir(path.dirname(source_path), "md")

    // get podcasts_data
    let podcasts_data = []
    for(i_pod = 0; i_pod < podcasts_list.length; i_pod++) {
        // exclude the current page from the list
        if(path_resolve(source_path) != podcasts_list[i_pod]) {
            let podcast_content = ""
            try {
                podcast_content = fs.readFileSync(podcasts_list[i_pod], "utf-8")
            }
            catch(err) {
                console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
                console.log(`    ${err}`.red)
                return
            }

            podcasts_data.push(
                podcasts.get_podcast_data(
                    podcast_content, 
                    podcast_config, 
                    podcasts_list[i_pod]
                )
            )
        }
    }

    // sort by date
    podcasts_data = podcasts_data.sort((a, b) => {
        return a.date_object < b.date_object ? 1 : -1
    })

    for(i_data in podcasts_data) {
        list_content += `<li>
            <a href="${podcasts_data[i_data]["link"]}">
                <p class="list_podcast_date">${podcasts_data[i_data]["author"]["name"]}, <strong>${functions.date_to_relative_date(podcasts_data[i_data]["date"])}</strong> ${podcasts_data[i_data]["date_object"].toLocaleString(config.get("string", ["content", "language"]))}</p>
                <div class="list_podcast_tidur_box">
                    <p class="list_podcast_duration">${podcasts.remove_0_before_duration(podcasts_data[i_data]["duration"])}</p>
                    <p class="list_podcast_title">${podcasts_data[i_data]["title"]}</p>
                </div>
                <div class="list_podcast_description">${htmlToText(podcasts_data[i_data]["description"])}</div>
            </a>
        </li>`
    }

    list_content += "</ul>"

    return list_content
}