import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const notes = (await getCollection('notes', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
  const works = await getCollection('works', ({ data }) => !data.draft);
  const items = [
    ...notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.publishedAt,
      link: `/notes/${note.data.slug}/`,
      categories: note.data.tags,
    })),
    ...works.map((work) => ({
      title: `浮光廊｜${work.data.title}`,
      description: work.data.summary,
      pubDate: work.data.publishedAt,
      link: `/world/lantern-lane/${work.data.slug}/`,
      categories: [work.data.category, ...work.data.tags],
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: '雲梦世界',
    description: '雲梦世界中的学习笔记、开源实践与浮光廊作品。',
    site: context.site,
    items,
  });
}
