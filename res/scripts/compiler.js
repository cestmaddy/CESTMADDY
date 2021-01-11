const path = require("path")
const path_resolve = require("path").resolve
const configYaml = require('config-yaml')
const fs = require("fs")
const colors = require('colors')
var mkdirp = require('mkdirp')
var ejs = require('ejs')

const config = configYaml("./config.yml")
const shortcodes = require("./shortcodes")
const markdown_compiler = require("./markdown_compiler")
const podcasts = require("./podcasts")
const blogs = require("./blogs")
const normal = require("./normal")
const contentDir = "./res/content/generated"

exports.should_it_be_compiled = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    if(this.special_content_type(source_path) != "normal") {
        return false
    }
    else if(config.content.header_file && path_resolve(config.content.header_file) == absolute_source_path) {
        return false
    }
    else if(config.content.footer_file && path_resolve(config.content.footer_file) == absolute_source_path) {
        return false
    }

    return true
}

exports.special_content_type = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    /* PODCAST */
    if(Array.isArray(config.content.podcasts) && 
        config.content.podcasts.length != 0) {
        for(confpod_ctr = 0; confpod_ctr < config.content.podcasts.length; confpod_ctr++) {
            if(absolute_source_path.startsWith(
                path_resolve(
                    config.content.podcasts[confpod_ctr]["dir"]
                )
            )) {
                return "podcast"
            }
        }
    }
    /* BLOG */
    if(Array.isArray(config.content.blogs) && 
        config.content.blogs.length != 0) {
        for(confblg_ctr = 0; confblg_ctr < config.content.blogs.length; confblg_ctr++) {
            if(absolute_source_path.startsWith(
                path_resolve(
                    config.content.blogs[confblg_ctr]["dir"]
                )
            )) {
                return "blog"
            }
        }
    }

    return "normal"
}

exports.should_reload_every_files = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    if(config.content.header_file && path_resolve(config.content.header_file) == absolute_source_path) {
        return true
    }
    else if(config.content.footer_file && path_resolve(config.content.footer_file) == absolute_source_path) {
        return true
    }

    return false
}

exports.recompile_every_markdown = (startDir = contentDir) => {
    mkdirp(startDir).then((made) => {
        var files=fs.readdirSync(startDir)
        for(var i=0;i<files.length;i++){
            var filename=path.join(startDir,files[i])
            var stat = fs.lstatSync(filename)
            if (stat.isDirectory()){
                this.recompile_every_markdown(filename)
            }
            else if (filename.indexOf(".html")>=0) {
                let source_filename = filename.replace(/^res\/content\/generated\//g, "source/")
                source_filename = source_filename.substr(0, source_filename.length - 5)
                source_filename += ".md"
                this.compile(source_filename)
            }
        }
    }) 
}

exports.is_markdown_file = (source_path) => {
    // check extension
    let extension = source_path.match(/(.md)$/)
    if(!extension) {
        return false
    }

    return true
}

exports.folder_of_file = (source_path) => {    
    return source_path.match(/^(.*)\//)[1]
}

exports.get_last_folder_name = (source_path) => {
    return this.folder_of_file(source_path).match(/([^\/]*)\/*$/)[1]
}

exports.get_last_portion_of_path = (source_path) => {
    return source_path.match(/([^\/]*)\/*$/)[1]
}

exports.copy_file = (source_path, dest) => {
    let folder = this.folder_of_file(dest)
    
    mkdirp(folder).then((made) => {
        fs.unlink(dest, (err) => {
            fs.copyFile(`./${source_path}`, dest, (err) => {
                console.log(`\n${source_path.bold}`)
                if(err) {
                    console.log(`    ${err}`.red)
                }
                else {
                    console.log(`    Successfully copied! (only .md are compiled)`.green)
                }
            })  
        })
              
    }) 
}

exports.get_header_content = () => {
    if(config.content.header_file) {
        try {
            let header_file = fs.readFileSync(config.content.header_file, "utf-8")
            return markdown_compiler.compile(header_file)
        }
        catch(err) {
            console.log(`\n${config.content.header_file.bold}`)
            console.log(`    ${err}`.red)
            return ""
        }
    }
}

exports.get_footer_content = () => {
    if(config.content.footer_file) {
        try {
            let footer_file = fs.readFileSync(config.content.footer_file, "utf-8")
            return markdown_compiler.compile(footer_file)
        }
        catch(err) {
            console.log(`\n${config.content.footer_file.bold}`)
            console.log(`    ${err}`.red)
            return ""
        }
    }
}

exports.compile = (source_path) => {
    let content_type = this.special_content_type(source_path)
    
    switch (content_type) {
        case "normal":
            normal.compile_normal_dir(source_path)
            break
        case "podcast":
            podcasts.compile_podcast_dir(source_path)
            break
        case "blog":
            blogs.compile_blog_dir(source_path)
            break
        default:
            console.log(`\n${source_path.bold}`)
            console.log(`    Unknown special content type`.red)
    }
}