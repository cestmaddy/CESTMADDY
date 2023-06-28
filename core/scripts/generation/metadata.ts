import fs from 'fs';
import { load } from 'js-yaml';
import { DateTime } from 'luxon';
import path from 'path';
import mime from 'mime-types';
import getAudioDurationInSeconds from 'get-audio-duration';
import { glob } from 'glob';

import { conf } from '../config';
import { EConf, ESourceType } from '../interfaces/interfaces';
import { getGeneratedPath, getThemePath, getWebPath } from './paths';
import { error } from '../log';
import { IBlog, IPost, getEmptyPost, isBlog, isPost } from '../interfaces/blog';
import { IPage, isPages, isPage, getEmptyPage } from '../interfaces/pages';
import { IPodcast, IEpisode, isPodcast, isEpisode, getEmptyEpisode } from '../interfaces/podcast';

async function setTitle(page: IPage | IPost | IEpisode, fileMeta: any, sourcePath: string): Promise<void> {
	if (fileMeta.hasOwnProperty('title')) page.title = fileMeta.title;
	else error(sourcePath, 'METADATA', "You didn't provide a title", 'WARNING');
}

async function setDate(page: IPage | IPost | IEpisode, fileMeta: any, sourcePath: string): Promise<void> {
	if (!isPost(page) && !isEpisode(page)) return;
	if (!fileMeta.hasOwnProperty('date')) {
		error(sourcePath, 'METADATA', "You didn't provide a date", 'WARNING');
		return;
	}

	try {
		let dateString = '';
		if (fileMeta.date instanceof Date) dateString = fileMeta.date.toISOString();
		else dateString = fileMeta.date;

		let date = DateTime.fromFormat(dateString, "yyyy-MM-dd'T'HH:mm:ss");
		if (!date.isValid) date = DateTime.fromISO(dateString);
		if (date.isValid) {
			page.date.object = date.toJSDate();
			page.date.localeString = date
				.setLocale(conf(`content.language`, 'string', EConf.Required))
				.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
			page.date.relativeString = `\${"hot": "relative_date", "date": "${date.toISO()}"}`;
		} else error(sourcePath, 'METADATA', 'Invalid date format (ISO format)', 'WARNING');
	} catch (e) {
		console.error(e);
	}
}

async function setAuthor(
	page: IPage | IPost | IEpisode,
	fileMeta: any,
	data: Array<IPage> | IBlog | IPodcast,
): Promise<void> {
	if (!isPost(page) && !isEpisode(page)) return;
	if (fileMeta.hasOwnProperty('author')) page.author.name = fileMeta.author;

	if (isBlog(data))
		page.author.email = conf(`content.blogs.${data.name}.authors.${page.author.name}`, 'string', EConf.Required);
	else if (isPodcast(data))
		page.author.email = conf(`content.podcasts.${data.name}.authors.${page.author.name}`, 'string', EConf.Required);
}

async function setDescription(page: IPage | IPost | IEpisode, fileMeta: any, sourcePath: string): Promise<void> {
	if (fileMeta.hasOwnProperty('description')) page.description = fileMeta.description;
	else error(sourcePath, 'METADATA', "You didn't provide a description", 'WARNING');
}

async function setEnclosure(page: IPage | IPost | IEpisode, fileMeta: any, sourcePath: string): Promise<void> {
	if (!isPost(page) && !isEpisode(page)) return;
	if (!fileMeta.hasOwnProperty('enclosure')) {
		if (isEpisode(page)) error(sourcePath, 'METADATA', "You didn't provide an enclosure", 'WARNING');
		return;
	}

	const enclosurePath = path.join(path.dirname(sourcePath), fileMeta.enclosure);
	const canAccess = await fs.promises
		.access(enclosurePath, fs.constants.R_OK)
		.then(() => true)
		.catch(() => false);

	if (!canAccess) {
		error(sourcePath, 'METADATA', `Enclosure file not found: ${enclosurePath}`, 'WARNING');
		return;
	}

	const stats = await fs.promises.stat(enclosurePath);
	page.enclosure.length = stats.size;
	page.enclosure.type = mime.lookup(path.extname(enclosurePath)) || '';
	page.enclosure.generatedPath = getGeneratedPath(enclosurePath, ESourceType.Other);
	page.enclosure.webPath = getWebPath(enclosurePath, ESourceType.Other);
}

async function setPlatforms(page: IPage | IPost | IEpisode, fileMeta: any, sourcePath: string): Promise<void> {
	if (!isEpisode(page)) return;
	if (!fileMeta.hasOwnProperty('platforms')) return;

	if (typeof fileMeta['platforms'] == 'object') page.platforms = fileMeta['platforms'];
	else error(sourcePath, 'METADATA', 'Invalid "platforms" format (need an object)', 'WARNING');
}

