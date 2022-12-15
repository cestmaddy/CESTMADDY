import '@colors/colors';
import fs from 'fs';

import { getSources } from './sources';
import { copyTheme, compileOther } from './compile';
import { EConf, ISources } from '../interfaces';
import { createFavicons } from './favicon';
import { createFeeds } from './feed';
import { conf } from '../config';
import { GENERATED_ROOT } from '../const';
import { error, logError, logSuccess } from '../log';
import { renderErrors, renderPage } from './render';

async function compileSources(sources: ISources): Promise<void> {
	const compilePromises: Array<Promise<void>> = [];

	// Blog posts
	sources.blogs.forEach((blog) => {
		blog.posts.forEach((post) => {
			compilePromises.push(renderPage(post, sources));
		});
	});

	// Podcast episodes
	sources.podcasts.forEach((podcast) => {
		podcast.episodes.forEach((episode) => {
			compilePromises.push(renderPage(episode, sources));
		});
	});

	// Pages
	sources.pages.forEach((page) => {
		compilePromises.push(renderPage(page, sources));
	});

	// Other ressources
	sources.others.forEach((other) => {
		compilePromises.push(compileOther(other));
	});

	await Promise.allSettled(compilePromises).then((results) => {
		let hasFail = false;
		results.forEach((result) => {
			if (result.status == 'rejected') hasFail = true;
		});
		if (hasFail) return Promise.reject();
		else return Promise.resolve();
	});
}

(async function main() {
	process.title = `cmy generation ${conf('content.title', 'string', EConf.Optional)}`;
	console.log('Retrieving metadata'.blue);

	// RETRIEVE METADATA
	const sources = await getSources(); // PAS OK
	if (!sources) return logError();

	// REMOVE GENERATED FOLDER
	if (
		!(await fs.promises
			.rm(GENERATED_ROOT, { recursive: true, force: true })
			.then(() => true)
			.catch((err) => {
				error(undefined, 'PREPARATION', err, 'ERROR');
				logError();
				return false;
			}))
	)
		return;

	console.log('Compiling'.blue);
	// COMPILATION
	Promise.allSettled([
		compileSources(sources),
		renderErrors(),
		copyTheme(),
		createFavicons(), //
	]).then(async (results) => {
		let fail: 'none' | 'other' | 'sources' = 'none';
		for (let r = 0; r < results.length; r++) {
			if (results[r].status == 'rejected') {
				if (r == 0) fail = 'sources';
				else fail = 'other';
				break;
			}
		}

		if (fail == 'sources') {
			error(undefined, 'COMPILATION', 'Compilation error, the feeds have not been generated', 'INFO');
			logError();
			return;
		}

		// Feeds are generated only if there is no error in sources compilation
		const feedFailed = await createFeeds(sources)
			.then(() => false)
			.catch(() => true);

		if (fail == 'other' || feedFailed) logError();
		else logSuccess();
	});
})();
