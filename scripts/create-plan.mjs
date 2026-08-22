import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [slug, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(' ').trim();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

if (!slug || !slugPattern.test(slug)) {
  console.error('用法：pnpm plan:new -- <slug> "<标题>"；slug 只能包含小写字母、数字和短横线。');
  process.exit(1);
}
if (!title) {
  console.error('计划标题不能为空。');
  process.exit(1);
}

const directory = resolve('src/content/plans');
const target = resolve(directory, `${slug}.mdx`);
if (existsSync(target)) {
  console.error(`计划文件已存在：src/content/plans/${slug}.mdx`);
  process.exit(1);
}

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const template = `---
title: ${title}
slug: ${slug}
summary: 请用一句话说明这项计划要抵达哪里。
area: 站点建设
status: 构想中
priority: 中
updatedAt: ${today}
featured: false
tags: []
milestones: []
nextActions: []
---

## 最新记录

写下关键变化、判断与下一步。
`;

await mkdir(directory, { recursive: true });
await writeFile(target, template, { encoding: 'utf8', flag: 'wx' });
console.log(`已创建 src/content/plans/${slug}.mdx`);
