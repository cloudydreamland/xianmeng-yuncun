import type { CollectionEntry } from 'astro:content';

export type LlmLearningChapter = CollectionEntry<'llmLearning'>;

export function sortLlmLearningChapters(chapters: LlmLearningChapter[]) {
  return [...chapters].sort((left, right) => left.data.order - right.data.order);
}

export function noteHeadings(headings: Array<{ depth: number; slug: string; text: string }>) {
  return headings.filter((heading) => heading.depth === 2);
}
