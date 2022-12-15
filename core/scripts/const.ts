import path from 'path';

const ROOT = path.resolve('dist');
const CONFIG = path.resolve(ROOT, 'cestici', 'config.yml');
const SOURCE_ROOT = path.resolve(ROOT, 'cestici', 'source');
const GENERATED_ROOT = path.resolve(ROOT, 'cestici', 'generated');
const CUSTOM_THEMES_ROOT = path.resolve(ROOT, 'cestici', 'custom', 'themes');
const BUILTIN_THEMES_ROOT = path.resolve(ROOT, 'core', 'built-in', 'themes');
const CUSTOM_SHORTCODES_ROOT = path.resolve(ROOT, 'cestici', 'custom', 'shortcodes');
const BUILTIN_SHORTCODES_ROOT = path.resolve(ROOT, 'core', 'built-in', 'shortcodes');
const CUSTOM_HOTCODES_ROOT = path.resolve(ROOT, 'cestici', 'custom', 'hotcodes');
const BUILTIN_HOTCODES_ROOT = path.resolve(ROOT, 'core', 'built-in', 'hotcodes');

export {
	ROOT,
	CONFIG,
	SOURCE_ROOT,
	GENERATED_ROOT,
	BUILTIN_THEMES_ROOT,
	CUSTOM_THEMES_ROOT,
	CUSTOM_SHORTCODES_ROOT,
	BUILTIN_SHORTCODES_ROOT,
	CUSTOM_HOTCODES_ROOT,
	BUILTIN_HOTCODES_ROOT,
};
