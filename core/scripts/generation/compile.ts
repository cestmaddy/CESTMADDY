import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import prism from 'prismjs';
import loadLanguages from 'prismjs/components/index';
import * as prismComponents from 'prismjs/components';
import slugify from 'slugify';

import { ESourceType, IOther, ISources } from '../interfaces/interfaces';
import { replaceShortcodes } from './shortcodes';
import { getThemePath, getWebPath } from './paths';
import { error } from '../log';
import { GENERATED_ROOT } from '../const';

marked.use({
	async: true,
	pedantic: false,
	headerIds: false,
	breaks: false,
	sanitize: false,
	mangle: false,
	smartypants: false,
	xhtml: false,
	renderer: {
		image(href: string, title: string, text: string) {
			let imageHTML = `<img loading="lazy"`;
			if (text) imageHTML += ` alt="${text}"`;
			if (title) imageHTML += ` title="${title}"`;
			if (href) {
				// add the domain to the href
				if (href.startsWith('/')) href = '${"hot": "domain"}' + href;
				imageHTML += ` src="${href}"`;
			}
			imageHTML += `>`;
			return imageHTML;
		},
		link(href: string, title: string, text: string) {
			let linkHTML = `<a`;
			if (title) linkHTML += ` title="${title}"`;
			if (href) {
				// add the domain to the href
				if (href.startsWith('/')) href = '${"hot": "domain"}' + href;
				linkHTML += ` href="${href}"`;
			}
			linkHTML += `>${text}</a>`;
			return linkHTML;
		},
		heading(text, level, raw) {
			return `<h${level} id="${slugify(raw, { strict: true, lower: true, trim: true })}">${text}</h${level}>\n`;
		},
	},
});

marked.use(
	markedHighlight({
		highlight(code, lang) {
			// Check that the language is supported before loading it
			if (lang && prismComponents.languages[lang]) loadLanguages([lang]);
			if (prism.languages[lang]) {
				return prism.highlight(code, prism.languages[lang], lang);
			} else {
				error(undefined, 'COMPILATION', `Language ${lang.bold} is not supported by Prism`, 'WARNING');
				return code;
			}
		},
	}),
);

export async function compileHTML(markdown: string, sourcePath: string, sources: ISources): Promise<string> {
	const metaReg = new RegExp(/^---([\s\S]+?)---/, 'gmy');

	markdown = markdown.replace(metaReg, '');
	markdown = await replaceShortcodes(markdown, sourcePath, sources);

	// Replace every relative path with a /sourceDir/relativePath
	// ${"hot": "domain"} will be added after (to avoid marked error)
	markdown = markdown.replace(
		/\]\((?!http:\/\/|https:\/\/|data:|\/)([\s\S]+?)\)/gm,
		'](' + getWebPath(path.dirname(sourcePath), ESourceType.Page) + '/$1)',
	);

	const html = await marked.parse(markdown);
	if (html == undefined) return Promise.reject();

	return html;
}

export async function getCompiledHtml(filePath: string | null, sources: ISources): Promise<string> {
	if (!filePath) return '';

	// Read file
	const content = await fs.promises.readFile(filePath, 'utf-8').catch((err) => {
		error(filePath, 'COMPILATION', err, 'ERROR');
		return undefined;
	});
	if (content === undefined) return Promise.reject();

	// Compile file
	const compiled = await compileHTML(content, filePath, sources).catch(() => undefined);
	if (compiled === undefined) return Promise.reject();

	return compiled;
}

export function copyTheme(): Promise<void> {
	return new Promise(async (resolve, reject) => {
		if (
			!(await fs.promises
				.cp(getThemePath(), path.join(GENERATED_ROOT, 'front', 'theme'), { recursive: true })
				.then(() => true)
				.catch((err) => {
					error(undefined, 'THEME', err, 'ERROR');
					reject();
					return false;
				}))
		)
			return;
		resolve();
	});
}

export async function writeFile(filePath: string, content: string): Promise<void> {
	// Create containing directory
	const mkdirError = await fs.promises
		.mkdir(path.dirname(filePath), { recursive: true })
		.then(() => undefined)
		.catch((err) => err.message);
	if (mkdirError !== undefined) return Promise.reject(mkdirError);

	// Write file
	const writeError = await fs.promises
		.writeFile(filePath, content)
		.then(() => undefined)
		.catch((err) => err.message);
	if (writeError !== undefined) return Promise.reject(writeError);
}

export function compileOther(other: IOther): Promise<void> {
	return new Promise(async (resolve, reject) => {
		if (
			!(await fs.promises
				.mkdir(path.dirname(other.generatedPath), { recursive: true })
				.then(() => true)
				.catch((err) => {
					error(other.generatedPath, 'COMPILATION', err.message, 'ERROR');
					reject();
					return false;
				}))
		)
			return;

		if (
			!(await fs.promises
				.copyFile(other.sourcePath, other.generatedPath)
				.then(() => true)
				.catch((err) => {
					error(other.generatedPath, 'COMPILATION', err.message, 'ERROR');
					reject();
					return false;
				}))
		)
			return;
		resolve();
	});
}
