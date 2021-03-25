const express = require('express')
const fs = require("fs")
const path = require("path")
const colors = require('colors')
const rateSpeedLimiter = require("express-slow-down")

const config = require("./res/scripts/config")
const functions = require("./res/scripts/functions")

const contentDir = "res/content/generated"

const app = express()
const rateSpeedLimit = rateSpeedLimiter({
    delayAfter: 300, // slow down limit (in reqs)
    windowMs: 1 * 60 * 1000, // 1 minute - time where limit applies
    delayMs: 2500 // slow down time
})

app.set('trust proxy', 1)

app.use(rateSpeedLimit)

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

app.use("/front", express.static("res/content/front"))

app.use("/", (req, res) => {
    let file_path = path.join(contentDir, req.path)

    if(file_path.endsWith("/")) {
        file_path += "index.html"
    }

    if(file_path.endsWith(".html")) {
        fs.readFile(file_path, 'utf-8', (err, html) => {
            if (err) throw err;

            html = html.replace(/\w*(?<!\$)\[RELATIVE_DATE([\s\S]*?)\]/g, (_, iso_date) => {
                iso_date = iso_date.substr(1) // remove the =
                return functions.date_to_relative_date(functions.user_date_to_date_object(iso_date))
            })

            res.send(html)
        })
    }
    else {
        res.sendFile(path.resolve(file_path))
    }
})

app.listen(config.get("number", ["server", "port"]), () => {
    console.log(`\ncestmaddy started on ::${config.get("number", ["server", "port"])}`.magenta.bold)
})