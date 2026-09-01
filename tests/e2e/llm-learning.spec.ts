import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

test('学习中心清楚区分系统笔记、实践课和面试题库', async ({ page }) => {
  await page.goto('/learn/');
  await expect(page.getByRole('heading', { name: '从零学大模型', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /开始系统学习/ })).toHaveAttribute('href', '/learn/llm/');
  await expect(page.getByRole('link', { name: /进入实践课程/ })).toHaveAttribute('href', '/learn/pytorch/');
  await expect(page.getByRole('link', { name: /进入面试题库/ })).toHaveAttribute('href', '/interview/llm/');
});

test('雨桥展示三条学习路径，月潭接管随手收集', async ({ page }) => {
  await page.goto('/world/rain-bridge/');
  const learning = page.locator('#learning-paths');
  await expect(learning.getByRole('heading', { name: '从这里开始学习' })).toBeVisible();
  await expect(learning.getByRole('link', { name: /开始系统学习/ })).toHaveAttribute('href', '/learn/llm/');
  await expect(learning.getByRole('link', { name: /进入实践课程/ })).toHaveAttribute('href', '/learn/pytorch/');
  await expect(learning.getByRole('link', { name: /进入面试题库/ })).toHaveAttribute('href', '/interview/llm/');
  await expect(page.locator('#cloud-search')).toHaveCount(0);
  await expect(page.locator('#inbox')).toHaveCount(0);

  await page.goto('/world/moon-pool/#inbox');
  await expect(page.locator('[data-region-feature-tabs]')).toHaveAttribute('data-active-tab', 'inbox');
  await expect(page.getByRole('heading', { name: '临时记录' })).toBeVisible();
  await expect(page.getByRole('button', { name: '＋ 新增记录' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/world/rain-bridge/');
  const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
});

test('雨桥工作台读取学习进度并继续上次内容', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('xianmeng:llm-learning-progress:v1', JSON.stringify(['transformer#attention']));
    localStorage.setItem('xianmeng:llm-learning-last-read:v1', JSON.stringify({
      href: '/learn/llm/transformer/#attention',
      title: '自注意力如何工作',
      updatedAt: Date.now(),
    }));
  });
  await page.goto('/world/rain-bridge/');

  const resume = page.locator('[data-learning-resume]');
  const llm = resume.locator('[data-resume-track="llm"]');
  await expect(llm).toHaveAttribute('href', '/learn/llm/transformer/#attention');
  await expect(llm).toContainText('自注意力如何工作');
  await expect(llm).toContainText(/已完成 1 \/ \d+ 节/);
});

test('风谷分别索引原始文件、公开笔记与外部网站', async ({ page }) => {
  await page.goto('/world/wind-valley/');
  const library = page.locator('#resource-library');
  await expect(library.getByRole('heading', { name: '资料与笔记库' })).toBeVisible();
  await expect(library.getByRole('heading', { name: '原始文件' })).toBeVisible();
  await expect(library.getByRole('heading', { name: '笔记链接' })).toBeVisible();
  await expect(library.getByRole('heading', { name: '网站链接' })).toBeVisible();
  await expect(library.getByRole('link', { name: /C\+\+ 算法与数据结构笔记/ })).toHaveAttribute('href', '/documents/cldelve-algorithm-notes.pdf');
  await expect(library.getByRole('link', { name: /PyTorch 官方文档/ })).toHaveAttribute('target', '_blank');
  await expect(library.getByText('只在风谷保存一份')).toBeVisible();
});

test('大模型系统笔记展示十二章并联动对应面试题', async ({ page }) => {
  await page.goto('/learn/llm/');
  await expect(page.getByRole('heading', { name: '大模型从零学习笔记', level: 1 })).toBeVisible();
  await expect(page.locator('.llm-notes-map > div > a')).toHaveCount(12);
  await expect(page.getByRole('heading', { name: '每章包含五类学习内容' })).toBeVisible();
  await expect(page.locator('.llm-notes-home__hero dl')).toContainText('199');
  await page.getByRole('searchbox', { name: /搜索.*大模型学习笔记/ }).fill('KV Cache');
  const result = page.locator('[data-llm-learning-results] a').filter({ hasText: 'KV Cache' }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/learn\/llm\/inference\/#.+/);
  await expect(page.getByRole('link', { name: /对应面试题/ }).first()).toHaveAttribute('href', '/interview/llm/inference-and-serving/');
});

test('系统笔记支持本机进度且手机端目录不溢出', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/learn/llm/transformer/');
  await expect(page.getByRole('heading', { name: '六个关键词' })).toBeVisible();
  await expect(page.locator('.study-glossary dt')).toHaveCount(6);
  const directory = page.locator('.study-mobile-directory');
  await expect(directory).toBeVisible();
  await directory.locator('summary').click();
  await expect(directory.getByRole('link', { name: /推理与服务/ })).toBeVisible();
  const button = page.locator('.study-note-toggle').first();
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
});
