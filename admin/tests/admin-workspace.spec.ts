import { expect, test, type Page } from '@playwright/test';

const apiHeaders = { 'access-control-allow-origin': '*', 'cache-control': 'private, no-store', 'content-type': 'application/json' };

async function mockPrivateCloud(page: Page) {
  await page.route('**/api/session', (route) => route.fulfill({ headers: apiHeaders, body: JSON.stringify({ email: 'ad***@example.com' }) }));
  await page.route('**/api/records**', async (route) => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON() as { kind: string; data: Record<string, unknown> };
      await route.fulfill({ status: 201, headers: apiHeaders, body: JSON.stringify({ record: { id: `${input.kind}:test`, ...input, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null } }) });
      return;
    }
    await route.fulfill({ headers: apiHeaders, body: JSON.stringify({ records: [] }) });
  });
}

test.beforeEach(async ({ page }) => { await mockPrivateCloud(page); });

test('管理员工作台在桌面和 390px 手机上保持无横向溢出', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '我的工作台' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  }
});

test('私人计划明确保存至云端且页面禁止索引', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow,noarchive');
  await page.getByRole('button', { name: '私人计划' }).click();
  await page.getByLabel('计划名称').fill('整理私人计划');
  await page.getByRole('button', { name: '保存到云端' }).click();
  await expect(page.getByRole('status')).toContainText('已保存到私人云端');
  const oldPrivateKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('yuncun-life-') || key === 'yuncun-local-plans-v1'));
  expect(oldPrivateKeys).toEqual([]);
});

test('数据页提供备份、迁移与 30 天回收站', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '数据与备份' }).click();
  await expect(page.getByRole('heading', { name: '迁移、备份与回收站' })).toBeVisible();
  await expect(page.getByRole('link', { name: '导出 JSON 备份' })).toHaveAttribute('href', '/api/export');
  await expect(page.getByRole('heading', { name: '回收站 · 30 天' })).toBeVisible();
});
