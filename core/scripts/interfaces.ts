//#region Sources
export enum ESourceType {
	Page,
	Post,
	Episode,
	Error,
	Other,
}

export interface IPage {
	type: ESourceType;
	sourcePath: string;
	generatedPath: string;
	title: string;
	description: string;
	css: Array<string>;
	html: string;
}

export interface IPost {
	type: ESourceType;
	sourcePath: string;
	generatedPath: string;
	webPath: string;
	title: string;
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
	};
	css: Array<string>;
	html: string;
}

export interface IBlog {
	name: string;
	path: string;
	description: string;
	category: string;
	language: string;
	posts: Array<IPost>;
}

export interface IEpisode {
	type: ESourceType;
	sourcePath: string;
	generatedPath: string;
	webPath: string;
	title: string;
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

export interface IOther {
	type: ESourceType;
	sourcePath: string;
	generatedPath: string;
}

export interface ISources {
	header: string;
	footer: string;
	others: Array<IOther>;
	pages: Array<IPage>;
	// blogs: Array<IBlog>,
	blogs: Map<string, IBlog>;
	// podcasts: Array<IPodcast>
	podcasts: Map<string, IPodcast>;
}

export function isPage(page: IPage | IPost | IEpisode): page is IPage {
	return page.type == ESourceType.Page;
}

export function isPost(page: IPage | IPost | IEpisode): page is IPost {
	return page.type == ESourceType.Post;
}

export function isEpisode(page: IPage | IPost | IEpisode): page is IEpisode {
	return page.type == ESourceType.Episode;
}

export function isPages(data: Array<IPage> | IBlog | IPodcast): data is Array<IPage> {
	return !('posts' in data);
}

export function isBlog(data: Array<IPage> | IBlog | IPodcast): data is IBlog {
	return 'posts' in data;
}

export function isPodcast(data: Array<IPage> | IBlog | IPodcast): data is IPodcast {
	return 'episodes' in data;
}
//#endregion

export enum EConf {
	Required,
	Optional,
}

//#region Hot/Short codes
export interface HotData {
	domain: string;
	path: string;
	url: string;
}
//#endregion
