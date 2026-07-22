import { expect, test } from '@playwright/test';

test('七境首屏图按实际容器选图并同步解码', async ({ page }) => {
  await page.goto('/world/lantern-lane/');

  const image = page.locator('[data-region-hero-image]');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('decoding', 'sync');

  const source = page.locator('.region-visual source[type="image/avif"]');
  await expect(source).toHaveAttribute(
    'sizes',
    '(max-width: 760px) calc(100vw - 28px), (max-width: 1000px) calc(100vw - 48px), (max-width: 1400px) 46vw, 620px',
  );

  const metrics = await image.evaluate((element) => {
    const target = element as HTMLImageElement;
    const rect = target.getBoundingClientRect();
    const sourceWidth = Number(target.currentSrc.match(/-(\d+)\.(?:avif|webp)$/)?.[1] ?? 0);
    return {
      complete: target.complete,
      requiredWidth: rect.width * window.devicePixelRatio,
      sourceWidth,
    };
  });

  expect(metrics.complete).toBe(true);
  expect(metrics.sourceWidth).toBeGreaterThanOrEqual(metrics.requiredWidth);
  expect(metrics.sourceWidth).toBeLessThan(metrics.requiredWidth * 2.5);
});
