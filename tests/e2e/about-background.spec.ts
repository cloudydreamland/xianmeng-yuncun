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

test('夜间个人主页区分图片文字与浅色面板文字', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('yuncun-time-mode', 'night'));
  await page.goto('/about/');

  await expect(page.locator('html')).toHaveAttribute('data-time', 'night');
  await expect(page.locator('.page-hero h1')).toHaveCSS('color', 'rgb(255, 244, 216)');
  await expect(page.locator('.page-hero h1')).not.toHaveCSS('text-shadow', 'none');
  await expect(page.locator('.about-letter')).toHaveCSS('color', 'rgb(89, 101, 92)');
});
