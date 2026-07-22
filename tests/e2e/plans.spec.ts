import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-entered', 'true'));
});

test('首页展示重点计划摘要并直达推进详情', async ({ page }) => {
  await page.goto('/');
  const summary = page.locator('.home-plan-summary');
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('heading', { name: '此刻正在做什么' })).toBeVisible();
  await expect(summary.getByRole('link', { name: /雲梦世界持续建设/ })).toHaveAttribute('href', '/world/moon-pool/yuncun-next-stage/');
  await expect(summary.getByText('里程碑完成 75%')).toBeVisible();
});

test('月潭推进台计算近期行动并同步筛选 URL 与历史记录', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-22T04:00:00.000Z'));
  await page.goto('/world/moon-pool/');

  const dashboard = page.locator('[data-plan-dashboard]');
  await expect(dashboard).toBeVisible();
  await expect(dashboard.locator('[data-upcoming-count]')).toHaveText('1');
  await expect(dashboard.locator('[data-overdue-count]')).toHaveText('0');
  await expect(dashboard.locator('[data-action-row]').first()).toContainText('七天内');

  await dashboard.getByRole('button', { name: '进行中', exact: true }).click();
  await expect(page).toHaveURL(/status=%E8%BF%9B%E8%A1%8C%E4%B8%AD/);
  await expect(dashboard.locator('[data-plan-card]:visible')).toHaveCount(1);

  await dashboard.getByRole('button', { name: '已完成', exact: true }).click();
  await expect(page).toHaveURL(/status=%E5%B7%B2%E5%AE%8C%E6%88%90/);
  await expect(dashboard.locator('[data-plan-empty]')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/status=%E8%BF%9B%E8%A1%8C%E4%B8%AD/);
  await expect(dashboard.locator('[data-plan-card]:visible')).toHaveCount(1);
});

test('计划详情展示进度、项目关联并可从项目档案返回', async ({ page }) => {
  await page.goto('/world/moon-pool/yuncun-next-stage/');
  await expect(page.getByRole('heading', { level: 1, name: '雲梦世界持续建设' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: /里程碑进度/ })).toHaveAttribute('aria-valuenow', '75');
  await expect(page.getByRole('link', { name: '查看稳定项目档案 →' })).toHaveAttribute('href', '/projects/yuncun-blog/');

  await page.goto('/projects/yuncun-blog/');
  const linked = page.locator('.project-plan-links');
  await expect(linked.getByRole('link', { name: /雲梦世界持续建设/ })).toHaveAttribute('href', '/world/moon-pool/yuncun-next-stage/');
});

test('计划详情进入推进搜索类型', async ({ page }) => {
  await page.goto('/world/moon-pool/');
  await page.getByRole('button', { name: /搜索|云镜/ }).first().click();
  await page.getByRole('button', { name: '推进', exact: true }).click();
  await page.getByRole('searchbox').fill('雲梦世界持续建设');
  await expect(page.locator('.search-result').filter({ hasText: '雲梦世界持续建设' })).toBeVisible();
});

test('移动端推进台不产生横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/world/moon-pool/');
  await expect(page.locator('[data-plan-card]')).toBeVisible();
  const sizes = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(sizes.width).toBeLessThanOrEqual(sizes.viewport);
});

test('无 JavaScript 时仍能阅读计划和进入详情', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/world/moon-pool/');
  const card = page.locator('[data-plan-card]');
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: '雲梦世界持续建设' })).toHaveAttribute('href', '/world/moon-pool/yuncun-next-stage/');
  await context.close();
});
