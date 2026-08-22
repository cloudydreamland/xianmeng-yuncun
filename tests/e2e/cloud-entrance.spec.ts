import { expect, test } from '@playwright/test';

test('首次进入先加载关键资源，完成后由用户点击入境', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const entrance = page.locator('[data-cloud-entrance]');
  const progress = entrance.getByRole('progressbar');
  const enter = entrance.getByRole('button', { name: '入境' });

  await expect(entrance).toBeVisible();
  await expect(progress).toBeVisible();
  await expect(enter).toBeHidden();
  await expect(enter).toBeVisible({ timeout: 8_000 });
  await expect(progress).toHaveAttribute('aria-valuenow', '100');
  await expect(entrance.getByText('云门开，山河现', { exact: true })).toBeVisible();

  await enter.click();
  await expect(entrance).toBeHidden();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('yuncun-entered'))).toBe('true');

  await page.reload();
  await expect(entrance).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: '在七境之间，记录学习、造物与日常。' })).toBeVisible();
});
