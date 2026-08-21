import { expect, test } from '@playwright/test';

const regions = [
  ['cloud-village', 'village'],
  ['rain-bridge', 'rain'],
  ['star-abyss', 'star'],
  ['wind-valley', 'wind'],
  ['moon-pool', 'moon'],
  ['snow-cliff', 'snow'],
  ['lantern-lane', 'lantern'],
] as const;

for (const [slug, theme] of regions) {
  test(`${slug} mounts its own pointer effect`, async ({ page }) => {
    await page.goto(`/world/${slug}/`);
    const stage = page.locator(`[data-pointer-effect="${theme}"]`);
    await expect(stage).toHaveCount(1);
    await expect(stage.locator('canvas')).toHaveCount(1);
    await expect(stage).toHaveAttribute('data-pointer-ready', 'true');
  });
}

test('pointer effects do not enable when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/world/star-abyss/');
  await expect(page.locator('[data-pointer-effect="star"]')).toHaveCount(0);
  await expect(page.locator('.region-canvas-atmosphere__art')).toHaveCount(1);
});
