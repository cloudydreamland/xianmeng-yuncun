import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-entered', 'true'));
});

test('灯巷按公开作品状态展示画廊或酝酿说明', async ({ page }) => {
  await page.goto('/world/lantern-lane/');
  const cards = page.locator('[data-work-card]');

  if (await cards.count() === 0) {
    await expect(page.locator('.gallery-archive')).toHaveCount(0);
    await expect(page.getByText('设定已开放 · 功能酝酿中').first()).toBeVisible();
  } else {
    await expect(cards).toHaveCount(2);
    await expect(page.getByText('已开放').first()).toBeVisible();
  }
});

test('公开作品支持 URL 筛选、详情页和键盘灯箱', async ({ page }) => {
  await page.goto('/world/lantern-lane/');
  const cards = page.locator('[data-work-card]');
  test.skip(await cards.count() === 0, '没有公开作品时跳过画廊交互');

  const category = await cards.first().getAttribute('data-category');
  await page.getByRole('button', { name: category || '' }).click();
  await expect(page).toHaveURL(new RegExp(`category=${encodeURIComponent(category || '')}`));
  await cards.first().getByRole('link', { name: /查看作品/ }).click();

  const firstImage = page.locator('[data-gallery-open]').first();
  await firstImage.click();
  await expect(page.locator('.gallery-lightbox')).toHaveAttribute('open', '');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('.gallery-lightbox')).not.toHaveAttribute('open', '');
  await expect(firstImage).toBeFocused();
});

test('作品搜索在有公开作品时返回真实详情', async ({ page }) => {
  await page.goto('/world/lantern-lane/');
  const firstCard = page.locator('[data-work-card]').first();
  test.skip(await firstCard.count() === 0, '没有公开作品时跳过作品搜索');
  const title = (await firstCard.locator('h3').innerText()).trim();

  await page.getByRole('button', { name: /搜索|云镜/ }).first().click();
  await page.getByRole('button', { name: '作品', exact: true }).click();
  await page.getByRole('searchbox').fill(title);
  await expect(page.locator('.search-result').filter({ hasText: title })).toBeVisible();
});

test('草稿作品不进入静态详情、RSS 或 Sitemap', async ({ request }) => {
  const worksDir = join(process.cwd(), 'src', 'content', 'works');
  const drafts = existsSync(worksDir)
    ? readdirSync(worksDir).filter((name) => /\.mdx?$/.test(name)).map((name) => ({ name, text: readFileSync(join(worksDir, name), 'utf8') })).filter(({ text }) => /^draft:\s*true\s*$/m.test(text))
    : [];

  const [rss, sitemap] = await Promise.all([request.get('/rss.xml'), request.get('/sitemap-0.xml')]);
  const rssText = await rss.text();
  const sitemapText = await sitemap.text();
  for (const draft of drafts) {
    const slug = draft.text.match(/^slug:\s*([^\s]+)\s*$/m)?.[1];
    if (!slug) continue;
    expect(existsSync(join(process.cwd(), 'dist', 'world', 'lantern-lane', slug, 'index.html'))).toBeFalsy();
    expect(rssText).not.toContain(`/world/lantern-lane/${slug}/`);
    expect(sitemapText).not.toContain(`/world/lantern-lane/${slug}/`);
  }
});
