import { expect, test } from '@playwright/test';

test('每次进入首页都先加载关键资源，完成后由用户点击入境', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const entrance = page.locator('[data-cloud-entrance]');
  const progress = entrance.getByRole('progressbar');
  const enter = entrance.getByRole('button', { name: '入境' });

  await expect(entrance).toBeVisible();
  await expect(progress).toBeVisible();
  await expect(enter).toBeHidden();
  await expect(enter).toBeVisible({ timeout: 8_000 });
  await expect(progress).toHaveAttribute('aria-valuenow', '100');
  await expect(entrance.getByText('云门开，山河现', { exact: true })).toBeVisible();

  await enter.click();
  await expect(entrance).toBeHidden();

  await page.reload();
  await expect(entrance).toBeVisible();
  await expect(entrance.getByRole('button', { name: '入境' })).toBeVisible({ timeout: 8_000 });
});

test('高 DPR 手机必须等实际 1440 地图解码绘制后才允许入境', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4321',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  let releaseMap = () => {};
  let intercepted = false;
  const mapGate = new Promise<void>((resolve) => { releaseMap = resolve; });

  await context.route('**/images/world/**/world-detailed-v3-1440.avif', async (route) => {
    intercepted = true;
    await mapGate;
    await route.continue();
  });
  const page = await context.newPage();

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const entrance = page.locator('[data-cloud-entrance]');
    const enter = entrance.getByRole('button', { name: '入境' });

    await expect.poll(() => page.evaluate(() => (window as Window & { __yuncunCriticalImage?: string }).__yuncunCriticalImage))
      .toContain('world-detailed-v3-1440.avif');
    await expect.poll(() => intercepted).toBe(true);
    await expect(enter).toBeHidden();
    await expect(entrance.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow', '100');

    releaseMap();
    await expect(enter).toBeVisible({ timeout: 8_000 });
    await expect(entrance.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    await expect(page.locator('.world-map__picture')).toHaveAttribute('data-map-ready', 'true');

    await enter.click();
    await expect(entrance).toBeHidden();
    await expect(page.locator('.world-map__picture')).toBeVisible();
    await expect.poll(() => page.locator('.world-map__picture').evaluate((element) => getComputedStyle(element).backgroundImage))
      .toContain('world-detailed-v3-1440.avif');
  } finally {
    releaseMap();
    await context.close();
  }
});
