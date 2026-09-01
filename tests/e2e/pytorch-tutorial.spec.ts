import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
});

test('教程首页展示十二章、74节并可搜索知识点', async ({ page }) => {
  await page.goto('/learn/pytorch/');
  await expect(page.getByRole('heading', { name: 'PyTorch 从零到大模型工程', level: 1 })).toBeVisible();
  await expect(page.locator('.course-map > div > a')).toHaveCount(12);
  await expect(page.locator('.course-home__header dt').filter({ hasText: /^74$/ })).toBeVisible();
  await page.getByRole('searchbox', { name: '搜索74节PyTorch课程' }).fill('KV Cache');
  const result = page.locator('[data-course-results] a').filter({ hasText: 'KV Cache' });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/learn\/pytorch\/mini-llm-project\/#.+/);
  await expect(page.locator('.course-prose h2').filter({ hasText: 'KV Cache 为什么能加速解码' })).toBeInViewport();
});

test('Transformer 章节目录、代码和相邻章节导航可用', async ({ page }) => {
  await page.goto('/learn/pytorch/transformer-from-scratch/');
  await expect(page.locator('.course-prose h2')).toHaveCount(8);
  await expect(page.locator('.course-prose pre code').first()).toBeVisible();
  await expect(page.locator('.course-directory nav').first().locator('a')).toHaveCount(12);
  await expect(page.getByRole('link', { name: /下一章.*稳定训练/ })).toBeVisible();
  const lessonLink = page.locator('.course-directory__lessons a').nth(1);
  await lessonLink.focus();
  await lessonLink.press('Enter');
  await expect(lessonLink).toHaveAttribute('aria-current', 'location');
});

test('课程支持运行标记、代码复制下载、练习答案和本机进度', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/learn/pytorch/transformer-from-scratch/');
  await expect(page.locator('.lesson-runtime').first()).toContainText(/可独立运行|承接上一节|需要 CUDA|需要多卡|接口示意/);
  await expect(page.locator('.lesson-answer').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '复制代码' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '下载 .py' }).first()).toBeVisible();
  const complete = page.locator('.lesson-complete-toggle').first();
  await complete.click();
  await expect(complete).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-course-completion]')).toContainText('1 / 8');
  await page.goto('/learn/pytorch/');
  await expect(page.locator('[data-course-progress-text]')).toContainText('已完成 1 / 74 节');
  await expect(page.locator('[data-course-continue]')).toHaveAttribute('href', /transformer-from-scratch/);
});

test('章末小测、项目下载和面经联动可访问', async ({ page }) => {
  await page.goto('/learn/pytorch/transformer-from-scratch/');
  await expect(page.getByRole('heading', { name: '小测、项目与相关面试题' })).toBeVisible();
  await expect(page.locator('.course-practice__quiz details')).toHaveCount(2);
  await expect(page.getByRole('link', { name: /面经/ })).toHaveAttribute('href', /\/interview\/llm\//);
  await page.goto('/learn/pytorch/mini-llm-project/');
  await expect(page.getByRole('link', { name: /下载迷你中文语言模型/ })).toHaveAttribute('href', '/downloads/pytorch-course/mini-lm-project.zip');
});

test('手机端目录可触控且长代码不产生页面级溢出', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/learn/pytorch/distributed/');
  const directory = page.locator('.course-mobile-directory');
  await expect(directory).toBeVisible();
  await directory.locator('summary').click();
  await expect(directory.getByRole('link', { name: /方向实战/ })).toBeVisible();
  const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  await expect.poll(() => directory.locator('summary').evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
});

test('课程首页与正文在 360、768、1440 三档宽度均不溢出', async ({ page }) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/learn/pytorch/', '/learn/pytorch/transformer-from-scratch/']) {
      await page.goto(path);
      const sizes = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(sizes.scroll, `${path} @ ${width}px`).toBeLessThanOrEqual(sizes.client + 1);
    }
  }
});

test('禁用 JavaScript 后正文、目录和下载入口仍可阅读', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/learn/pytorch/mini-llm-project/');
  await expect(page.locator('.course-prose h2')).toHaveCount(7);
  await expect(page.locator('.course-directory__lessons a')).toHaveCount(7);
  await expect(page.getByRole('link', { name: /下载迷你中文语言模型/ })).toBeVisible();
  await context.close();
});

test('全站云镜可以按教程筛选正文', async ({ page }) => {
  await page.goto('/learn/pytorch/performance/');
  await page.getByRole('button', { name: '搜索云村内容' }).click();
  await page.getByRole('button', { name: '教程', exact: true }).click();
  await page.getByRole('searchbox', { name: '搜索雲梦世界内容' }).fill('activation checkpoint');
  const dialog = page.getByRole('dialog', { name: '云镜检索' });
  await expect(dialog.locator('.search-result').filter({ hasText: '性能与显存' }).first()).toBeVisible();
});
