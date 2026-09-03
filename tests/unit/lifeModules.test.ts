import test from 'node:test';
import assert from 'node:assert/strict';
import { lifeModules } from '../../src/data/lifeModules.ts';
import { LIFE_KEYS, localDateKey, readStored, writeStored } from '../../src/utils/lifeStore.ts';

test('私人生活模块只保留管理端真实存在的视图', () => {
  assert.equal(lifeModules.length, 11);
  assert.equal(new Set(lifeModules.map((item) => item.id)).size, 11);
  assert.ok(!lifeModules.some((item) => ['insights', 'reading', 'calendar', 'planning'].includes(item.id)));
});

test('生活数据键彼此隔离并保留现有任务与阅读键', () => {
  assert.equal(LIFE_KEYS.plans, 'yuncun-local-plans-v1');
  assert.equal(LIFE_KEYS.reading, 'yuncun-reading-list-v1');
  assert.equal(new Set(Object.values(LIFE_KEYS)).size, Object.values(LIFE_KEYS).length);
});

test('随手收集使用管理端统一名称', () => {
  const inbox = lifeModules.find((item) => item.id === 'inbox');
  assert.equal(inbox?.title, '随手收集');
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
