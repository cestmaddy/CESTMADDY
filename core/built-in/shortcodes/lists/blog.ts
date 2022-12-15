import { IPost, ISources } from '../../../scripts/interfaces';

export async function compile(settings: any, sources: ISources): Promise<string> {
	let HTMLlist = '';
	let posts: Array<IPost> = [];

	// Check "blog" setting
	if (!settings.hasOwnProperty('blog')) return Promise.reject('you have not specified any blog');

	// Check if blog exists
	const sourceBlog = sources.blogs.get(settings.blog);
	if (!sourceBlog) return Promise.reject(`can't find a blog named ${settings['blog']}`);

	// Sort by date
	posts = sourceBlog.posts.sort((a, b) => {
		return a.date.object < b.date.object ? 1 : -1;
	});

	// Apply limit
	if (settings.hasOwnProperty('limit') && typeof settings['limit'] == 'number')
		posts = posts.slice(0, settings['limit']);

	// Start generation
	HTMLlist = `<ul class="list_blog">`;
	posts.forEach((post) => {
		HTMLlist += `<li><a href="${post.webPath}">`;

		if (settings.hasOwnProperty('enclosure') && settings['enclosure'])
			if (post.enclosure.webPath != '') HTMLlist += `<img src="${post.enclosure.webPath}" />`;

		HTMLlist += `<div class="list_blog_content">
						<p class="list_blog_date">${post.author.name},
							<strong>${post.date.relativeString}</strong>,
							${post.date.localeString}
						</p>
						<p class="list_blog_title">${post.title}</p>
						<p class="list_blog_description">${post.description}</p>
					</div>
				</a>
			</li>`.replace(/[\n\r]/g, '');
	});
	HTMLlist += `</ul>`;
	return HTMLlist;
}
