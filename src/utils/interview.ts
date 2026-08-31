import type { CollectionEntry } from 'astro:content';

export type InterviewChapter = CollectionEntry<'llmInterview'>;

export interface InterviewQuestion {
  chapterSlug: string;
  chapterTitle: string;
  chapterOrder: number;
  slug: string;
  title: string;
}

export function sortInterviewChapters(chapters: InterviewChapter[]) {
  return [...chapters].sort((left, right) => left.data.order - right.data.order);
}

export function questionHeadings(headings: Array<{ depth: number; slug: string; text: string }>) {
  return headings.filter((heading) => heading.depth === 2);
}
