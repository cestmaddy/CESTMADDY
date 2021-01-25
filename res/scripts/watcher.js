const chokidar = require('chokidar')
const fs = require("fs")

const compiler = require("./compiler")
const config = require("./config")

const contentDir = "./res/content/generated"

const watcher = chokidar.watch('source', { persistent: true })

fileChange = (path) => {
    compiler.compile(path)
}

removeFile = (path) => {
    // remove source/
    let old_file_path = `${contentDir}${path.substr(6, path.length)}`

    // check if file hav been compiled
    fs.access(`${old_file_path}`, fs.constants.F_OK, (err) => {
        console.log(`\n${path.bold}`)
        if (!err) {
            fs.unlink(`${old_file_path}`, (err) => {
                if(err) {
                    console.log(`    ${err}`.red)
                }
                else {
                    console.log(`    Successfully deleted!`.green)
                }
            })
        }
        else {
            // try replace .md with .html
            old_file_path = `${old_file_path.substr(0, old_file_path.length - 3)}.html`
            fs.unlink(`${old_file_path}`, (err) => {
                if(err) {
                    console.log(`    ${err}`.red)
                }
                else {
                    console.log(`    Successfully deleted!`.green)
                }
            })
        }
    })
}

// Add event listeners.
watcher
  .on('add', path => fileChange(path))
  .on('change', path => fileChange(path))
  .on('unlink', path => removeFile(path))
  .on('error', error => console.log(`Watcher error: ${error}`.red))