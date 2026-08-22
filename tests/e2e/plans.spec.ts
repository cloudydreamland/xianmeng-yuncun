import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

test('首页展示重点计划摘要并直达推进详情', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-home-scene', 'content');
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
  await expect(page.getByRole('link', { name: '展读造物旧录 →' })).toHaveAttribute('href', '/projects/yuncun-blog/');

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

test('可以新建、编辑并持久保存仅本地可见的日程笔记', async ({ page }) => {
  await page.goto('/world/moon-pool/');
  await page.evaluate(() => localStorage.removeItem('yuncun-local-plans-v1'));
  await page.reload();

  const planner = page.locator('[data-local-planner]');
  await planner.locator('[data-local-plan-new]').click();
  const dialog = planner.locator('[data-local-plan-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await dialog.locator('[name="title"]').fill('准备周五复盘');
  await dialog.locator('[name="date"]').fill('2026-07-24');
  await dialog.locator('[name="priority"]').selectOption('high');
  await dialog.locator('[name="notes"]').fill('整理本周完成事项，并记录下周最重要的三件事。');
  await dialog.getByRole('button', { name: '保存到本地' }).click();

  const card = planner.locator('[data-local-plan-card]').filter({ hasText: '准备周五复盘' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('高优先');
  await expect(card).toContainText('整理本周完成事项');
  await expect(planner.locator('[data-local-plan-open-count]')).toHaveText('1');

  await card.getByRole('button', { name: '编辑' }).click();
  await dialog.locator('[name="notes"]').fill('复盘完成，补充下周学习安排。');
  await dialog.getByRole('button', { name: '保存到本地' }).click();
  await expect(card).toContainText('复盘完成，补充下周学习安排。');

  await page.reload();
  await expect(planner.locator('[data-local-plan-card]').filter({ hasText: '准备周五复盘' })).toContainText('复盘完成，补充下周学习安排。');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('yuncun-local-plans-v1') || '[]'));
  expect(stored).toHaveLength(1);
});

test('本地日程不会出现在另一个浏览器存储空间', async ({ browser }) => {
  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  await firstPage.goto('http://127.0.0.1:4321/world/moon-pool/');
  await firstPage.evaluate(() => localStorage.setItem('yuncun-local-plans-v1', JSON.stringify([{
    id: 'private-plan',
    title: '仅本机可见',
    date: '',
    priority: 'medium',
    notes: '私人笔记',
    completed: false,
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  }])));
  await firstPage.reload();
  await expect(firstPage.getByText('仅本机可见')).toBeVisible();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto('http://127.0.0.1:4321/world/moon-pool/');
  await expect(secondPage.getByText('仅本机可见')).toHaveCount(0);
  await expect(secondPage.locator('[data-local-plan-empty]')).toBeVisible();

  await firstContext.close();
  await secondContext.close();
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
