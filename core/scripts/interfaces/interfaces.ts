import { IBlog } from './blog';
import { IPage } from './pages';
import { IPodcast } from './podcast';

//#region Sources
export enum ESourceType {
	Page,
	Post,
	Episode,
	Error,
	Other,
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
