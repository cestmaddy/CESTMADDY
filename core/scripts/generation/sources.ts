import path from 'path';
import { glob } from 'glob';

import { conf } from '../config';
import { EConf, ESourceType, ISources } from '../interfaces/interfaces';
import { getMeta } from './metadata';
import { getFooterPath, getGeneratedPath, getHeaderPath, getWebPath } from './paths';
import { ROOT, SOURCE_ROOT } from '../const';
import { getCompiledHtml } from './compile';
import { IBlog } from '../interfaces/blog';
import { IPodcast } from '../interfaces/podcast';

const indexReg = new RegExp(/index\.(md|markdown|markdn|mdown|mkd)$/);
const mdReg = new RegExp(/\.(md|markdown|markdn|mdown|mkd)$/);

export function getBlogsInfo(): Map<string, IBlog> {
	const struct: Map<string, IBlog> = new Map();
	const config: object = conf(`content.blogs`, 'object', EConf.Optional);

	if (!config) return struct;
	Object.keys(config).forEach((bName) => {
		const bDir = conf(`content.blogs.${bName}.dir`, 'string', EConf.Required);
		let bDescription = conf(`content.blogs.${bName}.description`, 'string', EConf.Optional);
		let bCategory = conf(`content.blogs.${bName}.category`, 'string', EConf.Optional);
		let bLanguage = conf(`content.blogs.${bName}.language`, 'string', EConf.Optional);

		if (!bDescription) bDescription = '';
		if (!bCategory) bCategory = '';
		if (!bLanguage) bLanguage = conf('content.language', 'string', EConf.Required);

		struct.set(bName, {
			name: bName,
			path: path.join(SOURCE_ROOT, bDir),
			category: bCategory,
			description: bDescription,
			language: bLanguage,
			posts: [],
		});
	});
	return struct;
}

export function getPodcastsInfo(): Map<string, IPodcast> {
	const struct: Map<string, IPodcast> = new Map();
	const config: object = conf(`content.podcasts`, 'object', EConf.Optional);

	if (!config) return struct;
	Object.keys(config).forEach((pName) => {
		const pDir = conf(`content.podcasts.${pName}.dir`, 'string', EConf.Required);
		const pAuthor = conf(`content.podcasts.${pName}.main_author`, 'string', EConf.Required);
		let enclosurePath = conf(`content.podcasts.${pName}.enclosure`, 'string', EConf.Optional);

		const podcast: IPodcast = {
			name: pName,
			path: path.join(SOURCE_ROOT, pDir),
			episodes: [],
			author: {
				name: pAuthor,
				email: conf(`content.podcasts.${pName}.authors.${pAuthor}`, 'string', EConf.Required),
			},
			description: conf(`content.podcasts.${pName}.description`, 'string', EConf.Optional),
			language: conf(`content.podcasts.${pName}.language`, 'string', EConf.Optional),
			country: conf(`content.podcasts.${pName}.country`, 'string', EConf.Optional),
			category: conf(`content.podcasts.${pName}.category`, 'string', EConf.Optional),
			explicit: conf(`content.podcasts.${pName}.explicit`, 'string', EConf.Optional),
			complete: conf(`content.podcasts.${pName}.complete`, 'string', EConf.Optional),
			type: conf(`content.podcasts.${pName}.type`, 'string', EConf.Optional),
			limit: conf(`content.podcasts.${pName}.limit`, 'number', EConf.Optional),
			enclosure: {
				generatedPath: '',
				webPath: '',
			},
		};

		if (enclosurePath) {
			enclosurePath = path.join(SOURCE_ROOT, enclosurePath);
			podcast.enclosure.generatedPath = getGeneratedPath(enclosurePath, ESourceType.Other);
			podcast.enclosure.webPath = getWebPath(enclosurePath, ESourceType.Other);
		}

		struct.set(pName, podcast);
	});
	return struct;
}

function isBlogPost(sourcePath: string, blogs: Map<string, IBlog>): IBlog | undefined {
	for (const blogName of blogs.keys()) {
		const blog = blogs.get(blogName);
		// If it's in a blog directory and it's not the index file
		if (blog && sourcePath.startsWith(path.resolve(ROOT, blog.path)) && !indexReg.test(sourcePath)) return blog;
	}
	return undefined;
}

function isPodcastEpisode(sourcePath: string, podcasts: Map<string, IPodcast>): IPodcast | undefined {
	for (const podcastName of podcasts.keys()) {
		const podcast = podcasts.get(podcastName);
		// If it's in a podcast directory and it's not the index file
		if (podcast && sourcePath.startsWith(path.resolve(ROOT, podcast.path)) && !indexReg.test(sourcePath))
			return podcast;
	}
	return undefined;
}

export async function getSources(): Promise<ISources | void> {
	const sources: ISources = {
		header: '',
		footer: '',
		others: [],
		pages: [],
		blogs: getBlogsInfo(),
		podcasts: getPodcastsInfo(),
	};
	const metaPromises: Array<Promise<void>> = [];
	const headerPath = getHeaderPath();
	const footerPath = getFooterPath();

	const sourceFiles = glob.sync(`${SOURCE_ROOT}/**/*`, { nodir: true });

	// Loop through all files, and push them in the right array
	sourceFiles.forEach((sourcePath) => {
		if (mdReg.test(sourcePath)) {
			// return if it's the header or the footer
			if (sourcePath == headerPath || sourcePath == footerPath) return;

			// return if it's a blog post
			const blog = isBlogPost(sourcePath, sources.blogs);
			if (blog) return metaPromises.push(getMeta(sourcePath, blog));

			// return if it's a podcast episode
			const podcast = isPodcastEpisode(sourcePath, sources.podcasts);
			if (podcast) return metaPromises.push(getMeta(sourcePath, podcast));

			// default to a page
			metaPromises.push(getMeta(sourcePath, sources.pages));
		} else {
			sources.others.push({
				type: ESourceType.Other,
				sourcePath,
				generatedPath: getGeneratedPath(sourcePath, ESourceType.Other),
			});
		}
	});

	await Promise.allSettled(metaPromises).then(async (results) => {
		let hasFail = false;
		results.forEach((result) => {
			if (result.status == 'rejected') hasFail = true;
		});
		if (hasFail) return undefined;
		else {
			// Retrieve Header and Footer content
			if (
				!(await Promise.all([getCompiledHtml(headerPath, sources), getCompiledHtml(footerPath, sources)])
					.then(([header, footer]) => {
						sources.header = header;
						sources.footer = footer;
						return true;
					})
					.catch(() => false))
			)
				return undefined;
		}
	});

	return sources;
}
