const path = require("path")
const path_resolve = require("path").resolve
const fs = require("fs")
const colors = require('colors')
const ejs = require('ejs')

const config = require("./config")
const shortcodes = require("./shortcodes")
const markdown_compiler = require("./markdown_compiler")
const podcasts = require("./podcasts")
const blogs = require("./blogs")
const normal = require("./page")

const contentDir = path.join("res", "content", "generated")

exports.special_content_type = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    /* PAGE */
    if(source_path.endsWith("index.md")) {
        return {
            type: "page"
        }
    }
    /* NOT TO COMPILE */
    if(path_resolve(config.get("string", ["content", "header_file"])) == absolute_source_path) {
        return {
            type: "not_to_compile"
        }
    }
    else if(path_resolve(config.get("string", ["content", "footer_file"])) == absolute_source_path) {
        return {
            type: "not_to_compile"
        }
    }
    /* PODCAST */
    for(i in config.get_absolute_podcasts_paths()) {
        if(absolute_source_path.startsWith(config.get_absolute_podcasts_paths()[i])) {
            return {
                type: "podcast",
                podcast_path: config.get_absolute_podcasts_paths()[i]
            }
        }
    }
    /* BLOG */
    for(i in config.get_absolute_blogs_paths()) {
        if(absolute_source_path.startsWith(config.get_absolute_blogs_paths()[i])) {
            return {
                type: "blog",
                blog_path: config.get_absolute_blogs_paths()[i]
            }
        }
    }

    return {
        type: "page"
    }
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
    fs.mkdir(path.dirname(dest), {recursive: true}, (err) => {
        if(err) {
            console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
            console.log(`    ${err}`.red)
        }
        else {
            fs.unlink(dest, (err) => {
                fs.link(`${source_path}`, dest, (err) => {
                    if(err && err.code != "EEXIST") {
                        if(err.code == "EXDEV") { // unable to link file (eg. with docker), fallback with copy
                            fs.copyFile(`${source_path}`, dest, (err) => {
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
                        }
                        else {
                            console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
                            console.log(`    ${err}`.red)
                        }
                    }
                    else {
                        if(!silent) {
                            console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
                            console.log(`    Successfully copied! (only .md are compiled)`.green)
                        }
                    }
                })  
            })
        }
    })
}

exports.look_for_conflict = (source_path, new_file_source_path) => {
    if(new_file_source_path.endsWith("index.html")) {
        let file = `${path.dirname(new_file_source_path)}.html`
        fs.access(`${file}`, fs.F_OK, (err) => {
            console.log(`\n${this.remove_before_source_from_path(source_path).bold}`)
            console.log(`    Successfully compiled!`.green)

            if(!err && config.get("boolean", ["server", "hide_html_extension"])) {
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
    try {
        let header_file = fs.readFileSync(config.get("string", ["content", "header_file"]), "utf-8")
        return markdown_compiler.compile(header_file)
    }
    catch(err) {
        console.log(`\nheader_file : ${config.get("string", ["content", "header_file"]).bold}`)
        console.log(`    ${err}`.red)
        return ""
    }
}

exports.get_footer_content = () => {
    try {
        let footer_file = fs.readFileSync(config.get("string", ["content", "footer_file"]), "utf-8")
        return markdown_compiler.compile(footer_file)
    }
    catch(err) {
        console.log(`\nfooter_file : ${config.get("string", ["content", "footer_file"]).bold}`)
        console.log(`    ${err}`.red)
        return ""
    }
}

exports.generate_errors = () => {
    return new Promise((resolve, reject) => {

        let errors = ["404", "500"]

        for(error in errors) {
            let site = {
                title: config.get("string", ["content", "title"]),
                header: this.get_header_content(),
                footer: this.get_footer_content(),
                theme: "clean",
                type: "error",
                favicon: {
                    theme_color: config.get("string", ["content", "favicon", "theme_color"]),
                    background: config.get("string", ["content", "favicon", "background"]),
                }
            }
            if(config.get("string", ["content", "theme"]) != "") {
                site.theme = config.get("string", ["content", "theme"])
            }

            let render_path = `./res/content/front/themes/${site.theme}/templates/errors/${errors[error]}.ejs`

            ejs.renderFile(render_path, {
                site: site
            }, (err, str) => {
                if(err) {
                    console.log(`\n${render_path.bold}`)
                    console.log(`    ${err}`.red)
                }
                else {
                    let new_file_source_path = path.join(contentDir, "__errors", `${errors[error]}.html`)
                    let folder = path.dirname(new_file_source_path)
                    
                    fs.mkdir(folder, {recursive: true}, (err) => {
                        if(err) {
                            console.log(`\n${render_path.bold}`)
                            console.log(`    ${err}`.red)
                        }
                        else {
                            fs.writeFile(new_file_source_path, str, (err) => {
                                if(!err) {
                                }
                                else {
                                    console.log(`\n${render_path.bold}`)
                                    console.log(`    ${err}`.red)
                                }
                            }) 
                        }
                    })
                }
            })
        }
    })
}