import path from 'path';

const DIST = path.resolve(__dirname, '..', '..');
let ROOT = DIST;
let CONFIG: string;
let SOURCE_ROOT: string;
let GENERATED_ROOT: string;
let CUSTOM_THEMES_ROOT: string;
const BUILTIN_THEMES_ROOT = path.resolve(DIST, 'core', 'built-in', 'themes');
let CUSTOM_SHORTCODES_ROOT: string;
const BUILTIN_SHORTCODES_ROOT = path.resolve(DIST, 'core', 'built-in', 'shortcodes');
let CUSTOM_HOTCODES_ROOT: string;
const BUILTIN_HOTCODES_ROOT = path.resolve(DIST, 'core', 'built-in', 'hotcodes');

setRoot(ROOT);

function setRoot(newRoot: string) {
	ROOT = newRoot;
	CONFIG = path.resolve(ROOT, 'cestici', 'config.yml');
	SOURCE_ROOT = path.resolve(ROOT, 'cestici', 'source');
	GENERATED_ROOT = path.resolve(ROOT, 'cestici', 'generated');
	CUSTOM_THEMES_ROOT = path.resolve(ROOT, 'cestici', 'custom', 'themes');
	CUSTOM_SHORTCODES_ROOT = path.resolve(ROOT, 'cestici', 'custom', 'shortcodes');
	CUSTOM_HOTCODES_ROOT = path.resolve(ROOT, 'cestici', 'custom', 'hotcodes');
}

function setGeneratedRoot(newRoot: string) {
	GENERATED_ROOT = newRoot;
}

function setCustomShortcodesRoot(newRoot: string) {
	CUSTOM_SHORTCODES_ROOT = newRoot;
}

function setCustomHotcodesRoot(newRoot: string) {
	CUSTOM_HOTCODES_ROOT = newRoot;
}

export {
	ROOT,
	DIST,
	CONFIG,
	SOURCE_ROOT,
	GENERATED_ROOT,
	BUILTIN_THEMES_ROOT,
	CUSTOM_THEMES_ROOT,
	CUSTOM_SHORTCODES_ROOT,
	BUILTIN_SHORTCODES_ROOT,
	CUSTOM_HOTCODES_ROOT,
	BUILTIN_HOTCODES_ROOT,
	setRoot,
	setGeneratedRoot,
	setCustomShortcodesRoot,
	setCustomHotcodesRoot,
};
