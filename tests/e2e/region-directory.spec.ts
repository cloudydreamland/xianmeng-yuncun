import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

test('内容较短的五境保留明确主入口和可展开的境内目录', async ({ page }) => {
  const cases = [
    ['cloud-village', '#today'],
    ['rain-bridge', '#learning-paths'],
    ['wind-valley', '#resource-library'],
    ['snow-cliff', '#habits'],
    ['lantern-lane', '#gallery'],
  ] as const;

  for (const [slug, primaryHref] of cases) {
    await page.goto(`/world/${slug}/`);
    const directory = page.locator('[data-region-directory]');
    const details = directory.locator('details');
    await expect(details).not.toHaveAttribute('open', '');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await expect(details.locator('li.is-recommended a')).toHaveAttribute('href', primaryHref);
    await expect(details.locator('ol a').first()).toBeVisible();
  }
});

test('星渊和月潭用右侧选项卡一次只展示一项长功能', async ({ page }) => {
  const cases = [
    ['star-abyss', 3, 'constellation'],
    ['moon-pool', 6, 'moon-projects'],
  ] as const;

  for (const [slug, count, defaultTab] of cases) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/world/${slug}/`);
    const tabs = page.locator('[data-region-feature-tabs]');
    await expect(page.locator('[data-region-directory]')).toHaveCount(0);
    await expect(tabs.locator('[role="tab"]')).toHaveCount(count);
    await expect(tabs).toHaveAttribute('data-active-tab', defaultTab);
    await expect(tabs.locator('[data-region-tab-pane]:visible')).toHaveCount(1);
    await expect(tabs.locator(`[data-region-tab="${defaultTab}"]`)).toHaveAttribute('aria-selected', 'true');
  }
});

test('境内滚动只保留一个目录或功能书签，不再让内容卡一起跟随', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/world/cloud-village/');
  await expect(page.locator('.region-directory')).toHaveCSS('position', 'sticky');
  await expect(page.locator('.region-function')).toHaveCSS('position', 'static');

  await page.goto('/world/moon-pool/');
  await expect(page.locator('.region-feature-tabs__aside')).toHaveCSS('position', 'sticky');
  await expect(page.locator('.region-function')).toHaveCSS('position', 'static');

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('.region-feature-tabs__aside')).toHaveCSS('position', 'static');
});

test('月潭选项卡支持深链、键盘切换和手机顶部标签', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/world/moon-pool/#calendar');
  const tabs = page.locator('[data-region-feature-tabs]');
  await expect(tabs).toHaveAttribute('data-active-tab', 'calendar');
  await expect(page.locator('#region-pane-calendar')).toBeVisible();
  await expect(page.locator('#region-pane-moon-projects')).toBeHidden();

  await page.locator('[data-region-tab="calendar"]').press('ArrowDown');
  await expect(tabs).toHaveAttribute('data-active-tab', 'local-planner');
  await expect(page).toHaveURL(/#local-planner$/);

  await page.setViewportSize({ width: 390, height: 844 });
  const tabList = tabs.locator('[role="tablist"]');
  const metrics = await page.evaluate(() => ({
    pageClient: document.documentElement.clientWidth,
    pageScroll: document.documentElement.scrollWidth,
  }));
  expect(metrics.pageScroll).toBeLessThanOrEqual(metrics.pageClient + 1);
  await expect(tabList).toHaveCSS('overflow-x', 'auto');
});

test('风谷常驻分卷、收起标签，并在标签深链时自动展开', async ({ page }) => {
  await page.goto('/world/wind-valley/');
  const filters = page.locator('#wind-filters');
  await expect(filters.getByRole('button', { name: '全部' }).first()).toBeVisible();
  await expect(filters.locator('[data-filter-disclosure]')).not.toHaveAttribute('open', '');

  await page.goto('/world/wind-valley/?tag=Astro');
  await expect(filters.locator('[data-filter-disclosure]')).toHaveAttribute('open', '');
  await expect(filters.locator('[data-filter-disclosure-state]')).toHaveText('已选 #Astro');
  await expect(page.locator('[data-note-card]:visible')).toHaveCount(1);
});

test('手机端分卷与标签自动换行，不再出现横向筛选条', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/world/wind-valley/');
  const filters = page.locator('#wind-filters');
  await filters.locator('[data-filter-disclosure] summary').click();

  const metrics = await filters.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  await expect(filters.getByPlaceholder('例如：NLP、建站')).toBeVisible();
});

test('月潭和灯巷先展示公共作品，再展示本地生活工具', async ({ page }) => {
  await page.goto('/world/moon-pool/');
  const moonOrder = await page.evaluate(() => {
    const projects = document.querySelector('#moon-projects');
    const plans = document.querySelector('#plan-dashboard');
    return Boolean(projects && plans && (projects.compareDocumentPosition(plans) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(moonOrder).toBe(true);

  await page.goto('/world/lantern-lane/');
  const lanternOrder = await page.evaluate(() => {
    const gallery = document.querySelector('#gallery');
    const journal = document.querySelector('#journal');
    return Boolean(gallery && journal && (gallery.compareDocumentPosition(journal) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(lanternOrder).toBe(true);
});
