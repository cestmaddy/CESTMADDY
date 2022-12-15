import path from 'path';
import im from 'imagemagick';
import fs from 'fs';
import { optimize, PluginConfig, Output as SvgoOutput } from 'svgo';

import { conf } from '../config';
import { EConf } from '../interfaces';
import { error } from '../log';
import { GENERATED_ROOT, SOURCE_ROOT } from '../const';

interface IImgOpt {
	options: Array<string>;
	generatedPath: string;
}

// custom plugin to make the svg squarred
const svgo_plugin_findSize: PluginConfig = {
	name: 'find-size',
	fn: () => {
		return {
			element: {
				enter: (node, parentNode) => {
					if (parentNode.type === 'root') {
						const width = parseFloat(node.attributes.width);
						const height = parseFloat(node.attributes.height);

						// make a square
						if (width > height)
							// make height equal to width
							node.attributes.height = width.toString();
						// make width equal to height
						else node.attributes.width = height.toString();
					}
				},
			},
		};
	},
};

// custom plugin to replace every colors to black
const svgo_plugin_toBlack: PluginConfig = {
	name: 'to-black',
	fn: () => {
		return {
			element: {
				enter: (node) => {
					if (node.attributes && node.attributes.style) {
						node.attributes.style = node.attributes.style.replace(
							/#(?:\d|[a-fA-F]){8}|#(?:\d|[a-fA-F]){6}|#(?:\d|[a-fA-F]){3}/g,
							'#000',
						); // #12345678, #123456, #132
					}
				},
			},
		};
	},
};

