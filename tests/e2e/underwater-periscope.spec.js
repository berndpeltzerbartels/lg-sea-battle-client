import { test, expect } from '@playwright/test';

test('both underwater periscopes show a lower aiming window and alignment keeps depth', async ({ page }, testInfo) => {
  await page.goto('/sea-battle/?setup=8&vehicle=submarine&hide-beach=1&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  await page.waitForTimeout(4000);
  await page.keyboard.press('1');
  await expect(page.locator('.torpedo-scope-line-center')).toBeVisible();
  const gradient = await page.locator('.torpedo-scope-line-center').evaluate(el => getComputedStyle(el).backgroundImage);
  expect(gradient).toContain('73%');
  await page.screenshot({ path: testInfo.outputPath('forward-underwater.png') });
  await page.keyboard.press('2');
  await expect(page.locator('.observation-scope-reticle-line-vertical')).toBeVisible();
  expect(await page.locator('.observation-periscope-glass').evaluate(el => getComputedStyle(el).getPropertyValue('--observation-reticle-top-y').trim())).toBe('43%');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(800);
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: testInfo.outputPath('observation-underwater.png') });
  await page.keyboard.press('3');
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => document.body.dataset.playerDepthState)).toBe('submerged');
  await expect(page.locator('.torpedo-scope-line-center')).toBeVisible();
});
