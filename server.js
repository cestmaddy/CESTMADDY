const express = require('express')
const fs = require("fs")
const rimraf = require("rimraf")
const configYaml = require('config-yaml')

const config = configYaml("./config.yml")

const contentDir = "res/content/generated"

// Remove Generated folder and start watcher
rimraf(contentDir, () => { 
    const watcher = require("./res/scripts/watcher")
})

const app = express()

app.use((req, res, next) => {
    if(!req.path.startsWith("/front/")) {
        var file = contentDir + req.path + '.html'
        fs.access(file, fs.constants.R_OK, (err) => {
            if (!err) {
                req.url += '.html'
                next()
            }
            else {
                var file = contentDir + req.path
                fs.access(file, fs.constants.R_OK, (err) => {
                    if(!err) {
                        if(req.path.endsWith('.html')) {
                            let new_path = req.path.substr(0, req.path.length - 5)
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
        next()
    }
})

app.use("/", express.static(contentDir))
app.use("/front", express.static("res/content/front"))

app.listen(config.server.port, () => {
    console.log(`cestmaddy started on ::${config.server.port}`)
})