const path = require("path")
const fs = require("fs")
const colors = require("colors")
const im = require('imagemagick')
const potrace = require('potrace')
const { optimize } = require('svgo')

const config = require("./config")

var favicon_ejs = path.join("res", "templates", "favicons.ejs")

if(config.get("object", ["content", "favicon"])) {
    if(config.get("string", ["content", "favicon", "path"])) {
        console.log(`\ngenerating favicons`.bold.magenta)

        let favicon_path = config.get("string", ["content", "favicon", "path"])
        let favicons_dir = "./res/content/generated/__favicons"

        fs.mkdir(favicons_dir, {recursive: true}, (err) => {
            if(err) {
                console.log(`\n${`generating favicons`.bold}`)
                console.log(`    ${err}`.red)
            }
            else {
                let site_title = config.get("string", ["content", "title"])
                let theme_color = config.get("string", ["content", "favicon", "theme_color"])
                let background = config.get("string", ["content", "favicon", "background"])
                
                // apple-touch-icon.png - 180x180
                im.convert([
                    '-background', 'transparent',
                    '-gravity', 'center', 
                    favicon_path, 
                    '-resize', '180x180', 
                    '-extent', '180x180',
                    path.join(favicons_dir, "apple-touch-icon.png")
                ], (err, stdout) => {
                    if(err) {
                        console.log(`\n${`generating favicons`.bold}`)
                        console.log(`    ${err}`.red)
                    }                    
                })

                // favicon.icon - 48x48
                im.convert([
                    '-background', 'transparent',
                    '-gravity', 'center', 
                    favicon_path, 
                    '-resize', '48x48', 
                    '-extent', '48x48',
                    path.join(favicons_dir, "favicon.ico")
                ], (err, stdout) => {
                    if(err) {
                        console.log(`\n${`generating favicons`.bold}`)
                        console.log(`    ${err}`.red)
                    }                    
                })

                // favicon-32x32.png - 32x32
                im.convert([
                    '-background', 'transparent',
                    '-gravity', 'center', 
                    favicon_path, 
                    '-resize', '32x32', 
                    '-extent', '32x32',
                    path.join(favicons_dir, "favicon-32x32.png")
                ], (err, stdout) => {
                    if(err) {
                        console.log(`\n${`generating favicons`.bold}`)
                        console.log(`    ${err}`.red)
                    }                    
                })

                // favicon-16x16.png - 16x16
                im.convert([
                    '-background', 'transparent',
                    '-gravity', 'center', 
                    favicon_path, 
                    '-resize', '16x16', 
                    '-extent', '16x16',
                    path.join(favicons_dir, "favicon-16x16.png")
                ], (err, stdout) => {
                    if(err) {
                        console.log(`\n${`generating favicons`.bold}`)
                        console.log(`    ${err}`.red)
                    }                    
                })

                // android-chrome-192x192.png - 192x192
                im.convert([
                    '-background', background,
                    '-gravity', 'center', 
                    favicon_path, 
                    '-resize', '160x160', // add padding
                    '-extent', '192x192',
                    path.join(favicons_dir, "android-chrome-192x192.png")
                ], (err, stdout) => {
                    if(err) {
                        console.log(`\n${`generating favicons`.bold}`)
                        console.log(`    ${err}`.red)
                    }                    
                })

                // android-chrome-512x512.png - 512x512
                im.convert([
                    '-background', background,
                    '-gravity', 'center', 
                    favicon_path, 
                    '-resize', '425x425', // add padding
                    '-extent', '512x512',
                    path.join(favicons_dir, "android-chrome-512x512.png")
                ], (err, stdout) => {
                    if(err) {
                        console.log(`\n${`generating favicons`.bold}`)
                        console.log(`    ${err}`.red)
                    }                    
                })

                // mstile-150x150.png - 150x150
                im.convert([
                    '-background', "transparent",
                    '-gravity', 'center', 
                    favicon_path, 
                    '-resize', '75x75', // add padding
                    '-extent', '150x150',
                    path.join(favicons_dir, "mstile-150x150.png")
                ], (err, stdout) => {
                    if(err) {
                        console.log(`\n${`generating favicons`.bold}`)
                        console.log(`    ${err}`.red)
                    }                    
                })

                // safari-pinned-tab.svg
                if(favicon_path.endsWith(".svg")) {
                    fs.readFile(favicon_path, "utf-8", (err, favicon_svg) => {
                        if(err) {
                            console.log(`\n${render_path.bold}`)
                            console.log(`    ${err}`.red)
                        }
                        else {
                            // optimize, will replace colors to #rrggbb or #rgb
                            optimized_favicon_svg = optimize(favicon_svg, {
                                path: favicon_path,
                                multipass: true
                            })

                            // make a square
                            if(+(optimized_favicon_svg.info.width) > +(optimized_favicon_svg.info.height)) { // +(var) convert var to float
                                // make height equal to width
                                optimized_favicon_svg.data = optimized_favicon_svg.data.replace(/(<svg.*?height=").*?(".*?>)/, `$1${optimized_favicon_svg.info.width}$2`)
                            }
                            else if(+(optimized_favicon_svg.info.height) > +(optimized_favicon_svg.info.width)) { // +(var) convert var to float
                                // make width equal to height
                                optimized_favicon_svg.data = optimized_favicon_svg.data.replace(/(<svg.*?width=").*?(".*?>)/, `$1${optimized_favicon_svg.info.height}$2`)
                            }

                            // replace every colors to black
                            // #aaaaaa
                            optimized_favicon_svg.data = optimized_favicon_svg.data.replace(/#.{6}/g, "#000")
                            // #aaa
                            optimized_favicon_svg.data = optimized_favicon_svg.data.replace(/#.{3}/g, "#000")

                            fs.writeFile(path.join(favicons_dir, "safari-pinned-tab.svg"), optimized_favicon_svg.data, (err) => {
                                if(err) {
                                    console.log(`\n${render_path.bold}`)
                                    console.log(`    ${err}`.red)
                                }
                            })
                        }
                    })
                }
                else {
                    // convert image to monochrome svg
                    potrace.trace(favicon_path, {
                        background: "#00000000",
                        color: '#000000',
                        threshold: 120
                    }, (err, favicon_svg) => {
                        if(err) {
                            console.log(`\n${render_path.bold}`)
                            console.log(`    ${err}`.red)
                        }
                        else {
                            // optimize, will replace colors to #rrggbb or #rgb
                            optimized_favicon_svg = optimize(favicon_svg, {
                                path: favicon_path,
                                multipass: true
                            })

                            fs.writeFile(path.join(favicons_dir, "safari-pinned-tab.svg"), optimized_favicon_svg.data, (err) => {
                                if(err) {
                                    console.log(`\n${render_path.bold}`)
                                    console.log(`    ${err}`.red)
                                }
                            })
                        }
                    })
                }

                // site.webmanifest
                fs.writeFile(path.join(favicons_dir, "site.webmanifest"), 
                    `{
                        "name": "${site_title}",
                        "short_name": "",
                        "icons": [
                            {
                                "src": "/__favicons/android-chrome-192x192.png",
                                "sizes": "192x192",
                                "type": "image/png"
                            },
                            {
                                "src": "/__favicons/android-chrome-512x512.png",
                                "sizes": "512x512",
                                "type": "image/png"
                            }
                        ],
                        "theme_color": "${theme_color}",
                        "background_color": "${background},
                        "display": "standalone"
                    }`, 
                (err) => {
                    if(err) {
                        console.log(`\n${render_path.bold}`)
                        console.log(`    ${err}`.red)
                    }
                })

                // browserconfig.xml
                fs.writeFile(path.join(favicons_dir, "browserconfig.xml"), 
                    `<?xml version="1.0" encoding="utf-8"?>
                    <browserconfig>
                        <msapplication>
                            <tile>
                                <square150x150logo src="/__favicons/mstile-150x150.png"/>
                                <TileColor>${background}</TileColor>
                            </tile>
                        </msapplication>
                    </browserconfig>`, 
                (err) => {
                    if(err) {
                        console.log(`\n${render_path.bold}`)
                        console.log(`    ${err}`.red)
                    }
                })
            }
        })
    }
    else {
        console.log(`You did not specify the image of your favicon`.red)
    }
}