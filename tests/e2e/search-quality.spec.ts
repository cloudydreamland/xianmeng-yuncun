import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

test('搜索只用正文匹配，不被相关推荐与区域归档污染', async ({ page }) => {
  await page.goto('/world/wind-valley/');
  await page.getByRole('button', { name: '搜索云村内容' }).click();
  await page.getByRole('button', { name: '文章', exact: true }).click();
  await page.getByRole('searchbox', { name: '搜索雲梦世界内容' }).fill('BERT');

  const dialog = page.getByRole('dialog', { name: '云镜检索' });
  await expect(dialog.getByText('找到 1 处相关内容')).toBeVisible();
  await expect(dialog.locator('.search-result')).toHaveCount(1);
  await expect(dialog.getByRole('link', { name: /NLP算法岗八股文/ })).toBeVisible();
});

test('搜索只保留四个任务分类并把课程章节归组显示', async ({ page }) => {
  await page.goto('/world/wind-valley/');
  await page.getByRole('button', { name: '搜索云村内容' }).click();
  const dialog = page.getByRole('dialog', { name: '云镜检索' });
  await expect(dialog.locator('.search-filters button')).toHaveCount(5);
  await expect(dialog.locator('.search-filters')).toContainText('文章');
  await expect(dialog.locator('.search-filters')).toContainText('学习');
  await expect(dialog.locator('.search-filters')).toContainText('项目');
  await expect(dialog.locator('.search-filters')).toContainText('其他');

  await page.getByRole('searchbox', { name: '搜索雲梦世界内容' }).fill('Transformer');
  await expect(dialog.getByRole('heading', { name: /大模型学习路线/ })).toBeVisible();
  await expect(dialog.getByText(/课程章节已归入同组/)).toBeVisible();
});

test('手机地图的七个地点入口均满足最小触控尺寸', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const markers = page.locator('.world-marker');
  await expect(markers).toHaveCount(7);
  for (let index = 0; index < await markers.count(); index += 1) {
    const box = await markers.nth(index).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});
