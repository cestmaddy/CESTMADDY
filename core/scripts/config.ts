import { load } from 'js-yaml';
import dotenv from 'dotenv';
import ISO6391 from 'iso-639-1';

// Conditional import for tests
let fs: typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (process.env.TEST) fs = require('memfs').fs;
else fs = require('fs');
// End conditional import for tests

import { EConf } from './interfaces/interfaces';
import { error } from './log';
import { CONFIG } from './const';

dotenv.config();
let configYaml: unknown = {};

export const loadConfig = () => {
	let file = '';
	try {
		file = fs.readFileSync(CONFIG, 'utf8').toString();
	} catch (e) {
		error(undefined, 'CONFIG', `Could not read config file: ${e}`, 'ERROR');
		process.exit(1);
	}

	try {
		configYaml = load(file);
	} catch (e) {
		error(undefined, 'CONFIG', `Could not parse config file: ${e}`, 'ERROR');
		process.exit(1);
	}
};

export const conf = (
	path: string,
	type: 'number' | 'string' | 'boolean' | 'object' | 'array',
	required: EConf = EConf.Required,
) => {
	const paths: string[] = path.split('.');
	let elem: any;
	let elemType: string;

	elem = configYaml;
	for (let elemI = 0; elemI < paths.length; elemI++) {
		if (elem.hasOwnProperty(paths[elemI])) elem = elem[paths[elemI]];
		else {
			if (required == EConf.Optional) return null;
			error(CONFIG, 'CONFIG', `${paths.slice(0, elemI + 1).join('.')} is not defined`, 'ERROR');
			return process.exit(1);
		}
	}
	// CHECK TYPE
	// supported types : number, string, boolean, object, array
	elemType = typeof elem;
	if (elemType == 'object' && Array.isArray(elem)) elemType = 'array';
	if (elemType != type) {
		error(
			CONFIG,
			'CONFIG',
			`Wrong type for ${path}, it is of type ${elemType} and should be of type ${type}`,
			'ERROR',
		);
		return process.exit(1);
	}

	// CHECK VALUE
	if (path == 'content.language' && !ISO6391.validate(elem)) {
		error(CONFIG, 'CONFIG', `Wrong value for ${path}, it should be a valid ISO 639-1 code`, 'ERROR');
		return process.exit(1);
	}

	return elem;
};

export const set_conf = (new_conf: object) => {
	// Should be only used for tests
	configYaml = new_conf;
};

export function env(
	path: string,
	type: 'string' | 'number',
	required: EConf = EConf.Required,
): string | number | undefined {
	const elem = process.env[path];
	if (elem) {
		if (type == 'number') {
			const num = parseInt(elem);
			if (isNaN(num)) {
				error(undefined, 'ENV', `Wrong type for ${path}, it should be of type number`, 'ERROR');
				return process.exit(1);
			}
			return num;
		}
		return elem as string;
	} else {
		if (required == EConf.Optional) return undefined;
		error(undefined, 'ENV', `Env ${path} is not defined`, 'ERROR');
		return process.exit(1);
	}
}
