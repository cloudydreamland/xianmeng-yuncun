import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('离线导航回退到独立离线页且运行时缓存有上限', () => {
  const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');

  assert.match(source, /caches\.match\('\/offline\.html'\)/);
  assert.doesNotMatch(source, /cached \|\| caches\.match\('\/workspace\/'\)/);
  assert.match(source, /MAX_RUNTIME_ENTRIES = 80/);
  assert.match(source, /request\.headers\.has\('range'\)/);
  assert.doesNotMatch(source.match(/const APP_SHELL = \[[^;]+/)?.[0] || '', /workspace/);
  assert.match(source, /url\.pathname\.startsWith\('\/private-migration\/'\)/);
  assert.match(source, /url\.pathname\.startsWith\('\/api\/'\)/);
});
