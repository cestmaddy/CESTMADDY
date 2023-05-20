import path from 'path';
import { BUILTIN_HOTCODES_ROOT, CUSTOM_HOTCODES_ROOT } from '../const';
import { HotData } from '../interfaces/interfaces';
import { error } from '../log';

async function getHotcodeReturn(hcPath: string, hotSettings: any, hotData: HotData): Promise<string> {
	const hc = await import(hcPath).catch((err) => {
		if (err.code == 'MODULE_NOT_FOUND') return Promise.reject('MODULE_NOT_FOUND');
		return undefined;
	});
	if (hc === undefined) return '';

	return await hc.compile(hotSettings, hotData).catch((err: any) => {
		error(hotData.url, 'SERVING', `Hotcode ${hotSettings['hot']}: ${err}.`, 'ERROR');
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
	let compiledHc: string | undefined = await getHotcodeReturn(hcPath, hotSettings, hotData).catch(() => {
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
		error(
			hotData.url,
			'SERVING',
			`The specified 'hot' property (${hotSettings['hot']}) does not match any hotcodes.`,
			'ERROR',
		);
		return '';
	}
	return compiledHc;
}

// Always resolve
// Replace the first hotcode and recursively call for the next
// (doing this way because the size of the markdown change at each replacement)
export function replaceHotcodes(markdown: string, hotData: HotData, startIndex = 0): Promise<string> {
	return new Promise(async (resolve) => {
		const hcReg = new RegExp(/\$\{[\s\S]*?\}/, 'gm');
		const found = hcReg.exec(markdown.substring(startIndex));

		if (!found) return resolve(markdown);

		let nextIndex = startIndex + found.index + found[0].length;
		let foundObj = undefined;
		try {
			foundObj = JSON.parse(found[0].substring(1).replace(new RegExp('&quot;', 'g'), '"'));
		} catch {
			error(hotData.url, 'SERVING', `A hotcode is badly formatted (the syntax is that of json)`, 'ERROR');
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
