import { expect, test, type Page } from '@playwright/test';

const routes = [
  '/',
  '/private-migration/',
  '/about',
  '/journeys/',
  '/world/cloud-village/',
  '/world/star-abyss/',
  '/world/moon-pool/',
  '/interview/llm/',
  '/interview/llm/transformer-and-attention/',
  '/learn/pytorch/',
  '/learn/pytorch/transformer-from-scratch/',
  '/notes/nlp-interview-study-index/',
  '/projects/yuncun-blog/',
] as const;

const assertNoPageOverflow = async (page: Page) => {
  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

for (const viewport of [
  { name: 'phone', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
]) {
  for (const route of routes) {
    test(`${viewport.name} ${route} 不产生页面级横向溢出`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      await assertNoPageOverflow(page);
    });
  }
}

test('手机端首页背景使用响应式资源', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-home-scene', 'content');

  const homeBackground = await page.locator('.home-after-map').evaluate((element) => (
    getComputedStyle(element, '::before').backgroundImage
  ));
  expect(homeBackground).toContain('home-heaven-rift-v6-1536.avif');

});

test('手机地图直接提示横向浏览并提供完整七境目录', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('左右滑动浏览地图 · 七境目录可查看全部')).toBeVisible();
  const directory = page.locator('.world-mobile-directory');
  await directory.locator('summary').click();
  await expect(directory.getByRole('link')).toHaveCount(7);
  await expect(directory.getByRole('link').last()).toBeVisible();
});

test('高 DPR 手机为首页选用 2560 清晰背景', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4321',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  await context.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
  const page = await context.newPage();

  try {
    await page.goto('/');
    await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
    const homeBackground = await page.locator('.home-after-map').evaluate((element) => (
      getComputedStyle(element, '::before').backgroundImage
    ));
    expect(homeBackground).toContain('home-heaven-rift-v6-2560.avif');

  } finally {
    await context.close();
  }
});

test('手机主要导航与地图控件保持至少 44px 触控高度', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  const controls = page.locator('.mobile-nav > summary, .world-mobile-directory > summary, .world-map__descent, .world-time-dial__toggle');
  await expect(controls).toHaveCount(4);
  for (let index = 0; index < await controls.count(); index += 1) {
    const height = await controls.nth(index).evaluate((element) => element.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
  }
});

test('手机搜索筛选保持可点击且公开站没有私人快捷工具', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/notes/yuncun-august-maintenance-retrospective/');

  await page.locator('.mobile-nav > summary').click();
  await page.getByRole('button', { name: '⌕ 云镜搜索' }).click();
  const searchFilters = page.locator('.search-filters button');
  for (let index = 0; index < await searchFilters.count(); index += 1) {
    await expect.poll(() => searchFilters.nth(index).evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: '关闭搜索' }).click();

  await expect(page.locator('.utility-dock,[data-quick-capture],[data-reminder-center]')).toHaveCount(0);
});

test('手机导航只保留云镜和设备内稍后阅读', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/notes/yuncun-august-maintenance-retrospective/');

  const mobileNav = page.locator('.mobile-nav');
  await mobileNav.locator(':scope > summary').click();
  await expect(mobileNav.locator('[data-search-open]')).toBeVisible();
  await expect(mobileNav.locator('[data-reading-list-open]')).toBeVisible();
  await expect(mobileNav.locator('[data-reminder-open],a[href="/workspace/"]')).toHaveCount(0);
});

test('旧工作台地址只输出独立管理员站跳转页', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspace/', { waitUntil: 'commit' });
  const target = 'https://xianmeng-yuncun-admin.pages.dev';
  if (new URL(page.url()).origin === target) return;
  await expect(page.locator('meta[http-equiv="refresh"]')).toHaveAttribute('content', new RegExp(target));
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});
