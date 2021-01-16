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
        for(conf_ctr = 0; conf_ctr < config.content.podcasts.length; conf_ctr++) {
            if(absolute_source_path.startsWith(
                path_resolve(
                    config.content.podcasts[conf_ctr]["dir"]
                )
            )) {
                return "podcast"
            }
        }
    }
    /* BLOG */
    if(Array.isArray(config.content.blogs) && 
        config.content.blogs.length != 0) {
        for(conf_ctr = 0; conf_ctr < config.content.blogs.length; conf_ctr++) {
            if(absolute_source_path.startsWith(
                path_resolve(
                    config.content.blogs[conf_ctr]["dir"]
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
    this.get_every_files_with_extension_of_dir('./source', "md").forEach((file) => {
        if(!this.should_reload_every_files(file)) {
            this.compile(file)
        }
    })
}

exports.get_every_files_with_extension_of_dir = (startDir = "./source", extension = "md") => {
    let files = []
    
    files_of_dir=fs.readdirSync(startDir)
    files_of_dir = files_of_dir || []

    files_of_dir.forEach((file) => {
        if (fs.statSync(startDir + "/" + file).isDirectory()) {
            this.get_every_files_with_extension_of_dir(startDir + "/" + file, extension).forEach((rec_file) => {
                files.push(rec_file)
            })
        }
        else {
            if(file.endsWith(`.${extension}`)) {
                files.push(startDir + "/" + file)
            }
        }
    })

    return files
}

exports.get_every_files_of_dir = (startDir = "./source") => {
    let files = []
    
    files_of_dir=fs.readdirSync(startDir)
    files_of_dir = files_of_dir || []

    files_of_dir.forEach((file) => {
        if (fs.statSync(startDir + "/" + file).isDirectory()) {
            this.get_every_files_of_dir(startDir + "/" + file).forEach((rec_file) => {
                files.push(rec_file)
            })
        }
        else {
            files.push(startDir + "/" + file)
        }
    })

    return files
}

exports.is_markdown_file = (source_path) => {
    // check extension
    let extension = source_path.match(/(.md)$/)
    if(!extension) {
        return false
    }

    return true
}

exports.copy_file = (source_path, dest, silent = false) => {    
    mkdirp(path.dirname(dest)).then((made) => {
        fs.unlink(dest, (err) => {
            fs.link(`${source_path}`, dest, (err) => {
                if(err && err.code != "EEXIST") {
                    console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
                    console.log(`    ${err}`.red)
                }
                else {
                    if(!silent) {
                        console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
                        console.log(`    Successfully copied! (only .md are compiled)`.green)
                    }
                }
            })  
        })  
    }) 
}

exports.look_for_conflict = (source_path, new_file_source_path) => {
    if(new_file_source_path.endsWith("index.html")) {
        let file = `${path.dirname(new_file_source_path)}.html`
        fs.access(`${file}`, fs.F_OK, (err) => {
            console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
            console.log(`    Successfully compiled!`.green)

            if(!err && config.server.hide_html_extension) {
                console.log(`    ${`You have enabled the `.yellow}${`hide_html_extension`.yellow.bold}${` option, `.yellow}${source_path.gray.bold}${` and `.yellow}${`${source_path.match(/^(.*)\//)[1]}.md`.gray.bold}${` could enter a conflict, you can rename the `.yellow}${`${source_path.match(/^(.*)\//)[1]}.md`.gray.bold}${` file or rename the `.yellow}${source_path.match(/^(.*)\//)[1].gray.bold}${` folder.`.yellow}`)
            }
        })
    }
    else {
        console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
        console.log(`    Successfully compiled!`.green)
    }
}

exports.remove_before_source_from_path = (u_path) => {
    u_path = path_resolve(u_path)
    let reg = /^(.+?)source/g
    let match = reg.exec(u_path)

    if(match) {
        match = match[1]
        u_path = u_path.replace(match, "")
    }

    return u_path
}

exports.remove_source_and_md_extension_from_path = (u_path) => {
    let without_before_source = this.remove_before_source_from_path(u_path)
    return without_before_source.substr(6, without_before_source.length - 9)
}

exports.remove_source_from_path = (u_path) => {
    return this.remove_before_source_from_path(u_path).substr(6)
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
    source_path = path_resolve(source_path)
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
            console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
            console.log(`    Unknown special content type`.red)
    }
}