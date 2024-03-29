import path from 'path';

import { EConf, ESourceType, ISources } from '../interfaces/interfaces';
import { error } from '../log';
import { writeFile } from './compile';
import { getGeneratedPath, getWebPath } from './paths';
import { IBlog, IPost } from '../interfaces/blog';
import { IPodcast, IEpisode } from '../interfaces/podcast';
import { conf } from '../config';

function escapeSymbols(str: string): string {
	// Escape list from https://podcasters.apple.com/support/823-podcast-requirements
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/'/g, '&apos;')
		.replace(/"/g, '&quot;')
		.replace(/©/g, '&#xA9;')
		.replace(/℗/g, '&#x2117;')
		.replace(/™/g, '&#x2122;');
}

async function createBlogFeed(blog: IBlog): Promise<{ blog: IBlog; posts: Map<Date, string> }> {
	let postsFeed = '';
	const feedPath = getGeneratedPath(path.join(blog.path, 'rss.xml'), ESourceType.Other);
	const blogUrl = getWebPath(blog.path, ESourceType.Page);
	// Store XML posts elements (for global feed)
	// With a map, so we can sort by date
	const postsElems: Map<Date, string> = new Map();

	// Sort by date
	const posts: Array<IPost> = blog.posts.sort((a, b) => {
		return a.date.object < b.date.object ? 1 : -1;
	});

	posts.forEach((post) => {
		let enclosureUrl = '';
		if (post.enclosure.webPath != '') enclosureUrl = `\${"hot": "domain"}${post.enclosure.webPath}`;
		let postElem = `<item>
			<title>${escapeSymbols(post.title)}</title>
			<link>\${"hot": "domain"}${post.webPath}</link>
			<guid>\${"hot": "domain"}${post.webPath}</guid>
			<description>${escapeSymbols(post.description)}</description>
			<author>${post.author.email} (${post.author.name})</author>
			<pubDate>${post.date.object.toUTCString()}</pubDate>
			<content:encoded><![CDATA[${post.html}]]></content:encoded>`;
		if (post.enclosure.webPath != '')
			postElem += `<enclosure url="${enclosureUrl}" length="${post.enclosure.length}" type="${post.enclosure.type}"/>`;
		postElem += `</item>`;

		postsElems.set(post.date.object, postElem);
		postsFeed += postElem;
	});

	const feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
	<atom:link href="\${"hot": "domain"}${blogUrl}/rss.xml" rel="self" type="application/rss+xml" />
	<title>${escapeSymbols(blog.name)}</title>
	<description>${escapeSymbols(blog.description)}</description>
	<link>\${"hot": "domain"}${blogUrl}</link>
	<category>${escapeSymbols(blog.category)}</category>
	<language>${blog.language}</language>
	${postsFeed}
</channel>
</rss>`;

	if (
		!(await writeFile(feedPath, feed)
			.then(() => true)
			.catch((err) => {
				error(feedPath, 'FEEDS', err, 'ERROR');
				return false;
			}))
	)
		return Promise.reject();

	return {
		blog,
		posts: postsElems,
	};
}

async function createBlogsFeed(blogs: Map<string, IBlog>): Promise<void> {
	const feedPath = getGeneratedPath('blogs.xml', ESourceType.Other);
	const promisesList: Array<Promise<{ blog: IBlog; posts: Map<Date, string> }>> = [];
	const postsElems: Map<Date, string> = new Map();

	blogs.forEach((blog) => {
		// Create feed only if feed is true for the blog
		if (blog.feed) promisesList.push(createBlogFeed(blog));
	});

	await Promise.allSettled(promisesList).then((results) => {
		let hasFail = false;
		results.forEach((result) => {
			if (result.status == 'fulfilled') {
				// Add posts to global feed only if global_feed is true for the blog
				if (result.value.blog.global_feed) {
					result.value.posts.forEach((postElem, date) => {
						postsElems.set(date, postElem);
					});
				}
			} else hasFail = true;
		});
		if (hasFail) return Promise.reject();
	});

	// Create an array of date sorted posts
	const postsElemsSorted = [...postsElems.entries()].sort((a, b) => {
		return a[0] < b[0] ? 1 : -1;
	});

	const feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
	<atom:link href="\${"hot": "domain"}/blogs.xml" rel="self" type="application/rss+xml" />
	<title>${escapeSymbols(conf('content.title', 'string', EConf.Required))}</title>
	<description>${escapeSymbols(conf('content.description', 'string', EConf.Required))}</description>
	<link>\${"hot": "domain"}</link>
	<language>${conf('content.language', 'string', EConf.Required)}</language>
	${postsElemsSorted.map((postElem) => postElem[1]).join('\n')}
</channel>
</rss>`;

	// Write to file
	if (
		!(await writeFile(feedPath, feed)
			.then(() => true)
			.catch((err) => {
				error(feedPath, 'FEEDS', err, 'ERROR');
				return false;
			}))
	)
		return Promise.reject();
}

async function createPodcastFeed(podcast: IPodcast): Promise<void> {
	let episodesFeed = '';
	const feedPath = getGeneratedPath(path.join(podcast.path, 'rss.xml'), ESourceType.Other);
	const webFeedPath = getWebPath(path.join(podcast.path, 'rss.xml'), ESourceType.Other);
	const podcastUrl = getWebPath(podcast.path, ESourceType.Page);

	// Sort by date
	const episodes: Array<IEpisode> = podcast.episodes.sort((a, b) => {
		return a.date.object < b.date.object ? 1 : -1;
	});

	episodes.forEach((episode) => {
		let enclosureUrl = '';
		let audioUrl = '';

		if (episode.enclosure.webPath != '') enclosureUrl = `\${"hot": "domain"}${episode.enclosure.webPath}`;
		if (episode.audio.webPath != '') audioUrl = `\${"hot": "domain"}${episode.audio.webPath}`;

		episodesFeed += `<item>
			<title>${episode.title}</title>
			<link>\${"hot": "domain"}${episode.webPath}</link>
			<guid>${episode.webPath}</guid>
			<description><![CDATA[${episode.description}]]></description>
			<author>${episode.author.email} (${episode.author.name})</author>
			<enclosure url="${audioUrl}" length="${episode.audio.length}" type="${episode.audio.mime}"/>
			<pubDate>${episode.date.object.toUTCString()}</pubDate>
			<itunes:duration>${episode.audio.duration}</itunes:duration>
			<itunes:image href="${enclosureUrl}" />
		</item>
		`;
	});

	let enclosureUrl = '';
	if (podcast.enclosure.webPath != '') enclosureUrl = `\${"hot": "domain"}${podcast.enclosure.webPath}`;

	const feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:googleplay="http://www.google.com/schemas/play-podcasts/1.0"
	xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
	xmlns:media="http://www.itunes.com/dtds/podcast-1.0.dtd"
	xmlns:spotify="http://www.spotify.com/ns/rss"
	xmlns:dcterms="https://purl.org/dc/terms"
	xmlns:psc="https://podlove.org/simple-chapters/"
>
	<channel>
		<atom:link href="\${"hot": "domain"}${webFeedPath}" rel="self" type="application/rss+xml" />
		<title>${podcast.name}</title>
		<link>\${"hot": "domain"}${podcastUrl}</link>
		<description>${podcast.description}</description>
		<image>
			<link>\${"hot": "domain"}${podcastUrl}</link>
			<title>${podcast.name}</title>
			<url>${enclosureUrl}</url>
		</image>
		<language>${podcast.language}</language>

		<googleplay:author>${podcast.author.name}</googleplay:author>
		<googleplay:image href="${enclosureUrl}"/>
		<googleplay:category text="${podcast.category}"/>
		<googleplay:explicit>"${podcast.explicit}</googleplay:explicit>

		<itunes:owner>
			<itunes:name>${podcast.author.name}</itunes:name>
			<itunes:email>${podcast.author.email}</itunes:email>
		</itunes:owner>
		<itunes:author>${podcast.author.name}</itunes:author>
		<itunes:image href="${enclosureUrl}"/>
		<itunes:category text="${podcast.category}"/>
		<itunes:complete>${podcast.complete}</itunes:complete>
		<itunes:explicit>${podcast.explicit}</itunes:explicit>
		<itunes:type>${podcast.type}</itunes:type>

		<spotify:limit>${podcast.limit}</spotify:limit>
		<spotify:countryOfOrigin>${podcast.country}</spotify:countryOfOrigin>
		${episodesFeed}
	</channel>
</rss>`;

	if (
		!(await writeFile(feedPath, feed)
			.then(() => true)
			.catch((err) => {
				error(feedPath, 'FEEDS', err, 'ERROR');
				return false;
			}))
	)
		return Promise.reject();
}

export function createFeeds(sources: ISources): Promise<void> {
	return new Promise((resolve, reject) => {
		const promisesList: Array<Promise<void>> = [];

		if (sources.blogs.size > 0) promisesList.push(createBlogsFeed(sources.blogs));

		sources.podcasts.forEach((podcast) => {
			// Create feed only if feed is true for the podcast
			if (podcast.feed) promisesList.push(createPodcastFeed(podcast));
		});

		Promise.allSettled(promisesList).then((results) => {
			let hasFail = false;
			results.forEach((result) => {
				if (result.status == 'rejected') hasFail = true;
			});
			if (hasFail) reject();
			else resolve();
		});
	});
}
