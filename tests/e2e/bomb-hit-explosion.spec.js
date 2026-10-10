import { test, expect } from '@playwright/test';

for (const targetShipId of ['torpedo-boat', 'submarine']) {
  test(`confirmed bomb hit on ${targetShipId} renders larger visible effects after a predicted splash`, async ({ page }, testInfo) => {
    await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&viewMode=orbit&viewDistance=55&viewHeight=28&viewYaw=155');
    await page.waitForFunction(() => window.seaBattleScenarioTest);
    const render = (impacts = [], predictedIds = []) => page.evaluate(
      ({ impacts, predictedIds }) => window.seaBattleScenarioTest.bombImpactEffectsForTest(impacts, predictedIds),
      { impacts, predictedIds });
    const base = { x: -12, z: 8, heading: 0, t: 1 };
    const misses = await render([{ ...base, id: 'miss', reason: 'sea-hit' }]);
    const walls = effects => effects.filter(effect => effect.name.startsWith('torpedo_hit_wall_'));
    expect(walls(misses)).toHaveLength(5);
    const previousNames = new Set(misses.map(effect => effect.name));
    const hit = { ...base, id: 'confirmed', reason: 'ship-hit', targetShipId, t: 2 };
    const all = await render([hit], [hit.id]);
    const strong = all.filter(effect => !previousNames.has(effect.name));
    expect(walls(strong)).toHaveLength(5);
    walls(strong).forEach((wall, index) => {
      expect(wall.width / walls(misses)[index].width).toBeCloseTo(1.8, 4);
      expect(wall.height / walls(misses)[index].height).toBeCloseTo(1.8, 4);
      expect(wall.lifetime).toBeGreaterThan(walls(misses)[index].lifetime);
      expect(wall.enabled).toBe(true);
    });
    const strongNames = new Set(strong.map(effect => effect.name));
    await page.waitForTimeout(150);
    const animated = (await render([hit])).filter(effect => strongNames.has(effect.name));
    expect(walls(animated)).toHaveLength(5);
    expect(walls(animated).every(effect => effect.age > 0 && effect.visibility > 0)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('confirmed-bomb-hit.png') });
    // Repeated snapshots must not restart the explosion; a new hit must still produce one.
    await expect.poll(async () => (await render([hit])).filter(effect => strongNames.has(effect.name)).length,
      { timeout: 6000 }).toBe(0);
    const second = await render([{ ...hit, id: 'second-hit', t: 3 }]);
    expect(walls(second)).toHaveLength(5);
    expect(walls(second)[0].height).toBeCloseTo(walls(strong)[0].height, 4);
  });
}
