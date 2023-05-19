import fs from 'fs';
import { load } from 'js-yaml';
import { DateTime } from 'luxon';
import path from 'path';
import mime from 'mime-types';
import getAudioDurationInSeconds from 'get-audio-duration';
import { glob } from 'glob';

import { conf } from '../config';
import {
	EConf,
	ESourceType,
	IBlog,
	IEpisode,
	IPage,
	IPodcast,
	IPost,
	isBlog,
	isEpisode,
	isPage,
	isPages,
	isPodcast,
	isPost,
} from '../interfaces';
import { getGeneratedPath, getThemePath, getWebPath } from './paths';
import { error } from '../log';

function getEmptyPost(sourcePath: string, blog: IBlog): IPost {
	return {
		type: ESourceType.Post,
		sourcePath,
		generatedPath: getGeneratedPath(sourcePath, ESourceType.Post),
		webPath: getWebPath(sourcePath, ESourceType.Post),
		title: 'Unnamed',
		date: {
			object: new Date(),
			localeString: DateTime.now()
				.setLocale(conf(`content.language`, 'string', EConf.Required))
				.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY),
			relativeString: `\${"hot": "relative_date", "date": "${new Date().toISOString()}"}`,
		},
		author: {
			name: conf(`content.blogs.${blog.name}.main_author`, 'string', EConf.Required),
			email: '',
		},
		description: '',
		enclosure: {
			generatedPath: '',
			webPath: '',
			type: '',
			length: 0,
		},
		css: [],
		html: '', // set in compilation
	};
}

function getEmptyPage(sourcePath: string): IPage {
	return {
		type: ESourceType.Page,
		sourcePath,
		generatedPath: getGeneratedPath(sourcePath, ESourceType.Page),
		title: 'Unnamed',
		description: '',
		css: [],
		html: '', // set in compilation
	};
}

function getEmptyEpisode(sourcePath: string, podcast: IPodcast): IEpisode {
	return {
		type: ESourceType.Episode,
		sourcePath,
		generatedPath: getGeneratedPath(sourcePath, ESourceType.Episode),
		webPath: getWebPath(sourcePath, ESourceType.Episode),
		title: 'Unnamed',
		date: {
			object: new Date(),
			localeString: DateTime.now()
				.setLocale(conf(`content.language`, 'string', EConf.Required))
				.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY),
			relativeString: `\${"hot": "relative_date", "date": "${new Date().toISOString()}"}`,
		},
		author: {
			name: conf(`content.podcasts.${podcast.name}.main_author`, 'string', EConf.Required),
			email: '',
		},
		description: '',
		enclosure: {
			generatedPath: '',
			webPath: '',
			type: '',
			length: 0,
		},
		audio: {
			generatedPath: '',
			webPath: '',
			mime: '',
			length: 0,
			duration: 0,
		},
		platforms: {},
		css: [],
	};
}

