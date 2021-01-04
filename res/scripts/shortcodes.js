const fs = require("fs")
const path_resolve = require("path").resolve

const compiler = require("./compiler")


exports.list_dir_html = (source_path) => {
    try {
        files = fs.readdirSync(compiler.folder_of_file(source_path), {withFileTypes: true})
  
        files.forEach(file => {
            let filepath = `${compiler.folder_of_file(source_path)}/${file.name}`
            
            if(compiler.should_it_be_compiled(filepath) && 
                file.isFile() && 
                path_resolve(filepath) != path_resolve(source_path)
            ) {
                console.log(`f ${filepath}`)
            }
        })    
    }
    catch(err) {
        console.log(`\n${source_path.bold}`)
        console.log(`    ${err}`.red)
        return
    }
}