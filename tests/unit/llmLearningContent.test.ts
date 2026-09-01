import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const directory = resolve('src/content/llm-learning');

test('大模型系统笔记包含十二章和完整学习元数据', () => {
  const files = readdirSync(directory).filter((file) => file.endsWith('.mdx')).sort();
  assert.equal(files.length, 12);
  const orders = new Set<number>();
  let sections = 0;
  files.forEach((file) => {
    const source = readFileSync(resolve(directory, file), 'utf8');
    orders.add(Number(source.match(/\norder: (\d+)\n/)?.[1]));
    const headings = [...source.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    sections += headings.length;
    assert.ok(headings.length >= 4, `${file} 至少应有四节完整笔记`);
    assert.equal(new Set(headings).size, headings.length, `${file} 存在重复小节`);
    assert.match(source, /\noutcomes: \[.+\]\n/);
    assert.match(source, /\ninterviewHref: \/interview\/llm\/.+\n/);
    assert.match(source, /\ndraft: false\n/);
  });
  assert.ok(sections >= 48);
  assert.deepEqual([...orders].sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1));
});

test('系统笔记用解释性正文连接概念、工程与复习路径', () => {
  const files = readdirSync(directory).filter((file) => file.endsWith('.mdx'));
  const source = files.map((file) => readFileSync(resolve(directory, file), 'utf8')).join('\n');
  ['Token', 'Embedding', 'Transformer', '预训练', 'LoRA', 'KV Cache', 'RAG', 'Agent', '评测', '多模态'].forEach((topic) => assert.ok(source.includes(topic), `缺少主题：${topic}`));
  const bodyLength = files.reduce((sum, file) => sum + readFileSync(resolve(directory, file), 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').length, 0);
  assert.ok(bodyLength > 8000, '系统笔记正文过短');
});
