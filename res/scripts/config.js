const configYaml = require('config-yaml')
const config = configYaml("./config.yml")

exports.get = (type, conf_path_arr) => {
    if(conf_path_arr.length != 0) {
        let current_config = config
        let found = false

        for(i_conf in conf_path_arr) {
            if(current_config.hasOwnProperty(conf_path_arr[i_conf])) {
                current_config = current_config[conf_path_arr[i_conf]]
            }
            else {
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