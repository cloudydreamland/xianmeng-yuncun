import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

test('专题首页展示十四章、150题并可按标题跳转', async ({ page }) => {
  await page.goto('/interview/llm/');
  await expect(page.getByRole('heading', { name: '大模型面经 · 问道录', level: 1 })).toBeVisible();
  await expect(page.locator('.interview-chapters > div > a')).toHaveCount(14);
  await expect(page.getByText('150', { exact: true })).toBeVisible();

  await page.getByRole('searchbox', { name: '搜索150道大模型面试题' }).fill('RoPE');
  const result = page.locator('[data-interview-results] a').filter({ hasText: 'RoPE' }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/interview\/llm\/transformer-and-attention\/#.+/);
  await expect(page.locator('.interview-prose h2').filter({ hasText: 'RoPE 的核心原理是什么？' }).first()).toBeInViewport();
});

test('章节目录、高亮与相邻章节导航可用', async ({ page }) => {
  await page.goto('/interview/llm/transformer-and-attention/');
  await expect(page.locator('.interview-prose h2')).toHaveCount(16);
  await expect(page.locator('.interview-directory nav').first().locator('a')).toHaveCount(14);
  await expect(page.getByRole('link', { name: /下一章.*模型架构与 Scaling/ })).toBeVisible();
  await page.locator('.interview-directory__questions a').nth(1).click();
  await expect(page.locator('.interview-directory__questions a').nth(1)).toHaveAttribute('aria-current', 'location');
});

test('手机端使用可展开目录且不产生页面级横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/interview/llm/deep-learning-foundations/');
  const directory = page.locator('.interview-mobile-directory');
  await expect(directory).toBeVisible();
  await directory.locator('summary').click();
  await expect(directory.getByRole('link', { name: /Tokenizer 与表示学习/ })).toBeVisible();
  const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
});

test('全站云镜可以筛选面经正文', async ({ page }) => {
  await page.goto('/interview/llm/inference-and-serving/');
  await page.getByRole('button', { name: '搜索云村内容' }).click();
  await page.getByRole('button', { name: '面经', exact: true }).click();
  await page.getByRole('searchbox', { name: '搜索雲梦世界内容' }).fill('PagedAttention');
  const dialog = page.getByRole('dialog', { name: '云镜检索' });
  await expect(dialog.locator('.search-result').filter({ hasText: '推理与服务优化' }).first()).toBeVisible();
});
