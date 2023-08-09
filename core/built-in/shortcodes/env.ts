export function compile(settings: any): Promise<string> {
	return new Promise((resolve, reject) => {
		if (settings.hasOwnProperty('env') === false) {
			reject('Missing `env` property');
		} else if (process.env[settings['env']]) {
			resolve(process.env[settings['env']] as string);
		} else {
			reject(`Environment variable ${settings['env']} not found`);
		}
	});
}
