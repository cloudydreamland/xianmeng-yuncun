import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const directory = resolve('src/content/pytorch-tutorial');
const expectedCounts = [3, 6, 7, 6, 7, 6, 8, 6, 6, 6, 6, 7];
const requiredSections = ['本节目标', '清晰讲解', '代码示例', '运行结果与观察', '常见错误', '与大模型方向的连接', '动手练习', '官方资料'];

test('PyTorch 教程包含十二章和恰好 74 节公开课程', () => {
  const files = readdirSync(directory).filter((file) => file.endsWith('.mdx')).sort();
  assert.equal(files.length, 12);
  let total = 0;
  const orders = new Set<number>();
  files.forEach((file, index) => {
    const source = readFileSync(resolve(directory, file), 'utf8');
    const order = Number(source.match(/\norder: (\d+)\n/)?.[1]);
    const lessons = [...source.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    orders.add(order);
    total += lessons.length;
    assert.equal(lessons.length, expectedCounts[index], `${file} 课数不符合规划`);
    assert.equal(new Set(lessons).size, lessons.length, `${file} 存在重复课程`);
    assert.match(source, /\ndraft: false\n/);
  });
  assert.equal(total, 74);
  assert.deepEqual([...orders].sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1));
});

test('每节课都有教学结构、运行边界、练习答案和对应资料', () => {
  for (const file of readdirSync(directory).filter((item) => item.endsWith('.mdx'))) {
    const source = readFileSync(resolve(directory, file), 'utf8');
    const lessons = source.split(/\n(?=## )/).slice(1);
    for (const lesson of lessons) {
      requiredSections.forEach((section) => assert.ok(lesson.includes(`### ${section}`), `${file} 缺少 ${section}`));
      assert.match(lesson, /```python[\s\S]+?```/, `${file} 缺少 Python 示例`);
      assert.match(lesson, /className="lesson-runtime"/, `${file} 缺少代码运行条件`);
      assert.match(lesson, /className="lesson-answer"/, `${file} 缺少练习答案`);
      assert.match(lesson, /https:\/\/(docs\.pytorch\.org|huggingface\.co|numpy\.org|docs\.python\.org)\//, `${file} 缺少对应官方资料`);
    }
  }
});

test('三个贯穿项目与真实代码验证报告可下载', () => {
  const projects = ['classifier-project.zip', 'decoder-block-project.zip', 'mini-lm-project.zip', 'all-projects.zip'];
  projects.forEach((file) => assert.ok(existsSync(resolve('public/downloads/pytorch-course', file)), `${file} 不存在`));
  const report = JSON.parse(readFileSync(resolve('public/downloads/pytorch-course/verification-report.json'), 'utf8'));
  assert.deepEqual(report.summary, {
    lessons: 74,
    syntaxChecked: 74,
    cpuExecuted: 39,
    hardwareOrContextRequired: 35,
    failed: 0,
    projectsPassed: 3,
  });
});
