//Importing external modules
const path = require("path")
const colors = require('colors')
const fs = require("fs")
const fse = require("fs-extra")
//Importing local modules
const config = require("./config")
const compiler = require("./compiler")
const blogs = require("./blogs")
const podcasts = require("./podcasts")
const page = require("./page")

//////////
// Copy of custom themes
// From ./custom/themes to ./res/content/front/themes
//#region 

// empty theme folder except 'clean' and .gitignore
let installed_themes = fs.readdirSync('./res/content/front/themes')
installed_themes.forEach((file) => {
    file_path = path.join('./res/content/front/themes', file)

    if(fs.lstatSync(file_path).isDirectory()) {
        // don't remove the default theme
        if(file != "clean") {
            fs.rmdirSync(file_path, {recursive: true})
        }
    }
    else {
        // don't remove the .gitignore
        if(file != ".gitignore") {
            fs.unlinkSync(file_path)
        }
    }
})

// copy the current theme
let theme = config.get("string", ["content", "theme"])
if(theme != "clean" && theme != "") {
    fse.copySync(`./custom/themes/${theme}`, `./res/content/front/themes/${theme}`)
}
//#endregion

// get files to compile (every files from ./source)
var files = compiler.get_every_files_of_dir("./source")

// create variable that will store blogs config and posts for feeds
let blogs_list = {}
// create variable that will store podcasts config and podcasts for feeds
let podcasts_list = {}
// create the variable that will contain "normal" pages path 
//   => they will be compiled after the blog and podcast pages
let pages_paths = []

for(f in files) {
    source_path = path.resolve(files[f])
    
    // get content type (page, blog, podcast or not_to_compile)
    let content_type = compiler.special_content_type(source_path)
    
    if(content_type.type == "podcast") {
        // if the podcast config is not stored
        if(!podcasts_list.hasOwnProperty(content_type.podcast_path)) {
            // get and store the podcast config
            podcasts_list[content_type.podcast_path] = {
                podcast_config: podcasts.get_podcast_config(source_path),
                podcasts_data: []
            }
        }

        // compile the podcast page
        compiled_podcast = podcasts.compile(
            source_path, 
            podcasts_list[content_type.podcast_path]["podcast_config"]
        )

        if(compiled_podcast["podcast_data"] != undefined) {
            // store podcast content
            podcasts_list[content_type.podcast_path]["podcasts_data"]
                .push(compiled_podcast["podcast_data"])
        }
    }
    else if(content_type.type == "blog") {
        // if the blog config is not stored
        if(!blogs_list.hasOwnProperty(content_type.blog_path)) {
            // get and store the blog config
            blogs_list[content_type.blog_path] = {
                blog_config: blogs.get_blog_config(source_path),
                posts_data: []
            }
        }

        // compile the post page
        compiled_post = blogs.compile(
            source_path, 
            blogs_list[content_type.blog_path]["blog_config"]
        )

        if(compiled_post["post_data"] != undefined) {
            // store the post content
            blogs_list[content_type.blog_path]["posts_data"]
                .push(compiled_post["post_data"])
        }
    }
    else if(content_type.type == "page") {
        // keep path to compile page after
        pages_paths.push(source_path)
    }
}

for(key in podcasts_list) {
    if(podcasts_list.hasOwnProperty(key)) {
        // generate a feed for every podcast
        podcasts.make_rss_feed(podcasts_list[key])
    }
}
for(key in blogs_list) {
    if(blogs_list.hasOwnProperty(key)) {
        // generate a feed for every blogs
        blogs.make_rss_feed(blogs_list[key])
    }
}

for(i in pages_paths) {
    // compile every pages
    page.compile(pages_paths[i], {
        blogs: blogs_list,
        podcasts: podcasts_list
    })
}

// generate the errors page (404...)
compiler.generate_errors()