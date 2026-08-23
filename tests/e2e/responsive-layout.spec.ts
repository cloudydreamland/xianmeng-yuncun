import { expect, test, type Page } from '@playwright/test';

const routes = [
  '/',
  '/workspace/',
  '/about',
  '/journeys/',
  '/now',
  '/world/cloud-village/',
  '/world/star-abyss/',
  '/world/moon-pool/',
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

test('手机端首页背景和工作台背景使用一致画面的响应式资源', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-home-scene', 'content');

  const homeBackground = await page.locator('.home-after-map').evaluate((element) => (
    getComputedStyle(element, '::before').backgroundImage
  ));
  expect(homeBackground).toContain('home-heaven-rift-v6-1536.avif');

  await page.goto('/workspace/');
  const workspaceBackground = await page.locator('body').evaluate((element) => (
    getComputedStyle(element, '::after').backgroundImage
  ));
  expect(workspaceBackground).toContain('workspace-starriver-v6-1536.avif');
});

test('手机组件改为单列，平板组件保持紧凑双列', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(page.locator('.realm-overview-grid')).toHaveCSS('grid-template-columns', /.+/);
  const phoneColumns = await page.locator('.realm-overview-grid').evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(' ').length
  ));
  expect(phoneColumns).toBe(1);

  await page.setViewportSize({ width: 768, height: 1024 });
  const tabletColumns = await page.locator('.realm-overview-grid').evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(' ').length
  ));
  expect(tabletColumns).toBe(2);
});

test('高 DPR 手机为首页和工作台选用 2560 清晰背景', async ({ browser }) => {
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

    await page.goto('/workspace/');
    const workspaceBackground = await page.locator('body').evaluate((element) => (
      getComputedStyle(element, '::after').backgroundImage
    ));
    expect(workspaceBackground).toContain('workspace-starriver-v6-2560.avif');
  } finally {
    await context.close();
  }
});

test('手机主要导航与地图控件保持至少 44px 触控高度', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  const controls = page.locator('.mobile-nav summary, .world-map__descent, .world-time-dial__toggle');
  await expect(controls).toHaveCount(3);
  for (let index = 0; index < await controls.count(); index += 1) {
    const height = await controls.nth(index).evaluate((element) => element.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
  }
});

test('手机端加密云卷区分访问密钥与同步密码且不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/workspace/');

  const accessToken = page.getByLabel('访问密钥');
  const passphrase = page.getByLabel('同步密码');
  await expect(accessToken).toBeVisible();
  await expect(passphrase).toBeVisible();
  await expect(page.getByText('保存访问密钥，用于自动同步')).toBeVisible();
  await expect(page.locator('.sync-center__setup')).toHaveCSS('grid-template-columns', /\d+(\.\d+)?px/);
  await assertNoPageOverflow(page);
});
