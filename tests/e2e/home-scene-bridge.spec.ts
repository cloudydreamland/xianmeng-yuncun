import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

test('地图与首页内容通过云雾转场双向切换', async ({ page }) => {
  await page.goto('/');
  const transition = page.locator('[data-home-scene-transition]');
  const content = page.locator('#home-content');
  const map = page.locator('#world-map-top');

  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(transition).toBeVisible();
  await expect(page).toHaveURL(/#home-content$/);
  await expect(transition).toBeHidden({ timeout: 2_000 });
  await expect.poll(async () => Math.abs((await content.boundingBox())?.y ?? 999)).toBeLessThan(2);

  await page.getByRole('link', { name: '返回雲梦世界全境地图' }).click();
  await expect(page).toHaveURL(/#world-map-top$/);
  await expect(transition).toBeHidden({ timeout: 2_000 });
  await expect.poll(async () => Math.abs((await map.boundingBox())?.y ?? 999)).toBeLessThan(2);
});

test('减少动态效果时箭头立即完成场景切换', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(page).toHaveURL(/#home-content$/);
  await expect(page.locator('[data-home-scene-transition]')).toBeHidden();
});

test('手机端下行箭头不遮挡时辰按钮', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const controls = await page.locator('.world-map__frame').evaluate((frame) => {
    const down = frame.querySelector<HTMLElement>('.world-map__descent')!.getBoundingClientRect();
    const dial = frame.querySelector<HTMLElement>('.world-time-dial__toggle')!.getBoundingClientRect();
    const overlap = !(down.right <= dial.left || down.left >= dial.right || down.bottom <= dial.top || down.top >= dial.bottom);
    return { overlap, downLeft: down.left, dialRight: dial.right };
  });

  expect(controls.overlap).toBe(false);
  expect(controls.downLeft).toBeGreaterThanOrEqual(10);
  expect(controls.dialRight).toBeLessThanOrEqual(390);
});
