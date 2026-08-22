import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-entered', 'true'));
});

test('首页几何粒子使用视口画布并启动点线动画', async ({ page }) => {
  await page.goto('/');
  const field = page.locator('[data-home-geometry]');
  const canvas = field.locator('canvas');

  await expect(field).toHaveAttribute('data-ready', 'true');
  await expect(field).toHaveAttribute('data-motion', 'active');
  await expect(canvas).toBeVisible();

  const metrics = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    return {
      cssHeight: target.getBoundingClientRect().height,
      pixelHeight: target.height,
      viewportHeight: window.innerHeight,
      ratio: window.devicePixelRatio,
    };
  });

  expect(metrics.cssHeight).toBeCloseTo(metrics.viewportHeight, -1);
  expect(metrics.pixelHeight).toBeLessThanOrEqual(metrics.viewportHeight * Math.min(metrics.ratio, 1.5) + 2);
  await expect(field).toHaveAttribute('data-node-count', /1[3-9][0-9]/);
});

test('减少动态效果时首页粒子保持静态', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-home-geometry]')).toHaveAttribute('data-motion', 'static');
});
