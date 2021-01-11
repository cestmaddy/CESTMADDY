const path = require("path")
const path_resolve = require("path").resolve
var mkdirp = require('mkdirp')
const configYaml = require('config-yaml')

const config = configYaml("./config.yml")
const compiler = require("./compiler")

const contentDir = "./res/content/generated"

exports.compile_podcast_dir = (source_path) => {
    let podcast_config = this.get_podcast_config(source_path)
    let generated_podcast_path = `${contentDir}/podcast/${compiler.get_last_portion_of_path(podcast_config["dir"])}`

    mkdirp(generated_podcast_path).then(() => {

    })

    console.log(`\n${compiler.remove_before_source_from_path(source_path).bold}`)
    console.log(`    podcast à compiler !`.red)
}

exports.make_rss_feed = (podcast_config) => {
    return `
        <name>${podcast_config["title"]}</name>
    `
}

exports.get_podcast_config = (source_path) => {
    let absolute_source_path = path_resolve(source_path)

    /* PODCAST */
    if(Array.isArray(config.content.podcasts) && 
        config.content.podcasts.length != 0) {
        for(confpod_ctr = 0; confpod_ctr < config.content.podcasts.length; confpod_ctr++) {
            if(absolute_source_path.startsWith(
                path_resolve(
                    config.content.podcasts[confpod_ctr]["dir"]
                )
            )) {
                return config.content.podcasts[confpod_ctr]
            }
        }
    }
}