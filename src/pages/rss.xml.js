import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const notes = (await getCollection('notes', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

  return rss({
    title: '闲梦 · 云村',
    description: '一座藏在云海深处的个人村落，收留笔记、项目与未完的梦。',
    site: context.site,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.publishedAt,
      link: `/notes/${note.id}/`,
      categories: note.data.tags,
    })),
  });
}
