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

exports.compile_blog_dir = (source_path) => {
    let blog_config = this.get_blog_config(source_path)

    if(!compiler.is_markdown_file(source_path)) {
        let blog_dir_without_source = compiler.remove_source_from_path(blog_config["dir"])
        let without_source = compiler.remove_source_from_path(source_path)
        without_source = without_source.substr(blog_dir_without_source.length)
        let copy_dest = `${blog_config["local_path"]}${without_source}`
        
        compiler.copy_file(source_path, `${copy_dest}`)
    }
    else {
        this.compile_html(source_path, blog_config)
    }
}

exports.make_rss_feed = (blog_config) => {
    let posts = compiler.get_every_files_with_extension_of_dir(blog_config['dir'], "md")

    itemsFeed = ""

    // get posts data
    let posts_data = []
    posts.forEach((post) => {
        // exclude index.md from feed (because it's not an article)
        if(!post.endsWith("index.md")) {
          let source_file = ""
            try {
                source_file = fs.readFileSync(post, "utf-8")
            }
            catch(err) {
                console.log(`\n${compiler.remove_before_source_from_path(post).bold}`)
                console.log(`    ${err}`.red)
                return
            }

            if(source_file != "") {
                posts_data.push(this.get_post_data(source_file, blog_config, post))
            }
        }
    })

    // sort by date
    posts_data = posts_data.sort((a, b) => {
        return a.date_object < b.date_object ? 1 : -1
    })

    for(i_data in posts_data) {
        itemsFeed += `
        <item>
            <title>${posts_data[i_data].title}</title>
            <link>${posts_data[i_data].link}</link>
            <description><![CDATA[${posts_data[i_data].description}]]></description>
            <author>${posts_data[i_data].author.email}</author>
            <enclosure url="${posts_data[i_data].enclosure}"/>
            <pubDate>${posts_data[i_data].date}</pubDate>
        </item>
            `  
    }


    let feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
    <channel>
        <title>${blog_config["title"]}</title>
        <description>${blog_config["description"]}</description>
        <link>${config.get("string", ["server", "domain"])}${blog_config["path"]}</link>
        <category>${blog_config["category"]}</category>
        <language>${blog_config["language"]}</language>

        ${itemsFeed}
    </channel>
</rss>`

    mkdirp(blog_config["local_path"]).then(() => {
        fs.writeFile(`${blog_config["local_path"]}/feed.xml`, feed, (err, data) => {
            if(!err) {
                console.log(`\nfeed for blog ${blog_config["title"]}`.bold.magenta)
                console.log(`    generated !`.green)
            }
            else {
                console.log(`\nfeed for blog ${blog_config["title"]}`.bold)
                console.log(`    ${err}`.red)
            }
        })  
    })
}

exports.get_post_data = (post_md, blog_config, md_post_path) => {
    let post_shortcodes = shortcodes.get_shortcodes(post_md)
    let post_data = {
        title: "",
        description: "",
        date: "",
        date_object: "",
        author: {
            name: "",
            email: ""
        },
        enclosure: "",
        link: ""
    }

    // TITLE
    if(post_shortcodes.values.hasOwnProperty("[TITLE]")) {
        post_data.title = post_shortcodes.values["[TITLE]"]
    }

    // DESCRIPTION
    if(post_shortcodes.values.hasOwnProperty("[DESCRIPTION]")) {
        post_data.description = markdown_compiler.compile(
            shortcodes.replace_shortcode(
                post_shortcodes.values["[DESCRIPTION]"],
                md_post_path,
                "blog"
            )
        )
    }
    else {
        let md_start = post_md.substr(0, 500)
        let md_start_html = markdown_compiler.compile(
            shortcodes.replace_shortcode(
                md_start,
                md_post_path,
                "normal"
            )
        )

        post_data.description = md_start_html
    }

    // LINK
    let blog_dir_without_source = compiler.remove_source_from_path(blog_config["dir"])
    let without_source_and_ext = compiler.remove_source_and_md_extension_from_path(md_post_path)
    without_source_and_ext = without_source_and_ext.substr(blog_dir_without_source.length)
    let post_link = `${config.get("string", ["server", "domain"])}${blog_config["path"]}${without_source_and_ext}`

    if(!config.get("boolean", ["server", "hide_html_extension"])) {
        post_link += ".html"
    }

    post_data.link = post_link
    

    // ENCLOSURE
    if(post_shortcodes.values.hasOwnProperty("[ENCLOSURE]")) {
        post_data.enclosure = post_shortcodes.values["[ENCLOSURE]"]
    }
    else {
        let first_image = /!\[.+?\]\((.+?)\)/g.exec(post_md)
        if(first_image)
            first_image = first_image[1]
        if(first_image)
            post_data.enclosure = first_image
    }

    // DATE
    if(post_shortcodes.values.hasOwnProperty("[DATE]")) {
        post_data.date_object = this.user_date_to_pub_date(post_shortcodes.values["[DATE]"])
        post_data.date = post_data.date_object.toGMTString()
    }
    else {
        post_data.date_object = this.user_date_to_pub_date()
        post_data.date = post_data.date_object.toGMTString()
    }

    // AUTHOR
    if(blog_config.hasOwnProperty("main_author") && 
    blog_config.hasOwnProperty('authors')) {
        if(post_shortcodes.values.hasOwnProperty("[AUTHOR]")) {
            if(blog_config.authors.hasOwnProperty(post_shortcodes.values["[AUTHOR]"])) {
                post_data.author = {
                    name: post_shortcodes.values["[AUTHOR]"],
                    email: blog_config.authors[post_shortcodes.values["[AUTHOR]"]]
                }
            }
            else {
                console.log(`The ${post_shortcodes.values["[AUTHOR]"]} author is not referenced in your configuration`.red.bold)
            }
        }
        else {
            if(blog_config.authors.hasOwnProperty(blog_config.main_author)) {
                post_data.author = {
                    name: blog_config.main_author,
                    email: blog_config.authors[blog_config.main_author]
                }
            }
            else {
                console.log(`The ${blog_config.main_author} author is not referenced in your configuration`.red.bold)
            }
        }
    }
    else {
        console.log(`Please provide a main_author and a list of authors for your blog ${blog_config.title}`.red.bold)
    }

    return post_data
}

exports.user_date_to_pub_date = (u_date = "") => {
    // YYYY-MM-DDTHH:MM:SS
    let date_parsed = Date.parse(u_date)
    if(u_date == "") {
        date_parsed = Date.now()
    }
    let date = new Date()
    date.setTime(date_parsed)

    return date
}

exports.get_blog_config = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    let config_blogs = config.get("array", ["content", "blogs"])
    for(conf_ctr = 0; conf_ctr < config_blogs.length; conf_ctr++) {
        if(absolute_source_path.startsWith(
            path_resolve(
                config.get("string", ["content", "blogs", conf_ctr, "dir"])
            )
        )) {

            let blog_config = []

            blog_config["dir"] = config.get("string", ["content", "blogs", conf_ctr, "dir"])
            blog_config["title"] = config.get("string", ["content", "blogs", conf_ctr, "title"])
            blog_config["description"] = config.get("string", ["content", "blogs", conf_ctr, "description"])
            blog_config["category"] = config.get("string", ["content", "blogs", conf_ctr, "category"])
            blog_config["language"] = config.get("string", ["content", "blogs", conf_ctr, "language"])
            blog_config["main_author"] = config.get("string", ["content", "blogs", conf_ctr, "main_author"])
            blog_config["authors"] = config.get("object", ["content", "blogs", conf_ctr, "authors"])

            // LOCAL BLOG PATH
            blog_config["path"] = `/blog/${path.basename(blog_config["dir"])}`
            blog_config["local_path"] = `${contentDir}${blog_config["path"]}`

            return blog_config
        }
    }
}

exports.compile_html = (source_path, blog_config) => {
    let source_file = ""
    try {
        source_file = fs.readFileSync(path_resolve(source_path), "utf-8")
    }
    catch(err) {
        console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
        console.log(`    ${err}`.red)
        return
    }

    source_file = shortcodes.replace_shortcode(
        source_file,
        source_path,
        "blog"
    )
    let source_html = markdown_compiler.compile(source_file)

    ejs.renderFile("./res/templates/render_template.ejs", {
        html_content: source_html,
        html_header: compiler.get_header_content(),
        html_footer: compiler.get_footer_content(),
        theme: config.get("string", ["content", "theme"])
    }, (err, str) => {
        if(err) {
            console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
            console.log(`    ${err}`.red)
        }
        else {
            // remove both source/ and .md
            let blog_dir_without_source = compiler.remove_source_from_path(blog_config["dir"])
            let without_source_and_ext = compiler.remove_source_and_md_extension_from_path(source_path)
            without_source_and_ext = without_source_and_ext.substr(blog_dir_without_source.length)
            let new_file_source_path = `${blog_config["local_path"]}${without_source_and_ext}.html`
            let folder = path.dirname(new_file_source_path)
            
            mkdirp(folder).then((made) => {
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