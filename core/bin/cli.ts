#! /usr/bin/env node
import fs from 'fs';
import path from 'path';
import shell from 'shelljs';
import chokidar from 'chokidar';

import {
	setRoot,
	CONFIG,
	setGeneratedRoot,
	setCustomHotcodesRoot,
	setCustomShortcodesRoot,
	CUSTOM_SHORTCODES_ROOT,
	CUSTOM_HOTCODES_ROOT,
} from '../scripts/const';
import { error } from '../scripts/log';

// parse arguments
const args = process.argv;
let action: 'build' | 'start' | null = null;
let watch = false;
if (args.length == 3) {
	if (args[2] === 'build') {
		action = 'build';
	} else if (args[2] === 'start') {
		action = 'start';
	} else if (args[2] === '--watch') {
		watch = true;
	} else {
		error(undefined, 'CLI', `Usage: cestmaddy [build|start] [--watch]`, 'ERROR');
		process.exit(1);
	}
} else if (args.length == 4) {
	if (args[3] === '--watch') {
		watch = true;
	} else {
		error(undefined, 'CLI', `Usage: cestmaddy [build|start] [--watch]`, 'ERROR');
		process.exit(1);
	}
} else if (args.length > 4) {
	error(undefined, 'CLI', `Usage: cestmaddy [build|start] [--watch]`, 'ERROR');
	process.exit(1);
}

// get local directory
const source = process.cwd();

// check if cestici directory exists
const cestici = path.join(source, 'cestici');
if (!fs.existsSync(cestici)) {
	error(cestici, 'PREPARATION', "cestici directory doesn't exist", 'ERROR');
	process.exit(1);
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
	await fs.promises.rm('.dist', { recursive: true, force: true }).catch(() => {});

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
	// build
	if (action === 'build' || action === null) {
		await buildAll();
	}

	// Start server
	if (action === 'start' || action === null) {
		start();
	}

	// Watch
	if (watch && (action === 'build' || action === null)) {
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
