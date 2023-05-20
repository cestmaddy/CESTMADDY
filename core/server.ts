import express from 'express';
import '@colors/colors';

import { conf, env } from './scripts/config';
import routes from './scripts/webserv/routes';
import { EConf } from './scripts/interfaces/interfaces';

let port = 80;

process.title = `cmy webserver ${conf('content.title', 'string', EConf.Optional)}`;

const envPort = env('PORT', 'number', EConf.Optional);
if (envPort) port = envPort as number;

const app = express();
app.set('trust proxy', 1);
app.use('/', routes);
app.listen(port, () => {
	console.log(`\ncestmaddy started on ::${port}`.magenta.bold);
});
