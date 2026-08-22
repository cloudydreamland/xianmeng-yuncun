import { expect, test } from '@playwright/test';

test('world map image is present in the server-rendered HTML', async ({ request }) => {
  const response = await request.get('/');
  const html = await response.text();

  expect(html).toContain('world-map__picture');
  expect(html).toContain('world-detailed-v3-960.avif');
  expect(html).toContain('(max-width: 1800px) 100vw, 1800px');
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

test('首页加载服务端响应式地图并切换到当前时段', async ({ page }) => {
  await page.goto('/');

  const picture = page.locator('.world-map__picture');
  await expect(picture).toHaveAttribute('role', 'img');
  await expect(picture).toHaveAttribute('style', /--world-map-day:\s*url\("\/images\/world\/day\/world-detailed-v3-1920\.avif"\)/);
  await expect(picture).toHaveAttribute('style', /--world-map-day-large:\s*url\("\/images\/world\/day\/world-detailed-v3-2560\.avif"\)/);
  await expect(picture).toHaveAttribute('style', /--world-map-day-ultra:\s*url\("\/images\/world\/day\/world-detailed-v3-3840\.avif"\)/);
  await expect(picture).toHaveAttribute('style', /--world-map-day-mobile:\s*url\("\/images\/world\/day\/world-detailed-v3-960\.avif"\)/);

  await page.waitForTimeout(2_000);
  const loadedWorldImages = await page.evaluate(() => performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => url.includes('/images/world/')));

  const uniqueImages = [...new Set(loadedWorldImages)];
  // 时段由首屏内联脚本决定，地图以 CSS 背景按当前时段取图，避免水合前后重复下载。
  expect(uniqueImages).toHaveLength(1);
});

test('截图对应的高分屏选择足够清晰的大地图资源', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4321',
    viewport: { width: 1800, height: 1010 },
    deviceScaleFactor: 1.4,
  });
  await context.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
  const page = await context.newPage();

  try {
    await page.goto('/');
    await expect.poll(() => page.locator('.world-map__picture').evaluate((element) => getComputedStyle(element).backgroundImage))
      .toMatch(/world-detailed-v3-2560\.avif/);

    const metrics = await page.evaluate(() => ({
      cssWidth: window.innerWidth,
      density: window.devicePixelRatio,
      physicalWidth: window.innerWidth * window.devicePixelRatio,
      loadedWorldImages: [...new Set(performance.getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((url) => url.includes('/images/world/')))],
    }));

    expect(metrics.physicalWidth).toBeCloseTo(2520, 0);
    expect(metrics.loadedWorldImages).toHaveLength(1);
    expect(metrics.loadedWorldImages[0]).toContain('world-detailed-v3-2560.avif');
  } finally {
    await context.close();
  }
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

test('移动端地图锁定整屏、可横向浏览并保留七境入口', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('.world-marker__title')).toHaveCount(7);
  await expect(page.locator('.world-ledger a')).toHaveCount(7);
  await expect(page.locator('.world-ledger')).toBeHidden();
  await expect(page.locator('.world-map__viewport')).toHaveCSS('overflow-x', 'auto');
  const dimensions = await page.evaluate(() => ({
    mapHeight: document.querySelector('.world-map')!.getBoundingClientRect().height,
    viewportHeight: window.innerHeight,
    pageHeight: document.documentElement.scrollHeight,
  }));
  expect(dimensions.mapHeight).toBe(dimensions.viewportHeight);
  expect(dimensions.pageHeight).toBeLessThanOrEqual(dimensions.viewportHeight + 1);
});

test('四个时辰同步切换背景与语义文字色，并保持面板文字稳定', async ({ page }) => {
  await page.goto('/');

  const modes = ['dawn', 'day', 'dusk', 'night'] as const;
  const pageColors = new Set<string>();
  const imageColors = new Set<string>();
  const mapFilters = new Set<string>();
  const panelColors = new Set<string>();

  for (const mode of modes) {
    await page.evaluate((value) => localStorage.setItem('yuncun-time-mode', value), mode);
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-time', mode);
    await expect.poll(() => page.locator('.world-map__picture').evaluate((element) => getComputedStyle(element).backgroundImage))
      .toMatch(new RegExp(`/world/${mode}/world-detailed-v3-1920\\.avif`));

    const styles = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const marker = getComputedStyle(document.querySelector('.world-marker__title')!);
      const panel = getComputedStyle(document.querySelector('.world-time-dial__toggle')!);
      const read = (name: string) => root.getPropertyValue(name).trim();

      return {
        page: read('--page-text-primary'),
        image: read('--image-text-primary'),
        panel: read('--panel-text-primary'),
        markerFilter: marker.filter,
        markerShadow: marker.textShadow,
        controlColor: panel.color,
      };
    });

    pageColors.add(styles.page);
    imageColors.add(styles.image);
    mapFilters.add(styles.markerFilter);
    panelColors.add(styles.panel);
    expect(styles.markerShadow).not.toBe('none');
  }

  expect(pageColors.size).toBe(4);
  expect(imageColors.size).toBe(4);
  expect(mapFilters.size).toBe(4);
  expect(panelColors.size).toBe(1);
});

test('首页内容与地图互斥显示，并随地图时辰同步变色', async ({ page }) => {
  const modes = ['dawn', 'day', 'dusk', 'night'] as const;
  const sceneFilters = new Set<string>();
  await page.goto('/');

  for (const mode of modes) {
    await page.evaluate((value) => localStorage.setItem('yuncun-time-mode', value), mode);
    await page.reload();

    const scene = page.locator('.home-after-map');
    await expect(page.locator('.world-map')).toBeVisible();
    await expect(scene).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-time', mode);

    const style = await scene.evaluate((element) => {
      const pseudo = getComputedStyle(element, '::before');
      return { backgroundImage: pseudo.backgroundImage, filter: pseudo.filter };
    });
    expect(style.backgroundImage).toContain('home-heaven-rift-v6-');
    sceneFilters.add(style.filter);
  }

  expect(sceneFilters.size).toBe(4);
});

test('夜间图片文字有描边，浅色抽屉仍使用深色面板文字', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('yuncun-time-mode', 'night'));
  await page.reload();

  const brand = page.locator('.site-brand').first();
  await expect(brand).toHaveCSS('color', 'rgb(255, 244, 216)');
  await expect(brand).not.toHaveCSS('text-shadow', 'none');

  await page.locator('.world-marker').first().click();
  const drawer = page.locator('.world-drawer');
  await expect(drawer).toHaveAttribute('open', '');
  await expect(drawer).toHaveCSS('color', 'rgb(63, 73, 63)');
});
