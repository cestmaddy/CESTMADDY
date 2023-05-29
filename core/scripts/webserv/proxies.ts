import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { EConf } from '../interfaces/interfaces';
import { conf, env } from '../config';
import { error } from '../log';
import { createNewPath, sendError } from './controllers';

/*
 * Take a router and add proxies fom the config to it
 */
export function addProxies(router: Router) {
	const proxies = conf('content.proxies', 'object', EConf.Optional);
	if (!proxies) return;

	let port = 80;
	const envPort = env('PORT', 'number', EConf.Optional);
	if (envPort) port = envPort as number;

	for (const [route, proxy] of Object.entries(proxies)) {
		if (typeof proxy !== 'string' || typeof route !== 'string') {
			error(undefined, 'CONFIG', 'Proxies configuration should be an object of string', 'ERROR');
			continue;
		}

		const newRoute = route.replace(/\/$/, ''); // Remove trailing slash
		router.use(
			newRoute,
			createProxyMiddleware({
				target: proxy,
				changeOrigin: true,
				ws: true,
				logLevel: 'silent',
				pathRewrite: {
					[`^${newRoute}`]: '',
				},
				router: () => {
					if (proxy.startsWith('/')) return `http://localhost:${port}${createNewPath(proxy, false)}`;
					return proxy;
				},
				onError: (err, req, res) => {
					error(
						`${req.protocol}://${req.headers.host}${newRoute}`,
						'SERVING',
						`Proxy error: ${err.message}`,
						'ERROR',
					);
					sendError(500, res);
				},
			}),
		);
	}
}
