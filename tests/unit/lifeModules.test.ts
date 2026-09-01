import test from 'node:test';
import assert from 'node:assert/strict';
import { lifeModules } from '../../src/data/lifeModules.ts';
import { LIFE_KEYS, localDateKey, readStored, writeStored } from '../../src/utils/lifeStore.ts';

test('生活模块映射到承担日常工具的六境且入口唯一', () => {
  assert.equal(lifeModules.length, 9);
  assert.equal(new Set(lifeModules.map((item) => item.id)).size, 9);
  assert.equal(new Set(lifeModules.map((item) => item.realm)).size, 6);
  assert.ok(lifeModules.every((item) => item.realm !== 'rain-bridge'));
  assert.ok(lifeModules.every((item) => item.href.startsWith(`/world/${item.realm}/#`)));
});

test('生活数据键彼此隔离并保留现有任务与阅读键', () => {
  assert.equal(LIFE_KEYS.plans, 'yuncun-local-plans-v1');
  assert.equal(LIFE_KEYS.reading, 'yuncun-reading-list-v1');
  assert.equal(new Set(Object.values(LIFE_KEYS)).size, Object.values(LIFE_KEYS).length);
});

test('随手收集归入月潭并保留统一收集箱', () => {
  const inbox = lifeModules.find((item) => item.id === 'inbox');
  assert.equal(inbox?.realm, 'moon-pool');
  assert.equal(inbox?.href, '/world/moon-pool/#inbox');
});

test('生活存储工具能安全读写并处理损坏数据', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  writeStored(storage, 'sample', [{ title: '散步' }]);
  assert.deepEqual(readStored(storage, 'sample', []), [{ title: '散步' }]);
  values.set('broken', '{');
  assert.deepEqual(readStored(storage, 'broken', []), []);
  assert.equal(localDateKey(new Date('2026-08-22T12:00:00+08:00')), '2026-08-22');
});
