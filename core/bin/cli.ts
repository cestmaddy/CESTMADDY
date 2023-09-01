#! /usr/bin/env node
import fs from 'fs';
import path from 'path';
import shell from 'shelljs';
import chokidar from 'chokidar';
import { parseArgs } from 'util';

import {
	setRoot,
	CONFIG,
	setGeneratedRoot,
	setCustomHotcodesRoot,
	setCustomShortcodesRoot,
	CUSTOM_SHORTCODES_ROOT,
	CUSTOM_HOTCODES_ROOT,
	DIST,
} from '../scripts/const';
import { error } from '../scripts/log';
import { error_usage, log_help } from './help';

// parse arguments
// Usage: cestmaddy [build|start|init] [--watch]
let {
	help = false,
	watch = false,
	positionals = [],
}: {
	help?: boolean;
	watch?: boolean;
	positionals?: string[];
} = {};
try {
	const args = parseArgs({
		allowPositionals: true,
		options: {
			help: {
				type: 'boolean',
				short: 'h',
				default: false,
			},
			watch: {
				type: 'boolean',
				short: 'w',
				default: false,
			},
		},
	});
	help = args.values.help || false;
	watch = args.values.watch || false;
	positionals = args.positionals;
} catch (e) {
	error_usage();
}

if (positionals.length > 1) error_usage();

if (positionals.length === 1) {
	if (!['start', 'build', 'init'].includes(positionals[0])) error_usage();
}

const command = (positionals[0] ?? null) as 'start' | 'build' | 'init' | null;

if (help) {
	log_help(command);
	process.exit(0);
}

// get local directory
const source = process.cwd();

// check if cestici directory exists
const cestici = path.join(source, 'cestici');
if (!fs.existsSync(cestici) && command !== 'init') {
	error(cestici, 'PREPARATION', "cestici directory doesn't exist", 'ERROR');
	process.exit(1);
}

// Init
if (command === 'init') {
	if (fs.existsSync(cestici)) {
		error(cestici, 'PREPARATION', 'cestici directory already exists', 'ERROR');
		process.exit(1);
	}
	// copy deployment/default to cestici
	fs.mkdirSync(cestici);
	fs.cpSync(path.join(DIST, '..', 'deployment', 'default'), cestici, { recursive: true });
	error(
		cestici,
		'PREPARATION',
		'cestici directory created! You can now build the website and start the server with `cestmaddy`',
		'INFO',
	);
	process.exit(0);
}

setRoot(source);

const ORIGINAL_CUSTOM_SHORTCODES_ROOT = CUSTOM_SHORTCODES_ROOT;
const ORIGINAL_CUSTOM_HOTCODES_ROOT = CUSTOM_HOTCODES_ROOT;

setGeneratedRoot(path.join(source, '.dist', 'generated'));
setCustomShortcodesRoot(path.join(source, '.dist', 'custom', 'shortcodes'));
setCustomHotcodesRoot(path.join(source, '.dist', 'custom', 'hotcodes'));

// Import after setting root
import { conf } from '../scripts/config';
import { build } from '../scripts/generation/build';
import { buildCustomShortHotCodes } from './compile-ts';
import { start } from '../server';
import { EConf } from '../scripts/interfaces/interfaces';
import { blue } from 'colorette';

async function buildAll() {
	// Remove .dist directory
	await fs.promises.rm('.dist', { recursive: true, force: true }).catch(() => {
		/* Ignore */
	});

	// Compile typescript custom {short,hot}codes
	buildCustomShortHotCodes(ORIGINAL_CUSTOM_SHORTCODES_ROOT, ORIGINAL_CUSTOM_HOTCODES_ROOT);

	await build();

	// Run additional build commands
	const compileCommands = conf('build.commands.compile', 'array', EConf.Optional);
	if (compileCommands) {
		// Check that every element is a string
		if (!compileCommands.every((e: any) => typeof e === 'string')) {
			error(CONFIG, 'CONFIG', 'build.compile-commands must be an array of strings', 'ERROR');
			process.exit(1);
		}
		console.log();
		compileCommands.forEach((command: string) => {
			error(undefined, 'COMPILATION', `Running ${command}`, 'INFO');
			shell.exec(command);
		});
		console.log();
	}
}

// Async function
(async () => {
	// on watch mode, override the process.exit function to prevent the process from exiting
	if (watch) {
		process.exit = () => {
			/* Ignore */
			return undefined as never;
		};
	}

	// build
	if (command === 'build' || command === null) {
		await buildAll();
	}

	// Start server
	if (command === 'start' || command === null) {
		start();
	}

	// Watch
	if (watch && (command === 'build' || command === null)) {
		console.log(blue('Watching for changes...'));
		chokidar
			.watch(cestici, {
				ignoreInitial: true,
				interval: 2000,
			})
			.on('all', async () => {
				buildAll();
			});
	}
})();
