import { existsSync, readFileSync } from 'node:fs';

export function readContentSource(collection: string, id: string): string {
  const basename = id.replace(/\.(?:md|mdx)$/i, '');
  const candidates = [
    new URL(`../content/${collection}/${basename}.mdx`, import.meta.url),
    new URL(`../content/${collection}/${basename}.md`, import.meta.url),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  return file ? readFileSync(file, 'utf8') : '';
}