export function getMeta(sourcePath: string, data: Array<IPage> | IBlog | IPodcast): Promise<void> {
	return new Promise((resolve, reject) => {
		fs.promises
			.readFile(sourcePath, 'utf-8')
			.then((filecontent) => {
				let page: IPage | IPost | IEpisode;
				let fileMeta: any;
				const metaReg = new RegExp(/^---([\s\S]+?)---/, 'gmy');
				const promisesList: Array<Promise<void>> = [];
				const found = metaReg.exec(filecontent);

				if (isBlog(data)) page = getEmptyPost(sourcePath, data);
				else if (isPodcast(data)) page = getEmptyEpisode(sourcePath, data);
				else page = getEmptyPage(sourcePath);

				if (found) {
					try {
						fileMeta = load(found[1]);
					} catch (e) {
						error(sourcePath, 'METADATA', `Invalid YAML syntax: ${e}`, 'ERROR');
						reject();
					}
				} else error(sourcePath, 'METADATA', "You didn't provide any metadata", 'WARNING');

				if (fileMeta) {
					////////
					// TITLE
					////////
					if (fileMeta.hasOwnProperty('title')) page.title = fileMeta.title;
					else error(sourcePath, 'METADATA', "You didn't provide a title", 'WARNING');
					///////
					// DATE
					///////
					if (isPost(page) || isEpisode(page)) {
						if (fileMeta.hasOwnProperty('date')) {
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
						} else error(sourcePath, 'METADATA', "You didn't provide a date", 'WARNING');
					}
					/////////
					// AUTHOR
					/////////
					if ((isPost(page) && isBlog(data)) || (isEpisode(page) && isPodcast(data))) {
						if (fileMeta.hasOwnProperty('author')) page.author.name = fileMeta.author;
					}
					//////////////
					// DESCRIPTION
					//////////////
					if (fileMeta.hasOwnProperty('description')) page.description = fileMeta.description;
					if (page.description == '')
						error(sourcePath, 'METADATA', "You didn't provide a description", 'WARNING');
					////////////
					// ENCLOSURE
					////////////
					if (isPost(page) || isEpisode(page)) {
						if (fileMeta.hasOwnProperty('enclosure')) {
							promisesList.push(
								new Promise((resolve) => {
									const enclosurePath = path.join(path.dirname(sourcePath), fileMeta.enclosure);
									fs.promises
										.access(enclosurePath, fs.constants.R_OK)
										.then(() => fs.promises.stat(enclosurePath))
										.then((stats) => {
											if (!isPost(page) && !isEpisode(page)) return resolve(); // Should never happen (just for TS)
											page.enclosure.length = stats.size;
											page.enclosure.type = mime.lookup(path.extname(enclosurePath)) || '';
											page.enclosure.generatedPath = getGeneratedPath(
												enclosurePath,
												ESourceType.Other,
											);
											page.enclosure.webPath = getWebPath(enclosurePath, ESourceType.Other);
											resolve();
										})
										.catch(() => {
											error(
												sourcePath,
												'METADATA',
												`Enclosure file not found: ${enclosurePath}`,
												'WARNING',
											);
											resolve();
										});
								}),
							);
						} else if (isEpisode(page))
							error(sourcePath, 'METADATA', "You didn't provide an enclosure", 'WARNING');
					}
					////////////
					// PLATFORMS
					////////////
					if (isEpisode(page)) {
						if (fileMeta.hasOwnProperty('platforms')) {
							if (typeof fileMeta['platforms'] == 'object') page.platforms = fileMeta['platforms'];
							else
								error(sourcePath, 'METADATA', 'Invalid "platforms" format (need an object)', 'WARNING');
						}
					}
					////////
					// AUDIO
					////////
					if (isEpisode(page)) {
						if (fileMeta.hasOwnProperty('audio')) {
							promisesList.push(
								new Promise((resolve) => {
									const audioPath = path.join(path.dirname(sourcePath), fileMeta.audio);
									fs.promises
										.stat(audioPath)
										.then((audioStat) => {
											if (!isEpisode(page)) return resolve();
											const aMime = mime.lookup(path.extname(audioPath));

											page.audio.generatedPath = getGeneratedPath(audioPath, ESourceType.Other);
											page.audio.webPath = getWebPath(audioPath, ESourceType.Other);
											if (aMime) page.audio.mime = aMime;
											else
												error(
													sourcePath,
													'METADATA',
													`Unknown audio MIME type: ${audioPath}`,
													'WARNING',
												);
											page.audio.length = audioStat.size;
											getAudioDurationInSeconds(audioPath)
												.then((aDuration) => {
													if (!isEpisode(page)) return resolve();
													page.audio.duration = aDuration;
												})
												.catch(() => {
													error(
														sourcePath,
														'METADATA',
														`Unable to get audio duration: ${audioPath}`,
														'WARNING',
													);
												})
												.finally(() => {
													resolve();
												});
										})
										.catch(() => {
											error(
												sourcePath,
												'METADATA',
												`Audio file not found: ${audioPath}`,
												'WARNING',
											);
											resolve();
										});
								}),
							);
						} else error(sourcePath, 'METADATA', "You didn't specify an audio file", 'WARNING');
					}
					//////
					// CSS
					//////
					if (fileMeta.hasOwnProperty('css')) {
						promisesList.push(
							new Promise((resolve) => {
								const cssDir = path.join(getThemePath(), 'css', 'additional');

								glob(`${cssDir}/**/*.css`, (err, files) => {
									if (err) {
										error(
											sourcePath,
											'METADATA',
											`Error while retrieving additional CSS files: ${err}`,
											'ERROR',
										);
									}
									// IF CSS IS ONLY A STRING
									else if (typeof fileMeta['css'] == 'string') {
										const cssPath = path.join(cssDir, fileMeta['css']);
										files.forEach((file) => {
											if (file == cssPath) {
												page.css.push(fileMeta['css']);
												return;
											}
										});
										if (page.css.length == 0)
											error(
												sourcePath,
												'METADATA',
												`Additional CSS file not found: ${cssPath}`,
												'WARNING',
											);
									}
									// IF CSS IS AN ARRAY OF STRING
									else if (Array.isArray(fileMeta['css'])) {
										fileMeta['css'].forEach((fileCss) => {
											if (typeof fileCss != 'string')
												error(
													sourcePath,
													'METADATA',
													`The CSS array should only contain string`,
													'WARNING',
												);
											else {
												const cssPath = path.join(cssDir, fileCss);
												let found = false;
												files.forEach((file) => {
													if (file == cssPath) {
														page.css.push(fileCss);
														return (found = true);
													}
												});
												if (!found)
													error(
														sourcePath,
														'METADATA',
														`Additional CSS file not found: ${cssPath}`,
														'WARNING',
													);
											}
										});
									} else {
										error(
											sourcePath,
											'METADATA',
											'Invalid "css" format (need a string or an array of string)',
											'WARNING',
										);
									}
									resolve();
								});
							}),
						);
					}
				}

				/////////
				// AUTHOR
				/////////
				if (isPost(page) || isEpisode(page)) {
					if (isBlog(data))
						page.author.email = conf(
							`content.blogs.${data.name}.authors.${page.author.name}`,
							'string',
							EConf.Required,
						);
					else if (isPodcast(data))
						page.author.email = conf(
							`content.podcasts.${data.name}.authors.${page.author.name}`,
							'string',
							EConf.Required,
						);
				}

				// Promises (enclosure...)
				Promise.allSettled(promisesList).then(() => {
					// PUSH DATA
					if (isBlog(data) && isPost(page)) {
						data.posts.push(page);
					} else if (isPodcast(data) && isEpisode(page)) {
						data.episodes.push(page);
					} else if (isPages(data) && isPage(page)) {
						data.push(page);
					}
					resolve();
				});
			})
			.catch((err) => {
				error(sourcePath, 'METADATA', `Unable to read metadata: ${err}`, 'ERROR');
				reject();
			});
	});
}
