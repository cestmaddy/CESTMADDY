const path = require("path")
const path_resolve = require("path").resolve
var mkdirp = require('mkdirp')
const fs = require("fs")
const mime = require('mime')
const mp3Duration = require('mp3-duration')
const sp = require('synchronized-promise')

const config = require("./config")
const compiler = require("./compiler")
const blogs = require("./blogs")
const markdown_compiler = require("./markdown_compiler")
const shortcodes = require("./shortcodes")

const contentDir = "./res/content/generated"

exports.compile_podcast_dir = (source_path) => {
    let podcast_config = this.get_podcast_config(source_path)
    
    if(!compiler.is_markdown_file(source_path)) {
        /*
        let blog_dir_without_source = compiler.remove_source_from_path(blog_config["dir"])
        let without_source = compiler.remove_source_from_path(source_path)
        without_source = without_source.substr(blog_dir_without_source.length)
        let copy_dest = `${generated_blog_path}${without_source}`
        
        compiler.copy_file(source_path, `${copy_dest}`)
        */
    }
    else {
        mkdirp(podcast_config["local_path"]).then(() => {
            //this.make_rss_feed(podcast_config)
        })
    }
}

exports.make_rss_feed = (podcast_config) => {
    let podcasts = compiler.get_every_files_with_extension_of_dir(podcast_config['dir'], "md")

    itemsFeed = ""
    podcasts.forEach((podcast) => {
        let source_file = ""
        try {
            source_file = fs.readFileSync(podcast, "utf-8")
        }
        catch(err) {
            console.log(`\n${compiler.remove_before_source_from_path(podcast).bold}`)
            console.log(`    ${err}`.red)
            return
        }

        if(source_file != "") {
            let podcast_data = this.get_podcast_data(source_file, podcast_config, podcast)

            itemsFeed += `
    <item>
        <title>${podcast_data.title}</title>
        <link>${podcast_data.link}</link>
        <guid>${podcast_data.link}</guid>
        <description><![CDATA[${podcast_data.description}]]></description>
        <author>${podcast_data.author.email} (${podcast_data.author.name})</author>
        <enclosure url="${podcast_data.enclosure.url}" length="${podcast_data.enclosure.length}" type="${podcast_data.enclosure.type}"/>
        <pubDate>${podcast_data.date}</pubDate>
        <itunes:duration>${podcast_data.duration}</itunes:duration>
        <itunes:image href="${podcast_data.image}" />
    </item>
            `
        }
    })

    let author_email = undefined
    if(podcast_config.hasOwnProperty("authors") && podcast_config["authors"].hasOwnProperty(podcast_config["main_author"])) {
        author_email = podcast_config["authors"][podcast_config["main_author"]]
    }
   
    let feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"
    xmlns:atom="http://www.w3.org/2005/Atom"
    xmlns:googleplay="http://www.google.com/schemas/play-podcasts/1.0"
    xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
    xmlns:media="http://www.itunes.com/dtds/podcast-1.0.dtd"
    xmlns:spotify="http://www.spotify.com/ns/rss"
    xmlns:dcterms="https://purl.org/dc/terms"
    xmlns:psc="https://podlove.org/simple-chapters/"
>
<channel>
    <atom:link href="${podcast_config["link"]}/feed.xml" rel="self" type="application/rss+xml" />
    <title>${podcast_config["title"]}</title>
    <link>${podcast_config["link"]}</link>
    <description>${podcast_config["description"]}</description>
    <image>
        <link>${podcast_config["link"]}</link>
        <title>${podcast_config["title"]}</title>
        <url>${podcast_config["image_url"]}</url>
    </image>
    <language>${podcast_config["language"]}</language>

    <googleplay:author>${podcast_config["main_author"]}</googleplay:author> 
    <googleplay:image href="${podcast_config["image_url"]}"/>
    <googleplay:category text="${podcast_config["category"]}"/>
    <googleplay:explicit>"${podcast_config["explicit"]}</googleplay:explicit>

    <itunes:owner>
        <itunes:name>${podcast_config["main_author"]}</itunes:name>
        <itunes:email>${author_email}</itunes:email>
    </itunes:owner>
    <itunes:author>${podcast_config["main_author"]}</itunes:author> 
    <itunes:image href="${podcast_config["image_url"]}"/>
    <itunes:category text="${podcast_config["category"]}"/>
    <itunes:complete>${podcast_config["complete"]}</itunes:complete>
    <itunes:explicit>${podcast_config["explicit"]}</itunes:explicit>
    <itunes:type>${podcast_config["type"]}</itunes:type>

    <spotify:limit>${podcast_config["limit"]}</spotify:limit>
    <spotify:countryOfOrigin>${podcast_config["country"]}</spotify:countryOfOrigin>
    ${itemsFeed}
    </channel>
</rss>`
    
    mkdirp(podcast_config["local_path"]).then(() => {
        fs.writeFile(`${podcast_config["local_path"]}/feed.xml`, feed, (err, data) => {
            if(!err) {
                console.log(`\nfeed for podcast ${podcast_config["title"]}`.bold.magenta)
                console.log(`    generated !`.green)
            }
            else {
                console.log(`\nfeed for podcast ${podcast_config["title"]}`.bold)
                console.log(`    ${err}`.red)
            }
        })
    })
    
}

exports.get_podcast_data = (podcast_md, podcast_config, md_podcast_path) => {
    let podcast_shortcodes = shortcodes.get_shortcodes(podcast_md)
    let podcast_data = {
        title: "",
        description: "",
        date: "",
        author: {
            name: "",
            email: ""
        },
        enclosure: {
            url: "",
            type: "",
            length: ""
        },
        image: "",
        duration: "",
        link: ""
    }

    let podcast_dir_without_source = compiler.remove_source_from_path(podcast_config["dir"])
    let without_source_and_ext = compiler.remove_source_and_md_extension_from_path(md_podcast_path)
    without_source_and_ext = without_source_and_ext.substr(podcast_dir_without_source.length)

    // TITLE
    if(podcast_shortcodes.values.hasOwnProperty("[TITLE]")) {
        podcast_data.title = podcast_shortcodes.values["[TITLE]"]
    }

    // DESCRIPTION
    if(podcast_shortcodes.values.hasOwnProperty("[DESCRIPTION]")) {
        podcast_data.description = markdown_compiler.compile(
            shortcodes.replace_shortcode(
                podcast_shortcodes.values["[DESCRIPTION]"],
                md_podcast_path,
                "podcast"
            )
        )
    }

    // LINK
    let podcast_link = `${config.get("string", ["server", "domain"])}${podcast_config["path"]}${without_source_and_ext}`

    if(!config.get("boolean", ["server", "hide_html_extension"])) {
        podcast_link += ".html"
    }

    podcast_data.link = podcast_link
    

    // PODCAST_AUDIO
    if(podcast_shortcodes.values.hasOwnProperty("[PODCAST_AUDIO]")) {
        let audio_path = path_resolve(podcast_shortcodes.values["[PODCAST_AUDIO]"])

        try {
            fs.accessSync(audio_path, fs.constants.R_OK)
            let new_audio_path = `${podcast_config["path"]}${without_source_and_ext}/${path.basename(audio_path)}`

            let copy_dest = `${contentDir}${new_audio_path}`
            
            compiler.copy_file(audio_path, copy_dest)

            let audio_stats = fs.statSync(audio_path)

            let get_audio_duration = sp(mp3Duration)
            let audio_duration = get_audio_duration(audio_path)

            podcast_data.enclosure.url = `${config.get("string", ["server", "domain"])}${new_audio_path}`
            podcast_data.enclosure.length = audio_stats.size
            podcast_data.enclosure.type = mime.getType(path.extname(audio_path))

            podcast_data.duration = this.seconds_to_hours_minutes_seconds(audio_duration)
        }
        catch (err) {
            console.log(`\n${compiler.remove_before_source_from_path(audio_path).bold}`)
            console.log(`    ${err}`.red)
        }
    }

    // PODCAST_IMAGE
    if(podcast_shortcodes.values.hasOwnProperty("[PODCAST_IMAGE]")) {
        let image_path = path_resolve(podcast_shortcodes.values["[PODCAST_IMAGE]"])

        try {
            fs.accessSync(image_path, fs.constants.R_OK)
            let new_image_path = `${podcast_config["path"]}${without_source_and_ext}/${path.basename(image_path)}`

            let copy_dest = `${contentDir}${new_image_path}`
            
            compiler.copy_file(image_path, copy_dest)

            podcast_data.image= `${config.get("string", ["server", "domain"])}${new_image_path}`
        }
        catch (err) {
            console.log(`\n${compiler.remove_before_source_from_path(image_path).bold}`)
            console.log(`    ${err}`.red)
        }
    }

    // DATE
    if(podcast_shortcodes.values.hasOwnProperty("[DATE]")) {
        podcast_data.date = blogs.user_date_to_pub_date(podcast_shortcodes.values["[DATE]"])
    }

    // AUTHOR
    if(podcast_config.hasOwnProperty("main_author") && 
    podcast_config.hasOwnProperty('authors')) {
        if(podcast_shortcodes.values.hasOwnProperty("[AUTHOR]")) {
            if(podcast_config.authors.hasOwnProperty(podcast_shortcodes.values["[AUTHOR]"])) {
                podcast_data.author = {
                    name: podcast_shortcodes.values["[AUTHOR]"],
                    email: podcast_config.authors[podcast_shortcodes.values["[AUTHOR]"]]
                }
            }
            else {
                console.log(`The ${podcast_shortcodes.values["[AUTHOR]"]} author is not referenced in your configuration`.red.bold)
            }
        }
        else {
            if(podcast_config.authors.hasOwnProperty(podcast_config.main_author)) {
                podcast_data.author = {
                    name: podcast_config.main_author,
                    email: podcast_config.authors[podcast_config.main_author]
                }
            }
            else {
                console.log(`The ${podcast_config.main_author} author is not referenced in your configuration`.red.bold)
            }
        }
    }
    else {
        console.log(`Please provide a main_author and a list of authors for your blog ${podcast_config.title}`.red.bold)
    }

    return podcast_data
}

exports.seconds_to_hours_minutes_seconds = (duration) => {
    let hours = Math.floor(duration / 3600)
    let minutes = Math.floor((duration-(hours*3600)) / 60)
    let seconds = Math.floor(duration-minutes*60-hours*3600)
    hours = hours.toString()
    if(hours.length < 2)
        hours = `0${hours}`
    minutes = minutes.toString()
    if(minutes.length < 2)
        minutes = `0${minutes}`
    seconds = seconds.toString()
    if(seconds.length < 2)
        seconds = `0${seconds}`

    return `${hours}:${minutes}:${seconds}`
}

exports.get_podcast_config = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    let config_podcasts = config.get("array", ["content", "podcasts"])
    for(conf_ctr = 0; conf_ctr < config_podcasts.length; conf_ctr++) {
        if(absolute_source_path.startsWith(
            path_resolve(
                config.get("string", ["content", "podcasts", conf_ctr, "dir"])
            )
        )) {
            let podcast_config = []

            podcast_config["dir"] = config.get("string", ["content", "podcasts", conf_ctr, "dir"])
            podcast_config["title"] = config.get("string", ["content", "podcasts", conf_ctr, "title"])
            podcast_config["description"] = config.get("string", ["content", "podcasts", conf_ctr, "description"])
            podcast_config["image"] = config.get("string", ["content", "podcasts", conf_ctr, "image"])
            podcast_config["category"] = config.get("string", ["content", "podcasts", conf_ctr, "category"])
            podcast_config["language"] = config.get("string", ["content", "podcasts", conf_ctr, "language"])
            podcast_config["country"] = config.get("string", ["content", "podcasts", conf_ctr, "country"])
            podcast_config["explicit"] = config.get("string", ["content", "podcasts", conf_ctr, "explicit"])
            podcast_config["complete"] = config.get("string", ["content", "podcasts", conf_ctr, "complete"])
            podcast_config["type"] = config.get("string", ["content", "podcasts", conf_ctr, "type"])
            podcast_config["limit"] = config.get("number", ["content", "podcasts", conf_ctr, "limit"])
            podcast_config["main_author"] = config.get("string", ["content", "podcasts", conf_ctr, "main_author"])
            podcast_config["author"] = config.get("object", ["content", "podcasts", conf_ctr, "authors"])


            // LOCAL PODCAST PATH
            podcast_config["path"] = `/podcast/${path.basename(podcast_config["dir"])}`
            podcast_config["local_path"] = `${contentDir}${podcast_config["path"]}`

            // PODCAST LINK
            podcast_config["link"] = `${config.get("string", ["server", "domain"])}${podcast_config["path"]}`
        
            // PODCAST IMAGE
            if(podcast_config["image"] != "") {
                podcast_config["image_url"] = path_resolve(podcast_config["image"])
                try {
                    fs.accessSync(podcast_config["image_url"], fs.constants.R_OK)
                    let new_image_path = `${podcast_config["local_path"]}/${path.basename(podcast_config["image_url"])}`

                    // problem : called for every podcast file
                    compiler.copy_file(podcast_config["image_url"], new_image_path, true)

                    podcast_config["image_url"] = `${config.get("string", ["server", "domain"])}${podcast_config["path"]}/${path.basename(podcast_config["image_url"])}`
                }
                catch (err) {
                    console.log(`\n${compiler.remove_before_source_from_path(podcast_config["image_url"]).bold}`)
                    console.log(`    ${err}`.red)
                }
            }
            

            return podcast_config
        }
    }
}