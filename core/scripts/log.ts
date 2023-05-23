import path from 'path';
import '@colors/colors';

export function error(
	file: string | undefined,
	step:
		| 'PREPARATION'
		| 'METADATA'
		| 'CONFIG'
		| 'THEME'
		| 'ERROR PAGES'
		| 'FAVICONS'
		| 'COMPILATION'
		| 'FEEDS'
		| 'SERVING'
		| 'ENV',
	error: string,
	type: 'WARNING' | 'ERROR' | 'INFO',
): void {
	let typeString = '';
	let logString = '';

	if (type == 'WARNING') typeString = 'WARNING'.yellow;
	else if (type == 'ERROR') typeString = 'ERROR'.red;
	else typeString = 'INFO'.blue;

	if (step == 'SERVING') {
		// Serving errors
		let filePath = '';
		if (file != undefined) filePath = ` ${file.bold}`;

		logString = `[${typeString}]${filePath}\n    -> ${error}`;
	} else {
		// Compilation errors
		if (file) {
			let filePath = path.relative(path.resolve(), file);
			if (filePath.startsWith('dist/')) filePath = filePath.substring(5);

			logString = `[${typeString}] ${filePath.bold}: ${step}\n    -> ${error}`;
		} else logString = `[${typeString}] ${step}\n    -> ${error}`;
	}

	if (type == 'WARNING') console.warn(logString);
	else if (type == 'ERROR') console.error(logString);
	else console.log(logString);
}

export function logError(): void {
	console.log('FAILED'.red.bold);

	const used = process.memoryUsage().heapUsed / 1024 / 1024;
	console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
}

export function logSuccess(): void {
	console.log('COMPILED'.green.bold);

	const used = process.memoryUsage().heapUsed / 1024 / 1024;
	console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
}
