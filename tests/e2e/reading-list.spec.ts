import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true');
    if (!window.sessionStorage.getItem('yuncun-reading-list-test-ready')) {
      window.localStorage.removeItem('yuncun-reading-list-v1');
      window.sessionStorage.setItem('yuncun-reading-list-test-ready', 'true');
    }
  });
});

test('笔记可以加入本地稍后阅读并跨页面保留', async ({ page }) => {
  await page.goto('/notes/chun-ri-shan-chuang/');

  const toggle = page.locator('[data-reading-list-toggle]');
  await expect(toggle).toHaveText('加入稍后阅读');
  await toggle.click();
  await expect(toggle).toHaveText('已加入稍后阅读');
  await expect(page.locator('[data-reading-list-count]').first()).toHaveText('1');

  await page.goto('/');
  await page.locator('[data-reading-list-open]').first().click();
  const dialog = page.locator('[data-reading-list-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.locator('a[href="/notes/chun-ri-shan-chuang/"]')).toBeVisible();

  await dialog.getByRole('button', { name: '移除' }).click();
  await expect(dialog.locator('[data-reading-list-empty]')).toBeVisible();
  await expect(page.locator('[data-reading-list-count]').first()).toHaveText('0');
});

test('稍后阅读只保存在当前浏览器空间', async ({ browser }) => {
  const first = await browser.newContext();
  const firstPage = await first.newPage();
  await firstPage.goto('/notes/chun-ri-shan-chuang/');
  await firstPage.locator('[data-reading-list-toggle]').click();
  await expect(firstPage.locator('[data-reading-list-count]').first()).toHaveText('1');

  const second = await browser.newContext();
  const secondPage = await second.newPage();
  await secondPage.goto('/notes/chun-ri-shan-chuang/');
  await expect(secondPage.locator('[data-reading-list-count]').first()).toHaveText('0');

  await first.close();
  await second.close();
});
