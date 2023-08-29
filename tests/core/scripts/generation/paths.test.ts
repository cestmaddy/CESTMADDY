import { expect } from 'chai';
import path from 'path';
// import mock_fs from 'mock-fs';
import { fs, vol } from 'memfs';

// Create a fake config file for tests
import { CONFIG } from '../../../../core/scripts/const';
fs.mkdirSync(path.dirname(CONFIG));
fs.writeFileSync(CONFIG, 'hey');
import { set_conf } from '../../../../core/scripts/config'; // will use the fake config file
vol.reset();
// End create a fake config file for tests

import {
	getFooterPath,
	getGeneratedPath,
	getHeaderPath,
	getThemePath,
	getWebPath,
} from '../../../../core/scripts/generation/paths';
import { ESourceType } from '../../../../core/scripts/interfaces/interfaces';
import { GENERATED_ROOT, SOURCE_ROOT, BUILTIN_THEMES_ROOT, CUSTOM_THEMES_ROOT } from '../../../../core/scripts/const';

describe('core/scripts/generation/paths.ts', () => {
	describe('getGeneratedPath', () => {
		it('should generate paths', () => {
			const base_path = path.join(GENERATED_ROOT, 'content');

			// Normal page
			expect(getGeneratedPath(path.join(SOURCE_ROOT, 'index.md'), ESourceType.Page)).to.equal(
				path.join(base_path, 'index.html'),
			);

			// Normal page in a 'source' subdirectory
			expect(getGeneratedPath(path.join(SOURCE_ROOT, 'source', 'index.markdown'), ESourceType.Page)).to.equal(
				path.join(base_path, 'source', 'index.html'),
			);

			// Normal image in a 'source' subdirectory in a 'source' subdirectory, as a page
			expect(
				getGeneratedPath(path.join(SOURCE_ROOT, 'source', 'source', 'index.png'), ESourceType.Page),
			).to.equal(path.join(base_path, 'source', 'source', 'index.html'));

			// Normal post in a 'blog/first_post' subdirectory
			expect(
				getGeneratedPath(path.join(SOURCE_ROOT, 'blog', 'first_post', 'post.md'), ESourceType.Post),
			).to.equal(path.join(base_path, 'blog', 'first_post', 'post.html'));

			// Normal podcast in a SOURCE_ROOT subdirectory
			expect(getGeneratedPath(path.join(SOURCE_ROOT, SOURCE_ROOT, 'episode.md'), ESourceType.Episode)).to.equal(
				path.join(base_path, SOURCE_ROOT, 'episode.html'),
			);

			// Normal non-markdown file
			expect(getGeneratedPath(path.join(SOURCE_ROOT, 'imgs', 'image.webp'), ESourceType.Other)).to.equal(
				path.join(base_path, 'imgs', 'image.webp'),
			);
		});
	});

	describe('getWebPath', () => {
		it('should generate paths', () => {
			// Normal page
			expect(getWebPath(path.join(SOURCE_ROOT, 'index.html'), ESourceType.Page)).to.equal('/');

			// Normal page in a 'test' subdirectory
			expect(getWebPath(path.join(SOURCE_ROOT, 'test', 'index.html'), ESourceType.Page)).to.equal(
				'/' + path.join('test'),
			);

			// Normal directory as a page
			expect(getWebPath(path.join(SOURCE_ROOT, 'test'), ESourceType.Page)).to.equal('/' + path.join('test'));

			// Normal page in a 'source' subdirectory
			expect(getWebPath(path.join(SOURCE_ROOT, 'source', 'index.html'), ESourceType.Page)).to.equal(
				'/' + path.join('source'),
			);

			// Normal image in a 'source' subdirectory in a 'source' subdirectory, as a page
			expect(getWebPath(path.join(SOURCE_ROOT, 'source', 'source', 'image.png'), ESourceType.Page)).to.equal(
				'/' + path.join('source', 'source', 'image'),
			);

			// Post in a 'blog' subdirectory
			expect(getWebPath(path.join(SOURCE_ROOT, 'blog', 'first_post.md'), ESourceType.Post)).to.equal(
				'/' + path.join('blog', 'first_post'),
			);

			// Post in a 'blog/first_post' subdirectory
			expect(getWebPath(path.join(SOURCE_ROOT, 'blog', 'first_post', 'post.md'), ESourceType.Post)).to.equal(
				'/' + path.join('blog', 'first_post'),
			);

			// Episode in a 'podcast' subdirectory
			expect(getWebPath(path.join(SOURCE_ROOT, 'podcast', 'first.md'), ESourceType.Episode)).to.equal(
				'/' + path.join('podcast', 'first'),
			);

			// Episode in a 'podcast/first' subdirectory
			expect(getWebPath(path.join(SOURCE_ROOT, 'podcast', 'first', 'episode.md'), ESourceType.Episode)).to.equal(
				'/' + path.join('podcast', 'first'),
			);

			// Image
			expect(getWebPath(path.join(SOURCE_ROOT, 'imgs', 'image.webp'), ESourceType.Other)).to.equal(
				'/' + path.join('imgs', 'image.webp'),
			);
		});
	});

	describe('getThemePath', () => {
		it('should generate paths', () => {
			set_conf({});
			expect(getThemePath()).to.equal(path.join(BUILTIN_THEMES_ROOT, 'clean'));

			set_conf({ content: { theme: 'clean' } });
			expect(getThemePath()).to.equal(path.join(BUILTIN_THEMES_ROOT, 'clean'));

			set_conf({ content: { theme: 'test' } });
			expect(getThemePath()).to.equal(path.join(CUSTOM_THEMES_ROOT, 'test'));
		});
	});

	describe('getHeaderPath', () => {
		it('should generate paths', () => {
			set_conf({});
			expect(getHeaderPath()).to.equal(null);

			set_conf({ content: { header: 'file.md' } });
			expect(getHeaderPath()).to.equal(path.join(SOURCE_ROOT, 'file.md'));
		});
	});

	describe('getFooterPath', () => {
		it('should generate paths', () => {
			set_conf({});
			expect(getFooterPath()).to.equal(null);

			set_conf({ content: { footer: 'file.md' } });
			expect(getFooterPath()).to.equal(path.join(SOURCE_ROOT, 'file.md'));
		});
	});
});
