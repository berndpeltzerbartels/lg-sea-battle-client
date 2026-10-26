import { test, expect } from '@playwright/test';

test('impact families play once, prioritize own hits, and remain within the voice budget', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const state = () => page.evaluate(() => window.seaBattleScenarioTest.explosionAudioForTest());
  await expect.poll(async () => (await state())?.loaded, { timeout: 10000 }).toBe(true);
  const result = await page.evaluate(() => {
    const t = window.seaBattleScenarioTest;
    const hit = (id, fields = {}) => ({ id, x: 0, z: 5, t: 10, ...fields });
    const snapshot = { instanceId: 'audio', t: 10,
      flakHits: [hit('flak-1', { targetShipId: 'own' }), hit('cannon-1', { targetShipId: 'enemy' })],
      flakImpacts: [hit('flak-1', { reason: 'ship-hit' }), hit('cannon-water', { reason: 'sea-hit' })],
      torpedoImpacts: [hit('torpedo-1', { reason: 'ship-hit', targetShipId: 'own' })],
      bombImpacts: [hit('bomb-1', { reason: 'sea-hit' })],
      depthCharges: [hit('depth-1', { exploded: true, explodesAt: 10 })] };
    const initial = t.explosionAudioForTest(snapshot, 'own').voices;
    const repeated = t.explosionAudioForTest(snapshot, 'own').voices;
    const more = { instanceId: 'audio', t: 10, torpedoImpacts:
      Array.from({ length: 30 }, (_, i) => hit(`more-${i}`, { reason: 'ship-hit' })) };
    return { initial, repeated, capped: t.explosionAudioForTest(more, 'own').voices };
  });
  expect(result).toEqual({ initial: 6, repeated: 6, capped: 8 });
  await expect.poll(async () => (await state()).voices, { timeout: 13000 }).toBe(0);
  expect(errors).toEqual([]);
});


test('the delayed aircraft explosion starts its sound with the visual effect', async ({ page }) => {
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const state = () => page.evaluate(() => window.seaBattleScenarioTest.explosionAudioForTest());
  await expect.poll(async () => (await state())?.loaded).toBe(true);
  await page.evaluate(() => window.seaBattleScenarioTest.scoutPlaneExplosionSequenceForTest());
  expect((await state()).voices).toBe(0);
  await expect.poll(async () => (await state()).voices).toBe(1);
});
