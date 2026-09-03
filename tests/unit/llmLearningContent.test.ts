import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';
import { llmLearningGlossary } from '../../src/data/llmLearningGlossary.ts';
import { llmCurriculum } from '../../src/data/llmCurriculum.ts';

const directory = resolve('src/content/llm-learning');
const interviewDirectory = resolve('src/content/llm-interview');
const practiceDirectory = resolve('src/content/pytorch-tutorial');
const bodyOf = (source: string) => source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

test('大模型系统笔记包含十三章和完整学习元数据', () => {
  const files = readdirSync(directory).filter((file) => file.endsWith('.mdx')).sort();
  assert.equal(files.length, 13);
  const orders = new Set<number>();
  let sections = 0;
  files.forEach((file) => {
    const source = readFileSync(resolve(directory, file), 'utf8');
    orders.add(Number(source.match(/\norder: (\d+)\n/)?.[1]));
    const headings = [...source.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    sections += headings.length;
    assert.ok(headings.length >= 10, `${file} 至少应有十节完整笔记`);
    assert.equal(new Set(headings).size, headings.length, `${file} 存在重复小节`);
    assert.match(source, /\noutcomes: \[.+\]\n/);
    assert.match(source, /\ninterviewHref: \/interview\/llm\/.+\n/);
    assert.match(source, /\ndraft: false\n/);
  });
  assert.ok(sections >= 210);
  assert.deepEqual([...orders].sort((a, b) => a - b), Array.from({ length: 13 }, (_, index) => index + 1));
});

test('系统笔记用解释性正文连接概念、工程与复习路径', () => {
  const files = readdirSync(directory).filter((file) => file.endsWith('.mdx'));
  const source = files.map((file) => readFileSync(resolve(directory, file), 'utf8')).join('\n');
  ['Token', 'Embedding', 'Transformer', '预训练', 'LoRA', 'KV Cache', 'RAG', 'Agent', '评测', '多模态'].forEach((topic) => assert.ok(source.includes(topic), `缺少主题：${topic}`));
  const bodyLength = files.reduce((sum, file) => sum + readFileSync(resolve(directory, file), 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').length, 0);
  assert.ok(bodyLength > 42000, '系统笔记正文过短');
  ['## 本章路线图', '## 章末检查', '## 延伸资料'].forEach((section) => {
    files.forEach((file) => assert.ok(readFileSync(resolve(directory, file), 'utf8').includes(section), `${file} 缺少 ${section}`));
  });
  assert.equal(Object.keys(llmLearningGlossary).length, 13);
  Object.entries(llmLearningGlossary).forEach(([slug, terms]) => {
    assert.equal(terms.length, 6, `${slug} 应包含六个章末术语`);
    assert.equal(new Set(terms.map(({ term }) => term)).size, terms.length, `${slug} 术语重复`);
  });
});

test('完整课程正文超过原系统笔记五倍且三层材料没有重复编排', () => {
  const learningFiles = readdirSync(directory).filter((file) => file.endsWith('.mdx'));
  const interviewFiles = readdirSync(interviewDirectory).filter((file) => file.endsWith('.mdx'));
  const practiceFiles = readdirSync(practiceDirectory).filter((file) => file.endsWith('.mdx'));
  const contentLength = [
    ...learningFiles.map((file) => bodyOf(readFileSync(resolve(directory, file), 'utf8'))),
    ...interviewFiles.map((file) => bodyOf(readFileSync(resolve(interviewDirectory, file), 'utf8'))),
    ...practiceFiles.map((file) => bodyOf(readFileSync(resolve(practiceDirectory, file), 'utf8'))),
  ].join('').length;
  const preExpansionLearningLength = 43204;
  assert.ok(contentLength >= preExpansionLearningLength * 5, `完整课程正文仅为原来的 ${(contentLength / preExpansionLearningLength).toFixed(2)} 倍`);

  const slugsFrom = (files: string[], sourceDirectory: string) => files.map((file) => readFileSync(resolve(sourceDirectory, file), 'utf8').match(/\nslug: ([^\n]+)\n/)?.[1]);
  const learningSlugs = slugsFrom(learningFiles, directory);
  const interviewSlugs = slugsFrom(interviewFiles, interviewDirectory);
  const practiceSlugs = slugsFrom(practiceFiles, practiceDirectory);
  const mappedLearning = llmCurriculum.map(({ chapterSlug }) => chapterSlug);
  const mappedInterviews = llmCurriculum.flatMap(({ deepDiveSlugs }) => deepDiveSlugs);
  const mappedPractices = llmCurriculum.flatMap(({ practiceSlugs }) => practiceSlugs);

  assert.deepEqual([...mappedLearning].sort(), [...learningSlugs].sort(), '每章主教材都应出现在课程路线中');
  assert.deepEqual([...mappedInterviews].sort(), [...interviewSlugs].sort(), '每个原理专题应恰好编入一次');
  assert.deepEqual([...mappedPractices].sort(), [...practiceSlugs].sort(), '每个实践章节应恰好编入一次');
  assert.equal(new Set(mappedInterviews).size, mappedInterviews.length, '原理专题不可重复编排');
  assert.equal(new Set(mappedPractices).size, mappedPractices.length, '实践章节不可重复编排');
  llmCurriculum.forEach((module) => {
    assert.equal(module.studyOrder.length, 4);
    assert.ok(module.mastery.length >= 25, `${module.chapterSlug} 缺少可检验的掌握标准`);
  });
});
