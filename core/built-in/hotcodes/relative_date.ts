import { DateTime } from 'luxon';
import { conf } from '../../scripts/config';
import { EConf, HotData } from '../../scripts/interfaces/interfaces';

/*
 * Relative date
 *
 * @example
 * ${
 *   	"hot": "relative_date",
 *   	"date": "2020-01-01T00:00:00",
 *   	"locale": "en" // optional, default to config.yml (content.language)
 * }
 * => 1 month ago
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function compile(settings: any, data: HotData): Promise<string> {
	if (!settings.hasOwnProperty('date'))
		return Promise.reject("Please specify a 'date' (ISO format) for the relative date shortcode");

	let date = DateTime.fromFormat(settings.date, "yyyy-MM-dd'T'HH:mm:ss");
	if (!date.isValid) date = DateTime.fromISO(settings.date);
	if (!date.isValid) return Promise.reject('Invalid date format (ISO format) for the relative date shortcode');

	const locale = settings.hasOwnProperty('locale')
		? settings.locale
		: conf(`content.language`, 'string', EConf.Required);
	return date.setLocale(locale).toRelative() || '';
}
