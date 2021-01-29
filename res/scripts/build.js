const path_resolve = require("path").resolve
const colors = require('colors')

const config = require("./config")
const compiler = require("./compiler")
const blogs = require("./blogs")
const podcasts = require("./podcasts")

const sourceDir = "./source"
const contentDir = "res/content/generated"


files = compiler.get_every_files_of_dir(sourceDir)

let blogs_list = {}
let podcasts_list = {}

for(f in files) {
    source_path = path_resolve(files[f])

    if(!compiler.should_reload_every_files(source_path)) {
        compiler.compile(source_path)
    }
    
    // FEEDS
    let content_type = compiler.special_content_type(source_path)
    if(content_type == "podcast") {
        podcasts_list[
            podcasts.get_podcast_config(source_path)["local_path"]
        ] = podcasts.get_podcast_config(source_path)
    }
    if(content_type == "blog") {
        blogs_list[
            blogs.get_blog_config(source_path)["local_path"]
        ] = blogs.get_blog_config(source_path)
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