export function createFavicons(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!conf('content.favicon.path', 'string', EConf.Optional)) return resolve();

		const faviconsPromises: Array<Promise<void>> = [];
		const faviconPath = path.join(SOURCE_ROOT, conf('content.favicon.path', 'string', EConf.Required));
		const generatedDir = path.join(GENERATED_ROOT, 'front', 'favicons');
		const themeColor = conf('content.favicon.theme_color', 'string', EConf.Optional);
		const themeBackground = conf('content.favicon.background', 'string', EConf.Optional);
		const siteTitle = conf('content.title', 'string', EConf.Required);

		fs.promises
			.mkdir(generatedDir, { recursive: true })
			.then(() => {
				const imgOptions: Array<IImgOpt> = [];

				// apple-touch-icon.png - 180x180
				imgOptions.push({
					options: ['-resize', '180x180', '-extent', '180x180'],
					generatedPath: path.join(generatedDir, 'apple-touch-icon.png'),
				});
				// favicon.ico - 48x48
				imgOptions.push({
					options: ['-resize', '48x48', '-extent', '48x48'],
					generatedPath: path.join(generatedDir, 'favicon.ico'),
				});
				// favicon-32x32.png - 32x32
				imgOptions.push({
					options: ['-resize', '32x32', '-extent', '32x32'],
					generatedPath: path.join(generatedDir, 'favicon-32x32.png'),
				});
				// favicon-16x16.png - 16x16
				imgOptions.push({
					options: ['-resize', '16x16', '-extent', '16x16'],
					generatedPath: path.join(generatedDir, 'favicon-16x16.png'),
				});
				// android-chrome-192x192.png - 192x192
				imgOptions.push({
					options: [
						'-resize',
						'160x160', // add padding
						'-extent',
						'192x192',
					],
					generatedPath: path.join(generatedDir, 'android-chrome-192x192.png'),
				});
				// android-chrome-512x512.png - 512x512
				imgOptions.push({
					options: [
						'-resize',
						'425x425', // add padding
						'-extent',
						'512x512',
					],
					generatedPath: path.join(generatedDir, 'android-chrome-512x512.png'),
				});
				// mstile-150x150.png - 150x150
				imgOptions.push({
					options: [
						'-resize',
						'75x75', // add padding
						'-extent',
						'150x150',
					],
					generatedPath: path.join(generatedDir, 'mstile-150x150.png'),
				});

				imgOptions.forEach((img) => {
					faviconsPromises.push(
						new Promise((resolve, reject) => {
							im.convert(
								['-background', 'transparent', '-gravity', 'center', faviconPath]
									.concat(img.options)
									.concat(img.generatedPath),
								(err) => {
									if (err) {
										error(img.generatedPath, 'FAVICONS', err.message, 'ERROR');
										return reject();
									}
									resolve();
								},
							);
						}),
					);
				});

				// safari-pinned-tab.svg
				faviconsPromises.push(
					new Promise(async (resolve, reject) => {
						if (!faviconPath.endsWith('.svg')) {
							error(
								faviconPath,
								'FAVICONS',
								'Safari pinned tab SVG generation requires SVG file',
								'WARNING',
							);
							return resolve();
						}

						const svgContent: string | undefined = await fs.promises
							.readFile(faviconPath, 'utf-8')
							.then((result) => result)
							.catch((err) => {
								error(faviconPath, 'FAVICONS', err.message, 'ERROR');
								reject();
								return undefined;
							});
						if (svgContent == undefined) return;

						if (!svgContent) {
							error(faviconPath, 'FAVICONS', 'Favicon file is empty', 'ERROR');
							return reject();
						}

						let optimizedSvg: SvgoOutput | undefined = undefined;
						try {
							optimizedSvg = optimize(svgContent, {
								path: faviconPath,
								multipass: true,
								plugins: ['preset-default', svgo_plugin_findSize, svgo_plugin_toBlack],
							});
							if (optimizedSvg === undefined) throw new Error('Svg optimization failed');
						} catch (err) {
							error(faviconPath, 'FAVICONS', err as string, 'ERROR');
							return reject();
						}

						if (
							!(await fs.promises
								.writeFile(path.join(generatedDir, 'safari-pinned-tab.svg'), optimizedSvg.data)
								.then(() => true)
								.catch((err) => {
									error(
										path.join(generatedDir, 'safari-pinned-tab.svg'),
										'FAVICONS',
										err.message,
										'ERROR',
									);
									reject();
									return false;
								}))
						)
							return;

						resolve();
					}),
				);

				// site.webmanifest
				faviconsPromises.push(
					new Promise(async (resolve, reject) => {
						if (
							!(await fs.promises
								.writeFile(
									path.join(generatedDir, 'site.webmanifest'),
									`{
	"name": "${siteTitle}",
	"short_name": "",
	"icons": [
		{
			"src": "/__favicons/android-chrome-192x192.png",
			"sizes": "192x192",
			"type": "image/png"
		},
		{
			"src": "/__favicons/android-chrome-512x512.png",
			"sizes": "512x512",
			"type": "image/png"
		}
	],
	"theme_color": "${themeColor}",
	"background_color": "${themeBackground}",
	"display": "standalone"
}`,
								)
								.then(() => true)
								.catch((err) => {
									error(
										path.join(generatedDir, 'site.webmanifest'),
										'FAVICONS',
										err.message,
										'ERROR',
									);
									reject();
									return false;
								}))
						)
							return;
						resolve();
					}),
				);

				// browserconfig.xml
				faviconsPromises.push(
					new Promise(async (resolve, reject) => {
						if (
							!(await fs.promises
								.writeFile(
									path.join(generatedDir, 'browserconfig.xml'),
									`<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
	<msapplication>
		<tile>
			<square150x150logo src="/__favicons/mstile-150x150.png"/>
			<TileColor>${themeBackground}</TileColor>
		</tile>
	</msapplication>
</browserconfig>`,
								)
								.then(() => true)
								.catch((err) => {
									error(
										path.join(generatedDir, 'browserconfig.xml'),
										'FAVICONS',
										err.message,
										'ERROR',
									);
									reject();
									return false;
								}))
						)
							return;
						resolve();
					}),
				);

				Promise.allSettled(faviconsPromises).then((results) => {
					let hasFail = false;
					results.forEach((result) => {
						if (result.status == 'rejected') hasFail = true;
					});
					if (hasFail) reject();
					else resolve();
				});
			})
			.catch((err) => {
				error(undefined, 'FAVICONS', err, 'ERROR');
				reject();
			});
	});
}
