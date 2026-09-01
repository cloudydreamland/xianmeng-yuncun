import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

const enterHomeContent = async (page: Page) => {
  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-home-scene', 'content');
};

test('云中书页以七星路线说明网站用途和核心功能', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.utility-dock')).toBeHidden();
  await enterHomeContent(page);

  await expect(page.locator('.utility-dock')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '欢迎来到闲梦world' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '七星入门路线' })).toBeVisible();
  await expect(page.locator('.home-constellation__node')).toHaveCount(7);
  await expect(page.locator('.home-constellation__node').first()).toHaveAttribute('href', '/world/cloud-village/');
  await expect(page.getByRole('heading', { name: '七星导航与功能说明' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '每颗星都能做什么' })).toBeVisible();
  await expect(page.locator('.home-place-directory li')).toHaveCount(7);
  await expect(page.getByText('搜索笔记、教程、面经、项目、计划和作品')).toBeVisible();
  await expect(page.getByText('生活日历、重复清单、期限、账目和物品位置')).toBeVisible();
  await expect(page.getByText('习惯数据默认保存在当前浏览器')).toBeVisible();
  await expect(page.locator('.journey-guide')).toHaveCount(0);
  await expect(page.locator('.realm-overview')).toHaveCount(0);
  await expect(page.locator('.home-plan-summary')).toBeVisible();
  await expect(page.getByRole('link', { name: '订阅 RSS' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开云镜 ⌕' })).toBeVisible();
});

test('除个人资料页外不展示站点主人的姓名', async ({ page }) => {
  await page.goto('/');
  await enterHomeContent(page);
  await expect(page.getByText('王选默')).toHaveCount(0);

  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1, name: '王选默' })).toBeVisible();
});

test('桌面导航收拢七境并保留七个境域入口', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('.desktop-realm-menu');

  await menu.locator('summary').click();

  await expect(menu).toHaveAttribute('open', '');
  await expect(menu.locator('.desktop-realm-menu__panel a')).toHaveCount(7);
});

test('七星路线保留七个功能入口并按新手顺序排列', async ({ page }) => {
  await page.goto('/');
  await enterHomeContent(page);
  const guide = page.locator('.home-constellation__route');
  await expect(guide.locator('a')).toHaveCount(7);
  await expect(guide.locator('a').nth(0)).toContainText('总览与导航');
  await expect(guide.locator('a').nth(1)).toContainText('搜索与随手记');
  await expect(guide.locator('a').nth(2)).toContainText('笔记与阅读');
  await expect(guide.locator('a').nth(3)).toContainText('项目与计划');
  await expect(guide.locator('a').nth(4)).toContainText('作品与收藏');
  await expect(guide.locator('a').nth(5)).toContainText('成长与专注');
  await expect(guide.locator('a').nth(6)).toContainText('关系与来信');
});

test('窄屏下七星路线切换为纵向星轨且不产生页面溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await enterHomeContent(page);
  await expect(page.locator('.home-constellation__lines--mobile')).toBeVisible();
  await expect(page.locator('.home-constellation__lines--desktop')).toBeHidden();
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
