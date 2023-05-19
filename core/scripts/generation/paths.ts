import path from 'path';

import { conf } from '../config';
import { BUILTIN_THEMES_ROOT, CUSTOM_THEMES_ROOT, GENERATED_ROOT, SOURCE_ROOT } from '../const';
import { EConf, ESourceType } from '../interfaces';

export function getGeneratedPath(sourcePath: string, sourceType: ESourceType): string {
	let generatedPath: string;

	// Remove everything before the first source/
	generatedPath = path.join(
		GENERATED_ROOT,
		'content',
		sourcePath.split('source/').slice(1, sourcePath.length).join('source/'),
	);
	// Replace extension with .html
	if (sourceType != ESourceType.Other) generatedPath = `${generatedPath.split('.').slice(0, -1).join('.')}.html`;
	return generatedPath;
}

export function getWebPath(sourcePath: string, sourceType: ESourceType): string {
	let webPath: string;

	// Remove everything before the first source/
	webPath = `/${sourcePath.split('source/').slice(1, sourcePath.length).join('source/')}`;
	// Remove extension
	if (sourceType != ESourceType.Other) if (webPath.includes('.')) webPath = webPath.split('.').slice(0, -1).join('.');
	// Remove index, post and episode at the end
	if (sourceType == ESourceType.Page)
		if (webPath.endsWith('/index')) webPath = webPath.split('/').slice(0, -1).join('/');
	if (sourceType == ESourceType.Post)
		if (webPath.endsWith('/post')) webPath = webPath.split('/').slice(0, -1).join('/');
	if (sourceType == ESourceType.Episode)
		if (webPath.endsWith('/episode')) webPath = webPath.split('/').slice(0, -1).join('/');

	return webPath;
}

export function getThemePath(): string {
	const builtInThemes = ['clean'];
	let themeName: string | null = 'clean';
	let themePath: string = path.join(BUILTIN_THEMES_ROOT, themeName);

	themeName = conf('content.theme', 'string', EConf.Optional);
	if (themeName && themeName != '' && !builtInThemes.includes(themeName))
		themePath = path.join(CUSTOM_THEMES_ROOT, themeName);

	return themePath;
}

export function getHeaderPath(): string | null {
	if (!conf('content.header', 'string', EConf.Optional)) return null;
	return path.join(SOURCE_ROOT, conf('content.header', 'string', EConf.Required));
}

export function getFooterPath(): string | null {
	if (!conf('content.footer', 'string', EConf.Optional)) return null;
	return path.join(SOURCE_ROOT, conf('content.footer', 'string', EConf.Required));
}
