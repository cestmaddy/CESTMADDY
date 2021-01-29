const express = require('express')
const fs = require("fs")
const rimraf = require("rimraf")
const colors = require('colors')

const config = require("./res/scripts/config")

const contentDir = "res/content/generated"

// Remove Generated folder and start watcher
/* rimraf(contentDir, () => { 
    const watcher = require("./res/scripts/watcher")
}) */

const app = express()

app.use((req, res, next) => {
    if(!req.path.startsWith("/front/")) {
        // remove trailing slash
        let req_path = req.path.replace(/\/$/, "")
        let req_url = req.url.replace(/\/$/, "")

        if(config.get("boolean", ["server", "hide_html_extension"])) {
            // look for the file with .html
            var file = contentDir + req_path + '.html'
            fs.access(file, fs.constants.R_OK, (err) => {
                if (!err) {
                    req.url = req_url + '.html'
                    next()
                }
                else {
                    // look for the file without .html
                    var file = contentDir + req_path
                    fs.access(file, fs.constants.R_OK, (err) => {
                        if(!err) {
                            // redirect if endsWith .html
                            if(req_path.endsWith('.html')) {
                                let new_path = req_path.substr(0, req_path.length - 5)
                                res.redirect(new_path)
                            }
                            else {
                                next()  
                            }
                        }
                        else {
                            res.status(404)
                            res.end()
                        }
                    })
                }
            })
        }
        else {
            // check if file exist
            var file = contentDir + req_path
            fs.access(file, fs.constants.R_OK, (err) => {
                if(!err) {
                    next()
                }
                else {
                    res.status(404)
                    res.end()
                }
            })
        }
    }
    else {
        next()
    }
})

// redirect */index.html to */
app.use((req, res, next) => {
    //remove trailing slash
    let req_path = req.path.replace(/\/$/, "")

    if(req_path.endsWith('index.html')) {
        let new_path = req_path.substr(0, req_path.length - 10)
        res.redirect(new_path)
    }
    else {
        next()  
    }
})

app.use("/", express.static(contentDir))
app.use("/front", express.static("res/content/front"))

app.listen(config.get("number", ["server", "port"]), () => {
    console.log(`\ncestmaddy started on ::${config.get("number", ["server", "port"])}`.magenta.bold)
})