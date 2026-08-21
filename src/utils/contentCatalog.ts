import type { CollectionEntry } from 'astro:content';

export type NoteEntry = CollectionEntry<'notes'>;
export type ProjectEntry = CollectionEntry<'projects'>;
export type WorkEntry = CollectionEntry<'works'>;

export function sortNotes(notes: NoteEntry[]): NoteEntry[] {
  return [...notes].sort((left, right) => right.data.publishedAt.valueOf() - left.data.publishedAt.valueOf());
}

export function sortProjects(projects: ProjectEntry[]): ProjectEntry[] {
  return [...projects].sort((left, right) => Number(right.data.featured) - Number(left.data.featured));
}

export function sortWorks(works: WorkEntry[]): WorkEntry[] {
  return [...works].sort((left, right) => (
    Number(right.data.featured) - Number(left.data.featured)
    || (right.data.createdAt ?? right.data.publishedAt).valueOf() - (left.data.createdAt ?? left.data.publishedAt).valueOf()
  ));
}

export function collectNoteFacets(notes: NoteEntry[]) {
  return {
    categories: [...new Set(notes.map(({ data }) => data.category))],
    tags: [...new Set(notes.flatMap(({ data }) => data.tags))],
  };
}
