import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-entered', 'true'));
});

test('首页只显示七个动森地名并支持 hash、Escape 与焦点恢复', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.world-map__masthead')).toHaveCount(0);
  await expect(page.locator('.world-marker__title')).toHaveCount(7);

  const lantern = page.getByRole('link', { name: /查看浮屿·灯巷/ });
  await lantern.click();
  await expect(page).toHaveURL(/#lantern-lane$/);
  await expect(page.locator('.world-drawer')).toHaveAttribute('open', '');

  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/#lantern-lane$/);
  await expect(page.locator('.world-drawer')).not.toHaveAttribute('open', '');
  await expect(lantern).toBeFocused();

  const star = page.getByRole('link', { name: /查看星渊/ }).first();
  await star.click();
  await page.goBack();
  await expect(page).not.toHaveURL(/#star-abyss$/);
  await expect(page.locator('.world-drawer')).not.toHaveAttribute('open', '');
});

test('移动端地图可横向浏览并保留七境地名册', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('.world-marker__title')).toHaveCount(7);
  await expect(page.locator('.world-ledger a')).toHaveCount(7);
  await expect(page.locator('.world-ledger')).toBeVisible();
  await expect(page.locator('.world-map__viewport')).toHaveCSS('overflow-x', 'auto');
});
