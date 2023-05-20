import { Request } from 'express';
import { getClientIp } from 'request-ip';
import mime from 'mime-types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MatomoTracker = require('matomo-tracker');

import { conf, env } from '../../config';
import { EConf } from '../../interfaces/interfaces';

let authToken: string;
let matomo: any;

export function matomoInit(): void {
	const siteId = conf('content.tracker.matomo.id', 'number', EConf.Required);
	const instanceUrl = conf('content.tracker.matomo.instance', 'string', EConf.Required);

	authToken = env('MATOMO_TOKEN', 'string', EConf.Required) as string;

	matomo = new MatomoTracker(siteId, instanceUrl);

	matomo.on('error', function (err: any) {
		console.warn(`Matomo error: ${err}`);
	});
}

export function matomoTrack(req: Request, path: string): void {
	if (mime.lookup(path) == 'text/html') {
		matomo.track({
			url: `${req.protocol}://${req.headers.host}${req.url}`,
			ua: req.header('User-Agent'),
			lang: req.header('Accept-Language'),
			token_auth: authToken,
			cip: getClientIp(req),
			urlref: req.get('Referer'),
		});
	}
}
