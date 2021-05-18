// Importing external modules
const path = require("path")
const path_resolve = require("path").resolve
const fs = require("fs")
const ejs = require("ejs")
const { v4: uuidv4 } = require('uuid')
// Importing local modules
const config = require("./config")
const compiler = require("./compiler")
const shortcodes = require("./shortcodes")
const functions = require("./functions")
const markdown_compiler = require("./markdown_compiler")

exports.compile = (source_path, blog_config) => {
    /*
        Main function, call the function to compile post,
        copy the others files and return the post data

        Take the source_path of the post file
        Take the blog config (e.g. {
            "title",
            "description",
            ...
        })

        Return the post_data (e.g. {
            "id",
            "title"
            "description",
            ...
        })
    */

    let post_data = undefined

    // if it's not a post but an image
    if(!compiler.is_markdown_file(source_path)) {
        // create the destination path
        let blog_dir_without_source = compiler.remove_source_from_path(blog_config["dir"])
        let without_source = compiler.remove_source_from_path(source_path)
        without_source = without_source.substr(blog_dir_without_source.length)
        let copy_dest = `${blog_config["local_path"]}${without_source}`
        
        compiler.copy_file(source_path, `${copy_dest}`)
    }
    else {
        post_data = this.compile_html(source_path, blog_config)
    }

    return post_data
}

exports.make_rss_feed = (blog_data) => {
    /*
        Create the blog feed with the blog data

        Take blog_data (e.g. {
            "blog_config": {}
            "posts_data": [{}]
        })
    */
    blog_config = blog_data["blog_config"]
    posts_data = blog_data["posts_data"]

    itemsFeed = ""

    // sort by date
    posts_data = posts_data.sort((a, b) => {
        return a.date_object < b.date_object ? 1 : -1
    })

    for(i_data in posts_data) {
        itemsFeed += `
        <item>
            <title>${posts_data[i_data].title}</title>
            <link>${posts_data[i_data].link}</link>
            <description><![CDATA[${posts_data[i_data].content}]]></description>
            <author>${posts_data[i_data].author.email} (${posts_data[i_data].author.name})</author>
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

    fs.mkdir(blog_config["local_path"], {recursive: true}, (err) => {
        if(err) {
            console.log(`\nfeed for blog ${blog_config["title"]}`.bold)
            console.log(`    ${err}`.red)
        }
        else {
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
        }
    })
}

exports.get_post_data = (blog_config, md_post_path, return_content=false) => {
    /*
        Get the posts data by reading the source file

        Take the blog config (e.g. {
            "title",
            "description",
            ...
        })
        Take the markdown file path
        Take an optional return_content to know if it 
          have to return the post content or just the metadata

        Return the post_data {
            "id": str,
            "title": str,
            "description": str,
            "date": str,
            "date_object": date,
            "author": {
                "name": str,
                "email": str
            },
            "enclosure": str,
            "link": str
        }
    */

    let post_data = {
        id: uuidv4(),
        title: "Untitled",
        description: "",
        content: "",
        date: functions.user_date_to_date_object().toGMTString(),
        date_object: functions.user_date_to_date_object(),
        author: {
            name: "",
            email: ""
        },
        enclosure: "",
        link: ""
    }

    // get post content from source file
    let post_md = ""
    try {
        post_md = fs.readFileSync(md_post_path, "utf-8")
    }
    catch(err) {
        console.log(`\n${md_post_path}`)
        console.log(`    ${err}`.red)
        return post_data
    }

    // get shortcode
    let post_shortcodes = shortcodes.get_shortcodes(post_md)

    // ID
    if(post_shortcodes.values.hasOwnProperty("[ID]")) {
        post_data.id = post_shortcodes.values["[ID]"]
    }
    else {
        // define the [ID] shortcode in the post file
        try {
            post_md = `[ID=${post_data.id}]\n\n${post_md}`
            fs.writeFileSync(md_post_path, post_md)
        }
        catch (e) {
            console.log(`The post ${md_post_path} has no ID and we can't add it automatically.`.red)
        }
    }

    // TITLE
    if(post_shortcodes.values.hasOwnProperty("[TITLE]")) {
        post_data.title = post_shortcodes.values["[TITLE]"]
    }

    // DESCRIPTION
    if(post_shortcodes.values.hasOwnProperty("[DESCRIPTION]")) {
        post_data.description = markdown_compiler.compile(
           post_shortcodes.values["[DESCRIPTION]"]
        )
    }
    else {
        post_data.description = markdown_compiler.compile(
            shortcodes.remove_shortcode(post_md.substr(0, 500))
        )
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
        post_data.enclosure = config.get("string", ["server", "domain"]) + post_shortcodes.values["[ENCLOSURE]"]
    }
    else {
        let first_image = /!\[.+?\]\((.+?)\)/g.exec(post_md)
        if(first_image)
            first_image = first_image[1]
        if(first_image)
            post_data.enclosure = config.get("string", ["server", "domain"]) + first_image
    }

    // DATE
    if(post_shortcodes.values.hasOwnProperty("[DATE]")) {
        post_data.date_object = functions.user_date_to_date_object(post_shortcodes.values["[DATE]"])
        post_data.date = post_data.date_object.toGMTString()
    }

    // AUTHOR
    if(blog_config.hasOwnProperty("main_author") && 
    blog_config.hasOwnProperty('authors')) {
        // if there ar specified author
        if(post_shortcodes.values.hasOwnProperty("[AUTHOR]")) {
            if(blog_config.authors.hasOwnProperty(post_shortcodes.values["[AUTHOR]"])) {
                post_data.author = {
                    name: post_shortcodes.values["[AUTHOR]"],
                    email: blog_config.authors[post_shortcodes.values["[AUTHOR]"]]
                }
            }
            else {
                console.log(`The ${post_shortcodes.values["[AUTHOR]"]} author is not referenced in your configuration for the ${blog_config.title} blog`.red)
            }
        }
        // if not we take the default blog author
        else {
            if(blog_config.authors.hasOwnProperty(blog_config.main_author)) {
                post_data.author = {
                    name: blog_config.main_author,
                    email: blog_config.authors[blog_config.main_author]
                }
            }
            else {
                console.log(`The ${blog_config.main_author} author is not referenced in your configuration for the ${blog_config.title} blog`.red)
            }
        }
    }
    else {
        console.log(`Please provide a main_author and a list of authors for the ${blog_config.title} blog`.red)
    }

    if(return_content) {
        post_data.content = markdown_compiler.compile(
            shortcodes.replace_shortcode(
                post_md,
                md_post_path
            )
        )
    }

    return post_data
}

