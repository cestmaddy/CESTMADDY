import path from 'path';
import JSON5 from 'json5';
import { BUILTIN_HOTCODES_ROOT, CUSTOM_HOTCODES_ROOT } from '../const';
import { HotData } from '../interfaces/interfaces';
import { error } from '../log';
import { HOTCODE_REGEX_STRING } from './utils';
import { bold } from 'colorette';

async function getHotcodeReturn(
	hcPath: string,
	hotSettings: any,
	hotData: HotData,
	importCanFail = false,
): Promise<string> {
	const hc = await import(hcPath).catch((err) => {
		// Differentiate between a module not found error and a module not found in the hotcode
		if (err.code == 'MODULE_NOT_FOUND') {
			// If the Hotcode is not found (if the hotcode is in the stack trace,
			// it means that it is successfully imported and that the error is in the hotcode)
			if (!err.message.includes(`- ${hcPath}.js`)) {
				if (importCanFail) return Promise.reject('MODULE_NOT_FOUND');
				else {
					error(
						hotData.url,
						'SERVING',
						`The specified 'hot' property (${bold(hotSettings['hot'])}) does not match any hotcode.`,
						'ERROR',
					);
					return '';
				}
			}
			// If the Hotcode is found but one of its dependencies is not
			else {
				error(hotData.url, 'SERVING', `Hotcode ${bold(hotSettings['hot'])}: ${err}.`, 'ERROR');
				return '';
			}
		}

		return undefined;
	});
	if (hc === undefined) return '';

	return await hc.compile(hotSettings, hotData).catch((err: any) => {
		error(hotData.url, 'SERVING', `Hotcode ${bold(hotSettings['hot'])}: ${err}.`, 'ERROR');
		return '';
	});
}

async function compileHotcode(hotSettings: any, hotData: HotData): Promise<string> {
	let hcPath: string;

	if (!hotSettings.hasOwnProperty('hot')) {
		error(hotData.url, 'SERVING', "You do not specify a 'hot' property in a hotcode.", 'ERROR');
		return '';
	}

	// Search in built-in Hotcodes
	hcPath = path.join(BUILTIN_HOTCODES_ROOT, hotSettings['hot'].replace(/\./g, '/'));
	let compiledHc: string | undefined = await getHotcodeReturn(hcPath, hotSettings, hotData, true).catch(() => {
		return undefined;
	});

	// Search in custom Hotcodes
	if (compiledHc == undefined) {
		hcPath = path.join(CUSTOM_HOTCODES_ROOT, hotSettings['hot'].replace(/\./g, '/'));
		compiledHc = await getHotcodeReturn(hcPath, hotSettings, hotData).catch(() => {
			return undefined;
		});
	}

	if (compiledHc == undefined) {
		return '';
	}
	return compiledHc;
}

// Always resolve
// Replace the first hotcode and recursively call for the next
// (doing this way because the size of the markdown change at each replacement)
export function replaceHotcodes(markdown: string, hotData: HotData, startIndex = 0): Promise<string> {
	return new Promise(async (resolve) => {
		// Capture a hotcode, escaped or not, or a escaped shortcode
		const hcReg = new RegExp(HOTCODE_REGEX_STRING, 'gm');
		const found = hcReg.exec(markdown.substring(startIndex));

		if (!found) return resolve(markdown);

		let nextIndex = startIndex + found.index + found[0].length;

		// If the {hot,short}code is escaped, replace it with the unescaped version
		if (found[1] == '\\$') {
			markdown = markdown.substring(0, startIndex + found.index) + '$' + found[2] + markdown.substring(nextIndex);
			return resolve(await replaceHotcodes(markdown, hotData, nextIndex));
		}

		let foundObj = undefined;
		const hotContent = found[0].substring(1).replace(new RegExp('&quot;', 'g'), '"');

		try {
			foundObj = JSON5.parse(hotContent);
		} catch {
			error(hotData.url, 'SERVING', `A hotcode is badly formatted (the syntax is that of json5)`, 'ERROR');
		}

		if (foundObj !== undefined) {
			const compiledHc = await compileHotcode(foundObj, hotData);
			markdown =
				markdown.substring(0, startIndex + found.index) +
				compiledHc +
				markdown.substring(startIndex + found.index + found[0].length);
			nextIndex = startIndex + found.index + compiledHc.length;
		}

		resolve(await replaceHotcodes(markdown, hotData, nextIndex));
	});
}
