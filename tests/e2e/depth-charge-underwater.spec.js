import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 800 }, { width: 844, height: 390 }]) {
  test(`underwater depth charges sink and burst at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
    await page.waitForFunction(() => window.seaBattleScenarioTest);
    const initial = await page.evaluate(() => window.seaBattleScenarioTest.underwaterChargesForTest('sink'));
    await page.waitForTimeout(700);
    const sunk = await page.evaluate(() => window.seaBattleScenarioTest.underwaterChargesForTest());
    expect(sunk.charges[0].y).toBeLessThan(initial.charges[0].y);
    await page.screenshot({ path: testInfo.outputPath('sinking-underwater.png') });
    const beforePixels = await page.evaluate(() => window.seaBattleScenarioTest.underwaterChargePixelsForTest());
    await page.evaluate(() => window.seaBattleScenarioTest.underwaterChargesForTest('explode'));
    await page.waitForTimeout(450);
    const blast = await page.evaluate(() => window.seaBattleScenarioTest.underwaterChargesForTest());
    expect(blast.blasts).toHaveLength(1);
    expect(blast.blasts[0].y).toBeLessThan(-1);
    const blastPixels = await page.evaluate(() => window.seaBattleScenarioTest.underwaterChargePixelsForTest());
    expect(blastPixels).toBeGreaterThan(beforePixels + 500);
    await page.screenshot({ path: testInfo.outputPath('underwater-explosion.png') });
    await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.underwaterChargesForTest().blasts.length)).toBe(0);
    expect(errors).toEqual([]);
  });
}
