const configYaml = require('config-yaml')
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