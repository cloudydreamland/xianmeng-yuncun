import type { CollectionEntry } from 'astro:content';

export type PytorchChapter = CollectionEntry<'pytorchTutorial'>;

export function sortPytorchChapters(chapters: PytorchChapter[]) {
  return [...chapters].sort((left, right) => left.data.order - right.data.order);
}

export function lessonHeadings(headings: Array<{ depth: number; slug: string; text: string }>) {
  return headings.filter((heading) => heading.depth === 2);
}
