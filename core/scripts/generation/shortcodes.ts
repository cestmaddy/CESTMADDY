import path from 'path';
import JSON5 from 'json5';
import { BUILTIN_SHORTCODES_ROOT, CUSTOM_SHORTCODES_ROOT } from '../const';
import { ISources } from '../interfaces/interfaces';
import { error } from '../log';
import { SHORTCODE_REGEX_STRING } from './utils';
import { bold } from 'colorette';

async function getShortcodeReturn(
	obj: any,
	sourcePath: string,
	sources: ISources,
	scPath: string,
	importCanFail = false,
): Promise<string> {
	const sc = await import(scPath).catch((err) => {
		// Differentiate between a module not found error and a module not found in the shortcode
		if (err.code == 'MODULE_NOT_FOUND') {
			// If the Shortcode is not found (if the shortcode is in the stack trace,
			// it means that it is successfully imported and that the error is in the shortcode)
			if (!err.message.includes(`- ${scPath}.js`)) {
				if (importCanFail) return Promise.reject('MODULE_NOT_FOUND');
				else {
					error(
						sourcePath,
						'COMPILATION',
						`The specified 'short' property (${bold(obj['short'])}) does not match any shortcode.`,
						'ERROR',
					);
					return '';
				}
			}
			// If the Shortcode is found but one of its dependencies is not
			else {
				error(sourcePath, 'COMPILATION', `Shortcode ${bold(obj['short'])}: ${err}.`, 'ERROR');
				return '';
			}
		}
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
	let compiledSC: string | undefined = await getShortcodeReturn(obj, sourcePath, sources, scPath, true).catch(() => {
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
		// Capture a shortcode, but not if it is escaped
		const scReg = new RegExp(SHORTCODE_REGEX_STRING, 'gm');
		const found = scReg.exec(markdown.substring(startIndex));

		if (!found) return resolve(markdown);

		let nextIndex = startIndex + found.index + found[0].length;
		let foundObj = undefined;
		try {
			foundObj = JSON5.parse(found[0].substring(1));
		} catch {
			error(sourcePath, 'COMPILATION', 'A shortcode is badly formatted (the syntax is that of json5)', 'ERROR');
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
