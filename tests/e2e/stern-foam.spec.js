import { test, expect } from '@playwright/test';

test('bounded stern foam renders from the flak and fades after stopping', async ({ page }) => {
  test.setTimeout(45000);
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&viewDistance=32&viewYaw=160&viewHeight=3.2');
  await page.waitForFunction(()=>window.seaBattleScenarioTest);
  const foam=await page.evaluate(()=>window.seaBattleScenarioTest.previewSternFoamForTest());
  expect(foam.active).toBeGreaterThan(30);
  expect(foam.active).toBeLessThanOrEqual(foam.capacity);
  expect(foam.capacity).toBe(144);
  await page.screenshot({path:'/tmp/seabattle-stern-foam-orbit.png'});
  await page.locator('[data-camera-mode="gunner"]').click();
  await page.evaluate(()=>window.seaBattleScenarioTest.previewSternFoamForTest());
  await page.screenshot({path:'/tmp/seabattle-stern-foam-flak.png'});
  await expect.poll(()=>page.evaluate(()=>window.seaBattleScenarioTest.sternFoamForTest().active),{timeout:12000}).toBe(0);
  const budget=await page.evaluate(()=>window.seaBattleScenarioTest.benchmarkSternFoamForTest());
  console.log('STERN FOAM CPU',JSON.stringify(budget));
  expect(budget.meshDelta).toBe(0);
  expect(budget.activePatches).toBeLessThanOrEqual(40*144);
  expect(errors).toEqual([]);
});
