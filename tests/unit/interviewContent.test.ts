import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const directory = resolve('src/content/llm-interview');
const expectedCounts = [10, 9, 16, 10, 11, 10, 12, 14, 14, 14, 8, 8, 7, 7];
const requiredSections = ['30 秒口述版', '原理与推导', '公式、代码或工程案例', '高频追问', '易错点', '权威来源'];

test('大模型面经包含十四章和恰好 150 道公开题目', () => {
  const files = readdirSync(directory).filter((file) => file.endsWith('.mdx')).sort();
  assert.equal(files.length, 14);

  let total = 0;
  const orders = new Set<number>();
  files.forEach((file, index) => {
    const source = readFileSync(resolve(directory, file), 'utf8');
    const order = Number(source.match(/\norder: (\d+)\n/)?.[1]);
    const questions = [...source.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    orders.add(order);
    total += questions.length;
    assert.equal(questions.length, expectedCounts[index], `${file} 题数不符合规划`);
    assert.equal(new Set(questions).size, questions.length, `${file} 存在重复题目`);
    assert.match(source, /\ndraft: false\n/);
  });

  assert.equal(total, 150);
  assert.deepEqual([...orders].sort((a, b) => a - b), Array.from({ length: 14 }, (_, index) => index + 1));
});

test('每道题都包含六段回答结构和权威链接', () => {
  for (const file of readdirSync(directory).filter((item) => item.endsWith('.mdx'))) {
    const source = readFileSync(resolve(directory, file), 'utf8');
    const questions = source.split(/\n(?=## )/).slice(1);
    for (const question of questions) {
      requiredSections.forEach((section) => assert.ok(question.includes(`### ${section}`), `${file} 缺少 ${section}`));
      assert.match(question, /- \[[^\]]+\]\(https:\/\//, `${file} 缺少权威来源链接`);
    }
  }
});
