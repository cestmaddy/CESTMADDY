import path from 'path';
import { BUILTIN_SHORTCODES_ROOT, CUSTOM_SHORTCODES_ROOT } from '../const';
import { ISources } from '../interfaces';
import { error } from '../log';

async function getShortcodeReturn(obj: any, sourcePath: string, sources: ISources, scPath: string): Promise<string> {
	const sc = await import(scPath).catch((err) => {
		if (err.code == 'MODULE_NOT_FOUND') return Promise.reject('MODULE_NOT_FOUND');
		return undefined;
	});
	if (sc == undefined) return '';

	return await sc.compile(obj, sources).catch((err: any) => {
		error(sourcePath, 'COMPILATION', `Shortcode ${obj['short']}: ${err as string}`, 'ERROR');
		return '';
	});
}

async function compileShortcode(obj: any, sourcePath: string, sources: ISources): Promise<string> {
	let scPath: string;

	if (!obj.hasOwnProperty('short')) {
		if (!obj.hasOwnProperty('hot')) {
			error(
				sourcePath,
				'COMPILATION',
				"You do not specify a 'short' or 'hot' property in a {short, hot}code.",
				'ERROR',
			);
			return '';
		} else return `$${JSON.stringify(obj)}`;
	}

	// Search in built-in Shortcodes
	scPath = path.join(BUILTIN_SHORTCODES_ROOT, obj['short'].replace(/\./g, '/'));
	let compiledSC: string | undefined = await getShortcodeReturn(obj, sourcePath, sources, scPath).catch(() => {
		return undefined;
	});

	// Search in custom Shortcodes
	if (compiledSC == undefined) {
		scPath = path.join(CUSTOM_SHORTCODES_ROOT, obj['short'].replace(/\./g, '/'));
		compiledSC = await getShortcodeReturn(obj, sourcePath, sources, scPath).catch(() => {
			return undefined;
		});
	}

	if (compiledSC == undefined) {
		error(
			sourcePath,
			'COMPILATION',
			`The specified 'short' property ${`(${obj['short']})`.bold} does not match any shortcode.`,
			'ERROR',
		);
		return '';
	}
	return compiledSC;
}

// Always resolve
// Replace the first shortcode and recursively call for the next
// (doing this way because the size of the markdown change at each replacement)
export function replaceShortcodes(
	markdown: string,
	sourcePath: string,
	sources: ISources,
	startIndex = 0,
): Promise<string> {
	return new Promise(async (resolve) => {
		const scReg = new RegExp(/^\$\{[\s\S]*?\}/, 'gm');
		const found = scReg.exec(markdown.substring(startIndex));

		if (!found) return resolve(markdown);

		let nextIndex = startIndex + found.index + found[0].length;
		let foundObj = undefined;
		try {
			foundObj = JSON.parse(found[0].substring(1));
		} catch {
			error(sourcePath, 'COMPILATION', 'A shortcode is badly formatted (the syntax is that of json)', 'ERROR');
		}

		if (foundObj !== undefined) {
			const compiledSc = await compileShortcode(foundObj, sourcePath, sources);
			markdown =
				markdown.substring(0, startIndex + found.index) +
				compiledSc +
				markdown.substring(startIndex + found.index + found[0].length);
			nextIndex = startIndex + found.index + compiledSc.length;
		}

		resolve(await replaceShortcodes(markdown, sourcePath, sources, nextIndex));
	});
}
