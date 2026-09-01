import { expect, test } from '@playwright/test';

test('桌宠停用后不挂载界面，也不请求模型或动作资源', async ({ page }) => {
  const petRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/yunling/') || url.includes('/images/pet/')) petRequests.push(url);
  });

  await page.addInitScript(() => window.sessionStorage.setItem('yuncun-test-skip-entrance', 'true'));
  await page.goto('/');

  await expect(page.locator('.yunling-pet')).toHaveCount(0);
  await expect(page.locator('.yunling-pet-restore')).toHaveCount(0);
  await expect(page.locator('canvas.yunling-pet__canvas')).toHaveCount(0);
  expect(petRequests).toEqual([]);
});
