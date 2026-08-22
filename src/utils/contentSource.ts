import { existsSync, readFileSync } from 'node:fs';

export function readContentSource(collection: string, id: string): string {
  const candidates = [
    new URL(`../content/${collection}/${id}.mdx`, import.meta.url),
    new URL(`../content/${collection}/${id}.md`, import.meta.url),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  return file ? readFileSync(file, 'utf8') : '';
}
