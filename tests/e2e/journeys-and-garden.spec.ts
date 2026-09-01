import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true');
  });
});

test('云游路线记录本地足迹并提供继续入口', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('yuncun:trail:v1'));
  await page.reload();
  await page.getByRole('link', { name: '从全境地图进入云中书页' }).click();
  await page.getByRole('link', { name: '查看云游路线 →' }).click();
  const guide = page.locator('[data-journey-guide]');
  await expect(guide.locator('[data-journey-card]')).toHaveCount(3);
  await expect(guide.getByText('尚未启程 · 0/4').first()).toBeVisible();

  await page.goto('/about');
  await page.goto('/journeys/');
  const firstJourney = page.locator('[data-journey-card]').first();
  await expect(firstJourney.getByText('已走 1 站 · 1/4')).toBeVisible();
  await expect(firstJourney.getByRole('link', { name: '继续上次云游 →' })).toHaveAttribute('href', '/projects/yuncun-blog/');
  await expect(page.locator('[data-trail-list]').getByRole('link', { name: '个人主页' })).toBeVisible();
});

test('雲梦世界项目展示结构化案例证据', async ({ page }) => {
  await page.goto('/projects/yuncun-blog/');
  const caseStudy = page.locator('.project-case-study');
  await expect(caseStudy.getByRole('heading', { name: '这项工作如何被做出来' })).toBeVisible();
  await expect(caseStudy.getByText('独立完成产品定位、视觉设计、内容建模、前端开发与质量验证')).toBeVisible();
  await expect(caseStudy.getByText('关键取舍')).toBeVisible();
  await expect(caseStudy.getByText('复盘结论')).toBeVisible();
});

test('星渊注意力实验计算六个词的归一化权重', async ({ page }) => {
  await page.goto('/world/star-abyss/');
  await page.getByRole('tab', { name: /术法试验/ }).click();
  const lab = page.locator('[data-attention-lab]');
  await expect(lab.getByRole('heading', { name: /一句话里的目光/ })).toBeVisible();
  const progressbars = lab.getByRole('progressbar');
  await expect(progressbars).toHaveCount(6);
  const values = await progressbars.evaluateAll((items) => items.map((item) => Number(item.getAttribute('aria-valuenow'))));
  expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 0);
  await lab.getByRole('button', { name: '记' }).click();
  await expect(lab.locator('[data-attention-summary]')).toContainText('以“记”为查询');
});

test('风谷笔记区分作者引路与反向回望', async ({ page }) => {
  await page.goto('/notes/yuncun-august-maintenance-retrospective/');
  await expect(page.getByRole('heading', { name: '这篇笔记通向哪里' })).toBeVisible();
  await expect(page.locator('.related-notes').getByText('引路', { exact: true }).first()).toBeVisible();

  await page.goto('/notes/xiang-mu-fu-pan-fang-fa/');
  await expect(page.locator('.related-notes').getByText('回望', { exact: true })).toBeVisible();
});
