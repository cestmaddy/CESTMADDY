import { LanguageCode } from 'iso-639-1';
import { getGeneratedPath, getWebPath } from '../generation/paths';
import { IPost, IBlog } from './blog';
import { EConf, ESourceType, ICustomMeta } from './interfaces';
import { IEpisode, IPodcast } from './podcast';
import { conf } from '../config';

export interface IPage {
	type: ESourceType;
	sourcePath: string;
	generatedPath: string;
	webPath: string;
	title: string;
	language: LanguageCode;
	description: string;
	css: Array<string>;
	js: Array<string>;
	html: string;
	custom: ICustomMeta;
}

export function isPage(page: IPage | IPost | IEpisode): page is IPage {
	return page.type == ESourceType.Page;
}

export function isPages(data: Array<IPage> | IBlog | IPodcast): data is Array<IPage> {
	return !('posts' in data || 'episodes' in data);
}

export function getEmptyPage(sourcePath: string): IPage {
	return {
		type: ESourceType.Page,
		sourcePath,
		generatedPath: getGeneratedPath(sourcePath, ESourceType.Page),
		webPath: getWebPath(sourcePath, ESourceType.Page),
		title: 'Unnamed',
		language: conf(`content.language`, 'string', EConf.Required),
		description: '',
		css: [],
		js: [],
		html: '', // set in compilation
		custom: {},
	};
}