exports.get_blog_config = (source_path) => {
    /* 
        Get the blog config from the config.yml

        Take the source path of the file
          to identify the blog

        Return the blog config {
            "title": str,
            "description": str,
            "category": str,
            "language": str,
            "main_author": str,
            "authors": [str],
            "comments": {
                "provider": str,
                settings: {
                    url: str
                }
            }
        }
    */

    let absolute_source_path = path_resolve(source_path)

    // get blogs config from config.yml
    let config_blogs = config.get("array", ["content", "blogs"])
    for(conf_ctr = 0; conf_ctr < config_blogs.length; conf_ctr++) {

        // if the blog dir match with source_path
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

            // check comments settings
            blog_config["comments"] = undefined
            comments = config.get("object", ["content", "blogs", conf_ctr, "comments"])
            if(comments.hasOwnProperty("provider")) {
                if(comments["provider"] == "commento") {
                    if(comments.hasOwnProperty("settings")) {
                        if(!comments["settings"].hasOwnProperty("url"))
                            console.log(`You have not specified the ${`url`.bold} parameter for the ${comments["provider"]} comment provider on your CESTOLIV blog`.red)
                        else
                            blog_config["comments"] = comments
                    }
                    else
                        console.log(`You have not specified any settings for the ${comments["provider"]} comment provider on your ${blog_config["title"]} blog`.red)
                }
                else
                    console.log(`Your comment provider is not supported for the ${blog_config["title"]} blog`.red)
            }


            // LOCAL BLOG PATH
            blog_config["path"] = `/${path.basename(blog_config["dir"])}`
            blog_config["local_path"] = `./res/content/generated${blog_config["path"]}`

            return blog_config
        }
    }
}

exports.compile_html = (source_path, blog_config) => {
    /*
        Compile the post with it's data and the template (ejs) of the theme

        Take the source file of the file
        Take the blog config (e.g. {
            "title",
            "description",
            ...
        })

        Return the posts data (e.g. {
            "id",
            "title"
            "description",
            ...
        })
    */

    let post_data = this.get_post_data(blog_config, source_path, true)

    let render_options = {
        site: {
            title: config.get("string", ["content", "title"]),
            header: compiler.get_header_content(),
            footer: compiler.get_footer_content(),
            theme: "clean",
            type: "blog",
            comments: blog_config["comments"],
            favicon: {
                theme_color: config.get("string", ["content", "favicon", "theme_color"]),
                background: config.get("string", ["content", "favicon", "background"]),
            }
        },
        post: Object.assign(
            post_data,
            {
                html: post_data.content,
                date_string: post_data["date_object"].toLocaleString(config.get("string", ["content", "language"])),
                relative_date: `[RELATIVE_DATE=${post_data["date_object"].toISOString()}]`,
                meta_description: functions.remove_html_tags(
                    post_data.description
                )
            }
        )
    }

    // get theme
    if(config.get("string", ["content", "theme"]) != "") {
        render_options.site.theme = config.get("string", ["content", "theme"])
    }

    let render_path = `./res/content/front/themes/${render_options.site.theme}/templates/blog.ejs`

    ejs.renderFile(render_path, render_options, (err, str) => {
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
            
            fs.mkdir(folder, {recursive: true}, (err) => {
                if(err) {
                    console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
                    console.log(`    ${err}`.red)
                }
                else {
                    fs.writeFile(new_file_source_path, str, (err) => {
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

    return post_data
}