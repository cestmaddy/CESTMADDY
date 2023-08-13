import { error } from '../scripts/log';

export function error_usage() {
	error(undefined, 'CLI', `Usage: cestmaddy [build|start|init] [-h,--help] [-w,--watch]`, 'ERROR');
	process.exit(1);
}

export function log_help(command: string | null = null) {
	if (!command) {
		console.log(`usage: cestmaddy [start|build|init] [--watch]

Without command, will build the site and start the server.

commands:
  start    Start the server
  build    Build the site
  init     Create a new site

options:
  -h, --help   Show this help message
  -w, --watch  Watch for file changes and rebuild automatically`);
	} else if (command === 'start') {
		console.log(`usage: cestmaddy start [-h,--help]

Start the server.

options:
  -h, --help   Show this help message`);
	} else if (command === 'build') {
		console.log(`usage: cestmaddy build [-h,--help] [-w,--watch]

Build the site.

options:
  -h, --help   Show this help message
  -w, --watch  Watch for file changes and rebuild automatically`);
	} else if (command === 'init') {
		console.log(`usage: cestmaddy init [-h,--help]

Create a new site.

options:
  -h, --help   Show this help message`);
	}
}
