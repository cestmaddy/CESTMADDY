const express = require('express')
const fs = require("fs")
const path = require("path")
const colors = require('colors')
const rateSpeedLimiter = require("express-slow-down")
var interceptor = require('express-interceptor')

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

var replaceInHtml = interceptor((req, res) => {
    return {
        // Only HTML responses will be intercepted
        isInterceptable: () => {
            return /text\/html/.test(res.get('Content-Type'))
        },
        intercept: (html, send) => {
            html = html.replace(/\w*(?<!\$)\[RELATIVE_DATE([\s\S]*?)\]/g, (_, iso_date) => {
                iso_date = iso_date.substr(1) // remove the =
                return functions.date_to_relative_date(functions.user_date_to_date_object(iso_date))
            })
            send(html)
        }
    }
})

app.use(replaceInHtml)

app.use("/front", express.static("res/content/front", {
    fallthrough: true
}))

// redirect 
//      /index.html to /
//      /index to /
//      /post.html to /
//      /post to /
//      /podcast.html to /
//      /podcast to /
app.use((req, res, next) => {
    //remove trailing slash
    let req_path = req.path.replace(/\/$/, "")
    let new_path = req_path

    if(req_path.endsWith('index.html'))
        new_path = new_path.substr(0, req_path.length - 10)
    else if(req_path.endsWith('index'))
        new_path = new_path.substr(0, req_path.length - 5)
    else if(req_path.endsWith('post.html'))
        new_path = new_path.substr(0, req_path.length - 9)
    else if(req_path.endsWith('post'))
        new_path = new_path.substr(0, req_path.length - 4)
    else if(req_path.endsWith('podcast.html'))
        new_path = new_path.substr(0, req_path.length - 12)
    else if(req_path.endsWith('podcast'))
        new_path = new_path.substr(0, req_path.length - 7)

    if(new_path != req_path)
        res.redirect(new_path)
    else
        next()  
})

app.use("/", express.static(contentDir, {
    extensions: ["html"],
    dotfiles: "deny",
    index: ["index.html", "post.html", "podcast.html"],
    fallthrough: true
}))

app.use((req, res, next) => {
    error("404", req, res)
})

app.listen(config.get("number", ["server", "port"]), () => {
    console.log(`\ncestmaddy started on ::${config.get("number", ["server", "port"])}`.magenta.bold)
})

error = (code, req, res) => {
    switch(code) {
        case "404":
            res.status(404).sendFile(path.resolve(path.join(contentDir, "__errors", "404.html")))
            break;
        default:
            res.status(500)
            res.send("500 - Error")
            break;
    }
}