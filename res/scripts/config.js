const configYaml = require('config-yaml')
const path = require("path")

const config = configYaml("./config.yml")
require('dotenv').config()

exports.get = (type, conf_path_arr, required=true) => {
    // FROM ENV VAR
    if(conf_path_arr[0] == "server" && conf_path_arr[1] == "port") {
        if(process.env.PORT) {
            return process.env.PORT
        }
    }

    // FROM CONFIG
    if(conf_path_arr.length != 0) {
        let current_config = config
        let found = false

        for(i_conf in conf_path_arr) {
            if(current_config.hasOwnProperty(conf_path_arr[i_conf])) {
                current_config = current_config[conf_path_arr[i_conf]]
            }
            else {
                if(required)
                    console.log(`Config : ${conf_path_arr.slice(0, i_conf+1).join(".")} is not defined`.yellow)
                break
            }

            if(i_conf == conf_path_arr.length-1) {
                found = true
            }
        }

        if(found) {
            if(typeof(current_config) == type) {
                return current_config
            }
            else {
                if(Array.isArray(current_config)) {
                    if(type == 'array') {
                        return current_config
                    }
                    else {
                        console.log(`Config : ${conf_path_arr.slice(0, i_conf+1).join(".")} is an array rather than a ${type}`.red)
                    }
                }
                else {
                    console.log(type, conf_path_arr, current_config)
                    console.log(`Config : ${conf_path_arr.slice(0, i_conf+1).join(".")} is a ${typeof(current_config)} rather than a ${type}`.red)
                }
            }
        }
    }

    switch(type) {
        case 'number':
            return 0
        case 'string':
            return ""
        case 'array':
            return []
        case 'object':
            return {}
        case 'boolean':
            return false
    }
}

let absolute_blogs_paths = []
let config_blogs = this.get("array", ["content", "blogs"], false)
for(conf_ctr = 0; conf_ctr < config_blogs.length; conf_ctr++) {
    if(!absolute_blogs_paths.includes(
        path.resolve(
            this.get("string", ["content", "blogs", conf_ctr, "dir"])
        )
    )) {
        absolute_blogs_paths.push(
            path.resolve(
                this.get("string", ["content", "blogs", conf_ctr, "dir"])
            )
        )
    }
}
exports.get_absolute_blogs_paths = () => {
    return absolute_blogs_paths
}

let absolute_podcasts_paths = []
let config_podcasts = this.get("array", ["content", "podcasts"], false)
for(conf_ctr = 0; conf_ctr < config_podcasts.length; conf_ctr++) {
    if(!absolute_podcasts_paths.includes(
        path.resolve(
            this.get("string", ["content", "podcasts", conf_ctr, "dir"])
        )
    )) {
        absolute_podcasts_paths.push(
            path.resolve(
                this.get("string", ["content", "podcasts", conf_ctr, "dir"])
            )
        )
    }
}
exports.get_absolute_podcasts_paths = () => {
    return absolute_podcasts_paths
}