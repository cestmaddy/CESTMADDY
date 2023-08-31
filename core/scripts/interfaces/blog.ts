import { DateTime } from 'luxon';
import { LanguageCode } from 'iso-639-1';
import { conf } from '../config';
import { getGeneratedPath, getWebPath } from '../generation/paths';
import { EConf, ESourceType, ICustomMeta } from './interfaces';
import { IPage } from './pages';
import { IEpisode, IPodcast } from './podcast';

export interface IPost {
	type: ESourceType;
	sourcePath: string;
	generatedPath: string;
	webPath: string;
	title: string;
	language: LanguageCode;
	date: {
		object: Date;
		localeString: string;
		relativeString: string;
	};
	author: {
		name: string;
		email: string;
	};
	description: string;
	enclosure: {
		generatedPath: string;
		webPath: string;
		type: string;
		length: number;
	};
	css: Array<string>;
	js: Array<string>;
	html: string;
	custom: ICustomMeta;
}

export interface IBlog {
	name: string;
	path: string;
	description: string;
	category: string;
	language: string;
	posts: Array<IPost>;
	feed: boolean;
	global_feed: boolean;
}

export function isPost(page: IPage | IPost | IEpisode): page is IPost {
	return page.type == ESourceType.Post;
}

export function isBlog(data: Array<IPage> | IBlog | IPodcast): data is IBlog {
	return 'posts' in data;
}

export function getEmptyPost(sourcePath: string, blog: IBlog): IPost {
	return {
		type: ESourceType.Post,
		sourcePath,
		generatedPath: getGeneratedPath(sourcePath, ESourceType.Post),
		webPath: getWebPath(sourcePath, ESourceType.Post),
		title: 'Unnamed',
		language: conf(`content.language`, 'string', EConf.Required),
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
		js: [],
		html: '', // set in compilation
		custom: {},
	};
}
