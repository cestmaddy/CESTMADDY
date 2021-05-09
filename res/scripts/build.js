const path = require("path")
const colors = require('colors')
const fs = require("fs")
const fse = require("fs-extra")

const config = require("./config")
const compiler = require("./compiler")
const blogs = require("./blogs")
const podcasts = require("./podcasts")

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

var only_one_file = false
var files = []

if(process.argv[2]) {
    only_one_file = true
    files = [process.argv[2]]
}
else {
    files = compiler.get_every_files_of_dir(sourceDir)
}

let blogs_list = {}
let podcasts_list = {}

if(only_one_file) { // eg: if it's footer or header
    source_path = path.resolve(files[0])

    if(compiler.should_reload_every_files(source_path)) {
        files = compiler.get_every_files_of_dir(sourceDir)
    }
}

for(f in files) {
    source_path = path.resolve(files[f])

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

compiler.generate_errors()