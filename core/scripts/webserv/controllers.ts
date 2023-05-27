import express, { RequestHandler, Response, Request } from 'express';
import path from 'path';
import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const interceptor = require('express-interceptor');

import { conf } from '../config';
import { EConf, HotData } from '../interfaces/interfaces';
import { replaceHotcodes } from '../generation/hotcodes';
import { GENERATED_ROOT } from '../const';

export const sendError = (code: number, res: Response) => {
	const codes: number[] = [404, 500];
	const noTemplateMessage = 'Error, your theme does not provide any template for error';
	let servPath: string = path.resolve(GENERATED_ROOT, 'errors');

	if (codes.includes(code)) {
		servPath = path.join(servPath, `${code}.html`);
		fs.access(servPath, (err) => {
			if (!err) res.status(code).sendFile(servPath);
			else res.status(500).send(`${noTemplateMessage} ${code}`);
		});
	} else res.status(500).send(`${noTemplateMessage} ${code}`);
};

export const staticFront: RequestHandler = express.static(path.resolve(GENERATED_ROOT, 'front'), {
	fallthrough: true,
});

export const staticContent: RequestHandler = express.static(path.resolve(GENERATED_ROOT, 'content'), {
	extensions: ['html'],
	dotfiles: 'deny',
	index: ['index.html', 'post.html', 'episode.html'],
	fallthrough: true,
});

export const static404: RequestHandler = (_req, res) => {
	sendError(404, res);
};

export const redirExtIndexes: RequestHandler = (req, res, next) => {
	const indexFiles: string[] = ['index', 'post', 'episode'];
	let newPath: string = req.path;

	if (newPath.endsWith('.html'))
		// remove .html
		newPath = newPath.substring(0, newPath.length - 5);

	const filename = newPath.split('/').slice(-1)[0];
	if (indexFiles.includes(filename))
		// remove index, post, episode
		newPath = newPath.substring(0, newPath.length - filename.length);

	if (newPath != req.path) res.redirect(newPath);
	else next();
};

export const intercept: RequestHandler = interceptor((req: Request, res: Response) => {
	return {
		isInterceptable: () => {
			// only with HTML / XML
			if (
				/text\/html/.test(res.get('Content-Type') || '') ||
				/application\/xml/.test(res.get('Content-Type') || '')
			)
				return true;
			return false;
		},
		intercept: async (html: string, send: (arg0: string) => void) => {
			const hotData: HotData = {
				domain: `${req.protocol}://${req.headers.host}`,
				path: req.url,
				url: `${req.protocol}://${req.headers.host}${req.url}`,
			};
			send(await replaceHotcodes(html, hotData));
		},
	};
});
