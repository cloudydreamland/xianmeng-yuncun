import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

const enterHomeContent = async (page: Page) => {
  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-home-scene', 'content');
};

test('云中书页用一份七境功能目录说明网站用途', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.utility-dock')).toHaveCount(0);
  await enterHomeContent(page);

  await expect(page.getByRole('heading', { level: 1, name: '欢迎来到闲梦world' })).toBeVisible();
  await expect(page.locator('.home-constellation')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '七境功能目录' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '从内容开始' })).toBeVisible();
  await expect(page.locator('.home-place-directory li')).toHaveCount(7);
  await expect(page.getByText('系统课程、代码实践与面试训练')).toBeVisible();
  await expect(page.getByText('公开笔记、原始资料与站外链接')).toBeVisible();
  await expect(page.getByText('项目案例与明确公开的推进计划')).toBeVisible();
  await expect(page.getByText('一处保留安静叙事的雪夜歇脚地')).toBeVisible();
  await expect(page.locator('.journey-guide')).toHaveCount(0);
  await expect(page.locator('.realm-overview')).toHaveCount(0);
  await expect(page.locator('.home-plan-summary')).toBeVisible();
  const follow = page.locator('.home-follow');
  await expect(page.getByText('RSS 是给订阅阅读器使用的更新源')).toBeVisible();
  await expect(follow.getByRole('link', { name: 'RSS 订阅源，适合复制到订阅阅读器' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开云镜 ⌕' })).toBeVisible();
});

test('除个人资料页外不展示站点主人的姓名', async ({ page }) => {
  await page.goto('/');
  await enterHomeContent(page);
  await expect(page.getByText('王选默')).toHaveCount(0);

  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1, name: '王选默' })).toBeVisible();
});

test('顶部只保留公开任务导航且不出现私人入口', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.desktop-realm-menu')).toHaveCount(0);
  await expect(page.locator('.desktop-nav').getByRole('link', { name: '笔记' })).toBeVisible();
  await expect(page.locator('.desktop-nav').getByRole('link', { name: '学习' })).toBeVisible();
  await expect(page.locator('.desktop-nav').getByRole('link', { name: '项目' })).toBeVisible();
  await expect(page.locator('.desktop-nav').getByRole('link', { name: '我的' })).toHaveCount(0);
  await expect(page.locator('.desktop-nav').getByRole('link', { name: '关于' })).toBeVisible();
});

test('七境功能目录保留七个入口并同时显示功能名和世界名', async ({ page }) => {
  await page.goto('/');
  await enterHomeContent(page);
  const guide = page.locator('.home-place-directory');
  await expect(guide.locator('a')).toHaveCount(7);
  await expect(guide.locator('a').nth(0)).toContainText('总览与导航');
  await expect(guide.locator('a').nth(0)).toContainText('云村');
  await expect(guide.locator('a').nth(1)).toContainText('课程与训练');
  await expect(guide.locator('a').nth(2)).toContainText('资料与笔记');
  await expect(guide.locator('a').nth(3)).toContainText('项目与计划');
  await expect(guide.locator('a').nth(4)).toContainText('作品与收藏');
  await expect(guide.locator('a').nth(5)).toContainText('成长与实验');
  await expect(guide.locator('a').nth(6)).toContainText('静心与休憩');
  const hrefs = await guide.locator('a').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')),
  );
  expect(hrefs).toEqual([
    '/world/cloud-village/',
    '/world/rain-bridge/',
    '/world/wind-valley/',
    '/world/moon-pool/',
    '/world/lantern-lane/',
    '/world/star-abyss/',
    '/world/snow-cliff/',
  ]);
});

test('窄屏下七境目录单列展示且不产生页面溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await enterHomeContent(page);
  await expect(page.locator('.home-place-directory ol')).toHaveCSS('grid-template-columns', /\d+(\.\d+)?px/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('首页下半段背景像工作台一样固定在视口内并保持等比裁切', async ({ page }) => {
  await page.goto('/');

  const background = await page.locator('.home-after-map').evaluate((element) => {
    const style = getComputedStyle(element, '::before');
    return { position: style.position, size: style.backgroundSize };
  });

  expect(background).toEqual({ position: 'fixed', size: 'cover' });
});
