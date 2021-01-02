const path = require("path")
const path_resolve = require("path").resolve
const configYaml = require('config-yaml')
const marked = require('marked')
const fs = require("fs")
const colors = require('colors')
var mkdirp = require('mkdirp')
var ejs = require('ejs')
const { resolveCname } = require("dns")

const config = configYaml("./config.yml")
const contentDir = "./res/content/generated"

marked.setOptions({
    renderer: new marked.Renderer(),
    /*highlight: function(code, language) {
      const hljs = require('highlight.js');
      const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
      return hljs.highlight(validLanguage, code).value;
    },*/
    pedantic: false,
    gfm: true,
    breaks: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false
})

exports.should_it_be_compiled = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    if(config.content.header_file && path_resolve(config.content.header_file) == absolute_source_path) {
        return false
    }
    else if(config.content.footer_file && path_resolve(config.content.footer_file) == absolute_source_path) {
        return false
    }

    return true
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

exports.copy_file = (source_path) => {
    let new_file_source_path = `${contentDir}${source_path.substr(6, source_path.length)}`
    let folder = this.folder_of_file(new_file_source_path)
    
    mkdirp(folder).then((made) => {
        fs.copyFile(`./${source_path}`, new_file_source_path, (err) => {
            console.log(`\n${source_path.bold}`)
            if(err) {
                console.log(`    ${err}`.red)
            }
            else {
                console.log(`    Successfully copied! (only .md are compiled)`.green)
            }
        })        
    }) 
}

exports.make_html = (source_path) => {
    return new Promise((resolve, reject) => {
        let source_file = ""
        try {
            source_file = fs.readFileSync(path_resolve(source_path), "utf-8")
        }
        catch(err) {
            console.log(`\n${source_path.bold}`)
            console.log(`    ${err}`.red)
            return
        }

        let source_html = marked(source_file)

        resolve(source_html)
    })
}

exports.compile_html = (source_path) => {
    // GET HEADERS AND FOOTERS AS HTML
    let header_html = ""
    if(config.content.header_file) {
        try {
            let header_file = fs.readFileSync(config.content.header_file, "utf-8")
            header_html = marked(header_file)
        }
        catch(err) {
            console.log(`\n${source_path.bold}`)
            console.log(`    ${err}`.red)
        }
    }
    let footer_html = ""
    if(config.content.footer_file) {
        try {
            let footer_file = fs.readFileSync(config.content.footer_file, "utf-8")
            footer_html = marked(footer_file)
        }
        catch(err) {
            console.log(`\n${source_path.bold}`)
            console.log(`    ${err}`.red)
        }
    }

    // RENDER FILE
    this.make_html(source_path).then((html_content) => {
        ejs.renderFile("./res/templates/render_template.ejs", {
            html_content: html_content,
            html_header: header_html,
            html_footer: footer_html,
            theme: config.content.theme
        }, (err, str) => {
            if(err) {
                console.log(`\n${source_path.bold}`)
                console.log(`    ${err}`.red)
            }
            else {
                // remove both source/ and .md
                let new_file_source_path = `${contentDir}${source_path.substr(6, source_path.length - 9)}.html`
                let folder = this.folder_of_file(new_file_source_path)
                
                mkdirp(folder).then((made) => {
                    fs.writeFile(new_file_source_path, str, (err, data) => {
                        if(!err) {
                            // look for conflict
                            if(new_file_source_path.endsWith("index.html")) {
                                file = `${folder}.html`
                                fs.access(`${file}`, fs.F_OK, (err) => {
                                    console.log(`\n${source_path.bold}`)
                                    console.log(`    Successfully compiled!`.green)
    
                                    if(!err && config.server.hide_html_extension) {
                                        console.log(`    ${`You have enabled the `.yellow}${`hide_html_extension`.yellow.bold}${` option, `.yellow}${source_path.gray.bold}${` and `.yellow}${`${source_path.match(/^(.*)\//)[1]}.md`.gray.bold}${` could enter a conflict, you can rename the `.yellow}${`${source_path.match(/^(.*)\//)[1]}.md`.gray.bold}${` file or rename the `.yellow}${source_path.match(/^(.*)\//)[1].gray.bold}${` folder.`.yellow}`)
                                    }
                                })
                            }
                            else {
                                console.log(`\n${source_path.bold}`)
                                console.log(`    Successfully compiled!`.green)
                            }
                        }
                        else {
                            console.log(`\n${source_path.bold}`)
                            console.log(`    ${err}`.red)
                        }
                    }) 
                }).catch((err) => {
                    console.log(`\n${source_path.bold}`)
                    console.log(`    ${err}`.red)
                })
            }
            
        })
    }).catch((err) => {
        console.log(`\n${source_path.bold}`)
        console.log(`    ${err}`.red)
    })
}

exports.compile = (source_path) => {
    if(!this.should_it_be_compiled(source_path)) {
        if(this.should_reload_every_files(source_path)) {
            console.log(`\nRecompile everything because of the modification of a file included in all the others\n`.yellow.bold)
            this.recompile_every_markdown()
        }
        return
    }
    if(!this.is_markdown_file(source_path)) {
        this.copy_file(source_path)   
    }
    else {
        this.compile_html(source_path)
    }
}