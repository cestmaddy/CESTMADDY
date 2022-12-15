import { ISources } from '../../../core/scripts/interfaces';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function compile(settings: any, sources: ISources): Promise<string> {
	return new Promise((resolve) => {
		resolve(`Hello World!`);
	});
}
