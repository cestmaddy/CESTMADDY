const path = require("path")
const colors = require('colors')
const fs = require("fs")
const fse = require("fs-extra")

const config = require("./config")
const compiler = require("./compiler")
const blogs = require("./blogs")
const podcasts = require("./podcasts")
const page = require("./page")

const sourceDir = "./source"
const contentDir = "res/content/generated"

// copy custom theme
//#region 
// empty theme folder except 'clean' and .gitignore
let installed_themes = fs.readdirSync('./res/content/front/themes')

installed_themes.forEach((file) => {
    file_path = path.join('./res/content/front/themes', file)

    if(fs.lstatSync(file_path).isDirectory()) {
        if(file != "clean") {
            fs.rmdirSync(file_path, {recursive: true})
        }
    }
    else {
        if(file != ".gitignore") {
            fs.unlinkSync(file_path)
        }
    }
})

// copy current theme
let theme = config.get("string", ["content", "theme"])
if(theme != "clean" && theme != "") {
    fse.copySync(`./custom/themes/${theme}`, `./res/content/front/themes/${theme}`)
}
//#endregion

var files = []

files = compiler.get_every_files_of_dir(sourceDir)

let blogs_list = {}
let podcasts_list = {}

let pages_paths = []

for(f in files) {
    source_path = path.resolve(files[f])
    
    // FEEDS
    let content_type = compiler.special_content_type(source_path)
    
    if(content_type.type == "podcast") {
        if(!podcasts_list.hasOwnProperty(content_type.podcast_path)) {
            podcasts_list[content_type.podcast_path] = {
                podcast_config: podcasts.get_podcast_config(source_path),
                podcasts_data: []
            }
        }

        compiled_podcast = podcasts.compile(
            source_path, 
            podcasts_list[content_type.podcast_path]["podcast_config"]
        )

        if(compiled_podcast["podcast_data"] != undefined) {
            podcasts_list[content_type.podcast_path]["podcasts_data"]
                .push(compiled_podcast["podcast_data"])
        }
    }
    else if(content_type.type == "blog") {
        if(!blogs_list.hasOwnProperty(content_type.blog_path)) {
            blogs_list[content_type.blog_path] = {
                blog_config: blogs.get_blog_config(source_path),
                posts_data: []
            }
        }

        compiled_post = blogs.compile(
            source_path, 
            blogs_list[content_type.blog_path]["blog_config"]
        )

        if(compiled_post["post_data"] != undefined) {
            blogs_list[content_type.blog_path]["posts_data"]
                .push(compiled_post["post_data"])
        }
    }
    else if(content_type.type == "page") {
        pages_paths.push(source_path)
    }
}

for(key in podcasts_list) {
    if(podcasts_list.hasOwnProperty(key)) {
        podcasts.make_rss_feed(podcasts_list[key])
    }
}
for(key in blogs_list) {
    if(blogs_list.hasOwnProperty(key)) {
        blogs.make_rss_feed(blogs_list[key])
    }
}

for(i in pages_paths) {
    page.compile(pages_paths[i], {
        blogs: blogs_list,
        podcasts: podcasts_list
    })
}

compiler.generate_errors()