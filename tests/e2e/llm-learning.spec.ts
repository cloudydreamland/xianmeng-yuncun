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

test('大模型系统笔记展示十二章并联动对应面试题', async ({ page }) => {
  await page.goto('/learn/llm/');
  await expect(page.getByRole('heading', { name: '大模型从零学习笔记', level: 1 })).toBeVisible();
  await expect(page.locator('.llm-notes-map > div > a')).toHaveCount(12);
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
