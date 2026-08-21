import { expect, test } from '@playwright/test';

test('world map image is present in the server-rendered HTML', async ({ request }) => {
  const response = await request.get('/');
  const html = await response.text();

  expect(html).toContain('world-map__picture');
  expect(html).toContain('world-detailed-v3-960.avif');
  expect(html).toContain('(max-width: 1800px) 100vw, 1800px');
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-entered', 'true'));
});

test('首页只加载当前时段的一张响应式地图', async ({ page }) => {
  await page.goto('/');

  const avifSource = page.locator('.world-map__picture source[type="image/avif"]');
  await expect(avifSource).toHaveAttribute('srcset', /world-detailed-v3-960\.avif/);
  await expect(avifSource).toHaveAttribute('srcset', /world-detailed-v3-5120\.avif/);
  await expect(page.locator('.world-map__picture img')).not.toHaveAttribute('src', /4k|mobile-hd/);

  await page.waitForTimeout(2_000);
  const loadedWorldImages = await page.evaluate(() => performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => url.includes('/images/world/')));

  expect([...new Set(loadedWorldImages)]).toHaveLength(1);
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
    await expect(page.locator('.world-map__picture img')).toHaveAttribute('src', new RegExp(`/world/${mode}/`));

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

test('首页场景从全境地图之后开始，并随地图时辰同步变色', async ({ page }) => {
  const modes = ['dawn', 'day', 'dusk', 'night'] as const;
  const sceneFilters = new Set<string>();
  await page.goto('/');

  for (const mode of modes) {
    await page.evaluate((value) => localStorage.setItem('yuncun-time-mode', value), mode);
    await page.reload();

    const map = page.locator('.world-map');
    const scene = page.locator('.home-after-map');
    const [mapBox, sceneBox] = await Promise.all([map.boundingBox(), scene.boundingBox()]);

    expect(mapBox).not.toBeNull();
    expect(sceneBox).not.toBeNull();
    expect(sceneBox!.y).toBeGreaterThanOrEqual(mapBox!.y + mapBox!.height - 1);
    await expect(page.locator('html')).toHaveAttribute('data-time', mode);

    const style = await scene.evaluate((element) => {
      const pseudo = getComputedStyle(element, '::before');
      return { backgroundImage: pseudo.backgroundImage, filter: pseudo.filter };
    });
    expect(style.backgroundImage).toContain('home-heaven-rift-v5-1536');
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
