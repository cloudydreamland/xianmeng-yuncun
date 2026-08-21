import { expect, test } from '@playwright/test';

test('首页提供清晰的起步路径与近期内容', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: '在七境之间，记录学习、造物与日常。' })).toBeVisible();
  await expect(page.locator('.home-intro__actions a')).toHaveCount(4);
  await expect(page.locator('.bulletin-note')).toHaveCount(3);
  await expect(page.locator('.workshop-ticket')).toHaveCount(2);
  await expect(page.getByRole('link', { name: '订阅 RSS' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开云镜 ⌕' })).toBeVisible();
});

test('桌面导航收拢七境并保留七个境域入口', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('.desktop-realm-menu');

  await page.getByText('七境', { exact: true }).click();

  await expect(menu).toHaveAttribute('open', '');
  await expect(menu.locator('.desktop-realm-menu__panel a')).toHaveCount(7);
});

test('随机漫游只会前往站内已有内容', async ({ page }) => {
  await page.goto('/');
  const portal = page.locator('[data-random-portal]');
  const destinations = JSON.parse(await portal.getAttribute('data-random-links') ?? '[]') as string[];

  expect(destinations.length).toBeGreaterThan(1);
  await portal.click();

  expect(destinations).toContain(new URL(page.url()).pathname);
});

test('窄屏下快速入口保持易点击的单列布局', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const actions = page.locator('.home-intro__actions a');
  const first = await actions.nth(0).boundingBox();
  const second = await actions.nth(1).boundingBox();

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(Math.abs(first!.x - second!.x)).toBeLessThan(2);
  expect(second!.y).toBeGreaterThan(first!.y + first!.height);
});
