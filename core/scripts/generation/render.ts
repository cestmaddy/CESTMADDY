import ejs from 'ejs';
import path from 'path';
import fs from 'fs';

import { conf } from '../config';
import { GENERATED_ROOT, BUILTIN_THEMES_ROOT } from '../const';
import { ESourceType, EConf, IPage, IPost, IEpisode, ISources, isPage, isPost, isEpisode } from '../interfaces';
import { error } from '../log';
import { getCompiledHtml, writeFile } from './compile';
import { getThemePath } from './paths';

export async function renderErrors(): Promise<void> {
	const codes: number[] = [404, 500];
	const templateDirs: string = path.join(getThemePath(), 'templates', 'errors');
	const compilePromises: Array<Promise<void>> = [];

	codes.forEach((code) => {
		compilePromises.push(
			new Promise(async (resolve, reject) => {
				const templatePath: string = path.join(templateDirs, `${code.toString()}.ejs`);
				const generatedPath: string = path.join(GENERATED_ROOT, 'errors', `${code.toString()}.html`);

				// Check if template exists and is readable
				const accessTemplate = await fs.promises
					.access(templatePath, fs.constants.R_OK)
					.then(() => true)
					.catch((err) => {
						if (err.hasOwnProperty('code') && err.code == 'ENOENT') {
							error(
								undefined,
								'ERROR PAGES',
								`Template for error code ${code.toString()} not found`,
								'WARNING',
							);
							resolve();
							return false;
						} else {
							error(undefined, 'ERROR PAGES', err, 'ERROR');
							reject();
							return false;
						}
					});
				if (!accessTemplate) return;

				const renderOptions = {
					content: {
						type: ESourceType.Error,
					},
					site: {
						title: conf('content.title', 'string', EConf.Required),
						language: conf('content.language', 'string', EConf.Required),
						favicon: {
							theme_color: conf('content.favicon.theme_color', 'string', EConf.Optional),
							background: conf('content.favicon.background', 'string', EConf.Optional),
						},
					},
					ejsFavicons: path.resolve(BUILTIN_THEMES_ROOT, 'favicons.ejs'),
					ejsCSS: path.resolve(BUILTIN_THEMES_ROOT, 'css.ejs'),
				};

				// Render template
				const renderedHtml: string | undefined = await ejs
					.renderFile(templatePath, renderOptions)
					.catch((err) => {
						error(undefined, 'ERROR PAGES', err, 'ERROR');
						return undefined;
					});
				if (renderedHtml == undefined) return reject();

				// Write to file
				if (
					!(await writeFile(generatedPath, renderedHtml)
						.then(() => true)
						.catch((err) => {
							error(generatedPath, 'ERROR PAGES', err, 'ERROR');
							return false;
						}))
				)
					return reject();

				return resolve();
			}),
		);
	});

	const hasError: boolean = await Promise.allSettled(compilePromises).then((results) => {
		let hasFail = false;
		results.forEach((result) => {
			if (result.status == 'rejected') hasFail = true;
		});
		if (hasFail) return true;
		else return false;
	});
	if (hasError) return Promise.reject();
	else return Promise.resolve();
}

export async function renderPage(page: IPage | IPost | IEpisode, sources: ISources): Promise<void> {
	// Get compiled HTML
	const compiledHtml: string | undefined = await getCompiledHtml(page.sourcePath, sources).catch(() => undefined);
	if (compiledHtml === undefined) return Promise.reject();
	if (isPage(page) || isPost(page)) page.html = compiledHtml;

	// Get template path
	const templateDir: string = path.join(getThemePath(), 'templates');
	let templatePath: string = path.join(templateDir, 'page.ejs');
	if (isPost(page)) templatePath = path.join(templateDir, 'post.ejs');
	else if (isEpisode(page)) templatePath = path.join(templateDir, 'episode.ejs');

	// Create render options
	const renderOptions = {
		content: page,
		site: {
			title: conf('content.title', 'string', EConf.Required),
			language: conf('content.language', 'string', EConf.Required),
			header: sources.header,
			footer: sources.footer,
			favicon: {
				theme_color: conf('content.favicon.theme_color', 'string', EConf.Optional),
				background: conf('content.favicon.background', 'string', EConf.Optional),
			},
		},
		ejsFavicons: path.resolve('dist', 'core', 'built-in', 'themes', 'favicons.ejs'),
		ejsCSS: path.resolve('dist', 'core', 'built-in', 'themes', 'css.ejs'),
		sources: {
			blogs: sources.blogs,
			podcasts: sources.podcasts,
		},
	};

	// Render template
	const renderedHtml: string | undefined = await ejs.renderFile(templatePath, renderOptions).catch((err) => {
		if (err.hasOwnProperty('code') && err.code == 'ENOENT')
			error(page.sourcePath, 'COMPILATION', `Template not found (${path.basename(templatePath)})`, 'ERROR');
		else error(page.sourcePath, 'COMPILATION', err, 'ERROR');
		return undefined;
	});
	if (renderedHtml == undefined) return Promise.reject();

	// Write to file
	if (
		!(await writeFile(page.generatedPath, renderedHtml)
			.then(() => true)
			.catch((err) => {
				error(page.sourcePath, 'COMPILATION', err, 'ERROR');
				return false;
			}))
	)
		return Promise.reject();
}
