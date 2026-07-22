import { expect, test } from '@playwright/test';

test('个人主页使用高清云村背景且不对背景应用模糊', async ({ page }) => {
  await page.goto('/about/');

  const background = page.locator('.page-hero__background img');
  await expect(background).toBeVisible();
  const currentSrc = await background.evaluate((image) => (image as HTMLImageElement).currentSrc);
  expect(currentSrc).toContain('yuncun-cloudwall-v2-');

  const backdropFilter = await page.locator('.page-hero__inner > div')
    .evaluate((element) => getComputedStyle(element).backdropFilter);
  expect(backdropFilter).toBe('none');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    heroBackground: getComputedStyle(document.querySelector('.page-hero')!).backgroundImage,
  }));
  expect(layout.scrollWidth).toBe(layout.clientWidth);
  expect(layout.heroBackground).toBe('none');
});
