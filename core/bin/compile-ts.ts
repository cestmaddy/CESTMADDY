import ts from 'typescript';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import { blue } from 'colorette';

import { CUSTOM_SHORTCODES_ROOT, CUSTOM_HOTCODES_ROOT, ROOT } from '../scripts/const';

export function buildCustomShortHotCodes(shortcodesRoot = CUSTOM_SHORTCODES_ROOT, hotcodesRoot = CUSTOM_HOTCODES_ROOT) {
	// List custom shortcodes
	const customShortcodes = glob.sync(`${shortcodesRoot}/**/*.ts`);
	// List custom hotcodes
	const customHotcodes = glob.sync(`${hotcodesRoot}/**/*.ts`);

	const customTSFiles = [...customShortcodes, ...customHotcodes];
	if (customTSFiles.length === 0) return;

	console.log(blue('Building custom shortcodes and hotcodes'));

	// Build TypeScript files
	const tsConfig = ts.parseJsonConfigFileContent(
		ts.readConfigFile('tsconfig.json', ts.sys.readFile),
		ts.sys,
		__dirname,
	);

	for (const tsFile of customTSFiles) {
		const tsContent = fs.readFileSync(tsFile, 'utf-8');
		const jsContent = ts.transpileModule(tsContent, {
			compilerOptions: tsConfig.options,
		}).outputText;

		// Get file path (remove root path)
		const filePath = tsFile.replace(`${shortcodesRoot}/`, '').replace(`${hotcodesRoot}/`, '');

		let jsPath = '';
		if (tsFile.startsWith(shortcodesRoot)) {
			jsPath = path.join(ROOT, '.dist', 'custom', 'shortcodes', filePath.replace(/\.ts$/, '.js'));
		} else if (tsFile.startsWith(hotcodesRoot)) {
			jsPath = path.join(ROOT, '.dist', 'custom', 'hotcodes', filePath.replace(/\.ts$/, '.js'));
		}

		// Module replacement
		if (require.cache[jsPath]) {
			delete require.cache[jsPath];
		}

		fs.mkdirSync(path.dirname(jsPath), { recursive: true });
		fs.writeFileSync(jsPath, jsContent);
	}
}
