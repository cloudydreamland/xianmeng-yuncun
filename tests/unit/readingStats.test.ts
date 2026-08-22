import assert from 'node:assert/strict';
import test from 'node:test';
import { readContentSource } from '../../src/utils/contentSource.ts';
import { getReadingStats } from '../../src/utils/readingStats.ts';

test('公开笔记从内容源计算出非零字数与阅读时间', () => {
  const source = readContentSource('notes', 'nlp-interview-study-index');
  const stats = getReadingStats(source);

  assert.ok(source.length > 0);
  assert.ok(stats.wordCount > 100);
  assert.ok(stats.readingMinutes >= 1);
});
