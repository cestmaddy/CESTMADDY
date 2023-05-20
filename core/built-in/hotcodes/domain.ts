import { HotData } from '../../scripts/interfaces/interfaces';

/*
 * Domain
 *
 * Return the domain that is used for the current request
 *
 * @example
 * ${ "hot": "domain" }
 * => cestmaddy.com
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function compile(settings: any, data: HotData): Promise<string> {
	return data.domain;
}