async function setAudio(page: IPage | IPost | IEpisode, fileMeta: any, sourcePath: string): Promise<void> {
	if (!isEpisode(page)) return;
	if (!fileMeta.hasOwnProperty('audio')) {
		error(sourcePath, 'METADATA', "You didn't specify an audio file", 'WARNING');
		return;
	}

	const audioPath = path.join(path.dirname(sourcePath), fileMeta.audio);
	const canAccess = await fs.promises
		.access(audioPath, fs.constants.R_OK)
		.then(() => true)
		.catch(() => false);

	if (!canAccess) {
		error(sourcePath, 'METADATA', `Audio file not found: ${audioPath}`, 'ERROR');
		return;
	}

	const stats = await fs.promises.stat(audioPath);
	const audioMime = mime.lookup(path.extname(audioPath));

	page.audio.generatedPath = getGeneratedPath(audioPath, ESourceType.Other);
	page.audio.webPath = getWebPath(audioPath, ESourceType.Other);
	page.audio.length = stats.size;

	if (audioMime) page.audio.mime = audioMime;
	else error(sourcePath, 'METADATA', `Unknown audio MIME type: ${audioPath}`, 'WARNING');

	// Get audio duration
	page.audio.duration = await getAudioDurationInSeconds(audioPath).catch((err) => {
		error(sourcePath, 'METADATA', `Unable to get audio duration: ${audioPath}: ${err}`, 'WARNING');
		return 0;
	});
}

/*
 * Set the page CSS or JS files,
 * according to fileExt (css or js)
 */
async function _setAdditionalFiles(
	page: IPage | IPost | IEpisode,
	fileMeta: any,
	sourcePath: string,
	fileExt: 'css' | 'js',
): Promise<void> {
	if (!fileMeta.hasOwnProperty(fileExt)) return;

	const additionalDir = path.join(getThemePath(), fileExt, 'additional');
	const additionalFiles = await glob(`${additionalDir}/**/*.${fileExt}`);

	const userFiles = [];
	if (typeof fileMeta[fileExt] == 'string') userFiles.push(fileMeta[fileExt]);
	else if (Array.isArray(fileMeta[fileExt])) {
		fileMeta[fileExt].forEach((path: any) => {
			if (typeof path != 'string')
				error(
					sourcePath,
					'METADATA',
					`The ${fileExt.toUpperCase()} array should only contain string`,
					'WARNING',
				);
			else userFiles.push(path);
		});
	} else {
		error(sourcePath, 'METADATA', `Invalid "${fileExt}" format (need a string or an array of string)`, 'WARNING');
		return;
	}

	userFiles.forEach((userFile) => {
		const additionalPath = path.join(additionalDir, userFile);
		let found = false;

		additionalFiles.forEach((file) => {
			if (file == additionalPath) {
				page[fileExt].push(userFile);
				found = true;
				return;
			}
		});
		if (!found)
			error(
				sourcePath,
				'METADATA',
				`Additional ${fileExt.toUpperCase()} file not found: ${additionalPath}`,
				'WARNING',
			);
	});
}

async function setCSS(page: IPage | IPost | IEpisode, fileMeta: any, sourcePath: string): Promise<void> {
	return await _setAdditionalFiles(page, fileMeta, sourcePath, 'css');
}

async function setJS(page: IPage | IPost | IEpisode, fileMeta: any, sourcePath: string): Promise<void> {
	return await _setAdditionalFiles(page, fileMeta, sourcePath, 'js');
}

export async function getMeta(sourcePath: string, data: Array<IPage> | IBlog | IPodcast): Promise<void> {
	const content = await fs.promises.readFile(sourcePath, 'utf-8').catch((err) => {
		error(sourcePath, 'METADATA', `Unable to read metadata: ${err}`, 'ERROR');
		return false;
	});

	if (typeof content == 'boolean') throw Error('Unable to read file.');

	let page: IPage | IPost | IEpisode;
	let fileMeta: any;
	const metaReg = new RegExp(/^---([\s\S]+?)---/, 'gmy');
	const promisesList: Array<Promise<void>> = [];
	const found = metaReg.exec(content);

	if (isBlog(data)) page = getEmptyPost(sourcePath, data);
	else if (isPodcast(data)) page = getEmptyEpisode(sourcePath, data);
	else page = getEmptyPage(sourcePath);

	if (found) {
		try {
			fileMeta = load(found[1]);
		} catch (e) {
			error(sourcePath, 'METADATA', `Invalid YAML syntax: ${e}`, 'ERROR');
			throw Error('Invalid YAML syntax.');
		}
	} else error(sourcePath, 'METADATA', "You didn't provide any metadata", 'WARNING');

	const systemMeta = ['title', 'date', 'author', 'description', 'enclosure', 'platforms', 'audio', 'css', 'js'];
	if (fileMeta) {
		promisesList.push(setTitle(page, fileMeta, sourcePath));
		promisesList.push(setDate(page, fileMeta, sourcePath));
		promisesList.push(setAuthor(page, fileMeta, data));
		promisesList.push(setDescription(page, fileMeta, sourcePath));
		promisesList.push(setEnclosure(page, fileMeta, sourcePath));
		promisesList.push(setPlatforms(page, fileMeta, sourcePath));
		promisesList.push(setAudio(page, fileMeta, sourcePath));
		promisesList.push(setCSS(page, fileMeta, sourcePath));
		promisesList.push(setJS(page, fileMeta, sourcePath));

		// Custom post metadata
		for (const key in fileMeta) {
			if (!systemMeta.includes(key)) {
				page['custom'][key] = fileMeta[key];
			}
		}
	}

	await Promise.allSettled(promisesList).then(() => {
		// PUSH DATA
		if (isBlog(data) && isPost(page)) {
			data.posts.push(page);
		} else if (isPodcast(data) && isEpisode(page)) {
			data.episodes.push(page);
		} else if (isPages(data) && isPage(page)) {
			data.push(page);
		}
	});
}
