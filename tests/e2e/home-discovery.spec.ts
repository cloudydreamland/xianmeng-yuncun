import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

const enterHomeContent = async (page: Page) => {
  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-home-scene', 'content');
};

test('云中书页以公告栏说明网站用途和具体用法', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.utility-dock')).toBeHidden();
  await enterHomeContent(page);

  await expect(page.locator('.utility-dock')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '欢迎来到闲梦world' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '网站怎么用' })).toBeVisible();
  await expect(page.locator('.home-guide > li')).toHaveCount(4);
  await expect(page.getByRole('link', { name: '进入学习中心 →' })).toHaveAttribute('href', '/learn/');
  await expect(page.getByText('默认保存在当前浏览器，不会出现在公开页面')).toBeVisible();
  await expect(page.locator('.journey-guide')).toHaveCount(0);
  await expect(page.locator('.realm-overview')).toHaveCount(0);
  await expect(page.locator('.home-plan-summary')).toBeVisible();
  await expect(page.getByRole('link', { name: '订阅 RSS' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开云镜 ⌕' })).toBeVisible();
});

test('桌面导航收拢七境并保留七个境域入口', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('.desktop-realm-menu');

  await menu.locator('summary').click();

  await expect(menu).toHaveAttribute('open', '');
  await expect(menu.locator('.desktop-realm-menu__panel a')).toHaveCount(7);
});

test('公告栏保留学习、内容、探索和工作台四类有效入口', async ({ page }) => {
  await page.goto('/');
  await enterHomeContent(page);
  const guide = page.locator('.home-guide');
  await expect(guide.getByRole('link', { name: /学习中心/ })).toHaveAttribute('href', '/learn/');
  await expect(guide.getByRole('link', { name: '浏览笔记' })).toHaveAttribute('href', '/world/wind-valley/');
  await expect(guide.getByRole('link', { name: /云游路线/ })).toHaveAttribute('href', '/journeys/');
  await expect(guide.getByRole('link', { name: /打开工作台/ })).toHaveAttribute('href', '/workspace/');
});

test('窄屏下公告步骤保持易读的单列布局', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await enterHomeContent(page);
  const steps = page.locator('.home-guide > li');
  const first = await steps.nth(0).boundingBox();
  const second = await steps.nth(1).boundingBox();

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(Math.abs(first!.x - second!.x)).toBeLessThan(2);
  expect(second!.y).toBeGreaterThan(first!.y + first!.height);
});

test('首页下半段背景像工作台一样固定在视口内并保持等比裁切', async ({ page }) => {
  await page.goto('/');

  const background = await page.locator('.home-after-map').evaluate((element) => {
    const style = getComputedStyle(element, '::before');
    return { position: style.position, size: style.backgroundSize };
  });

  expect(background).toEqual({ position: 'fixed', size: 'cover' });
});
