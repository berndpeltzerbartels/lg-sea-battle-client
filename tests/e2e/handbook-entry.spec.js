import { test, expect } from '@playwright/test';

test('handbook is accessible before playing and follows the chosen ship', async ({ page }) => {
  await page.goto('/start.html');
  const vehicle = page.locator('#vehicleType');
  await expect(vehicle).toBeVisible();
  const guide = page.locator('#vehicleGuide');
  await expect(guide).toHaveAttribute('href', '/sea-battle/handbuch/torpedoboot/index.html');
  await expect(guide).toHaveAttribute('target', '_blank');
  await vehicle.selectOption('submarine');
  await expect(guide).toHaveText('U-Boot kennenlernen ↗');
  await expect(guide).toHaveAttribute('href', '/sea-battle/handbuch/u-boot/index.html');
  await vehicle.selectOption('torpedo-boat');
  await expect(guide).toHaveText('Torpedoboot kennenlernen ↗');
  await page.goto('/start.html?mode=crew');
  await expect(page.getByRole('link', { name: 'Torpedoboot kennenlernen' })).toBeVisible();
  await page.goto('/portal.html');
  await expect(page.getByRole('link', { name: 'Spielanleitung öffnen' })).toHaveAttribute('href', '/sea-battle/handbuch/index.html');
  await page.goto('/sea-battle/handbuch/index.html');
  await expect(page.getByRole('heading', { name: 'Welches Schiff ist deins?' })).toBeVisible();
  await expect(page.locator('a[href="torpedoboot/index.html"]')).toBeVisible();
  await expect(page.locator('a[href="u-boot/index.html"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
