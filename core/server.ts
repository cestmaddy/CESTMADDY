import express from 'express';
import { bold, magenta } from 'colorette';

import { conf, env } from './scripts/config';
import routes from './scripts/webserv/routes';
import { EConf } from './scripts/interfaces/interfaces';

export function start() {
	let port = 80;

	process.title = `cmy webserver ${conf('content.title', 'string', EConf.Optional)}`;

	const envPort = env('PORT', 'number', EConf.Optional);
	if (envPort) port = envPort as number;

	const app = express();
	app.set('trust proxy', 1);
	app.use('/', routes);
	app.listen(port, () => {
		console.log(magenta(bold(`\ncestmaddy started on ::${port}`)));
	});
}

if (require.main === module) {
	start();
}
