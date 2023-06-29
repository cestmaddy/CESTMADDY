import { DateTime } from 'luxon';
import { LanguageCode } from 'iso-639-1';
import { conf } from '../config';
import { getGeneratedPath, getWebPath } from '../generation/paths';
import { IPost, IBlog } from './blog';
import { EConf, ESourceType, ICustomMeta } from './interfaces';
import { IPage } from './pages';

export interface IEpisode {
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
	audio: {
		generatedPath: string;
		webPath: string;
		mime: string;
		length: number;
		duration: number;
	};
	platforms: object;
	css: Array<string>;
	js: Array<string>;
	custom: ICustomMeta;
}

export interface IPodcast {
	name: string;
	path: string;
	description: string;
	enclosure: {
		generatedPath: string;
		webPath: string;
	};
	category: string;
	language: string;
	country: string;
	explicit: string;
	complete: string;
	type: string;
	limit: number;
	author: {
		name: string;
		email: string;
	};
	episodes: Array<IEpisode>;
}

export function isEpisode(page: IPage | IPost | IEpisode): page is IEpisode {
	return page.type == ESourceType.Episode;
}

export function isPodcast(data: Array<IPage> | IBlog | IPodcast): data is IPodcast {
	return 'episodes' in data;
}

export function getEmptyEpisode(sourcePath: string, podcast: IPodcast): IEpisode {
	return {
		type: ESourceType.Episode,
		sourcePath,
		generatedPath: getGeneratedPath(sourcePath, ESourceType.Episode),
		webPath: getWebPath(sourcePath, ESourceType.Episode),
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
		js: [],
		custom: {},
	};
}
