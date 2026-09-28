import { test, expect } from '@playwright/test';

test('crew sees only its own ship kills, including human alias, once per event', async ({ browser }, testInfo) => {
  const pages = await Promise.all([browser.newPage(), browser.newPage(), browser.newPage()]);
  const ships = [
    { id: 'our-ship', controlledBy: 'player-CAP-123', teamId: 'light', vehicleType: 'torpedo-boat', state: 'active' },
    { id: 'target', controlledBy: 'player-ANNA-456', teamId: 'dark', vehicleType: 'submarine', state: 'active' }
  ];
  const deliver = async (page, shipId, id) => page.evaluate(({ ships, shipId, id }) => {
    window.seaBattleScenarioTest.crewKillSnapshot({ ships, flakHits: id ? [{
      id, shipId, targetShipId: 'target', t: 123
    }] : [] }, 'our-ship');
  }, { ships, shipId, id });
  for (const [index, page] of pages.entries()) {
    await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
    await page.waitForFunction(() => window.seaBattleScenarioTest);
    await page.evaluate(station => window.seaBattleScenarioTest.setStation(station), ['bridge', 'flak', 'cannon'][index]);
    await deliver(page);
    await deliver(page, 'other-ship', 'flak-other');
    await expect(page.locator('#crewKillSuccess')).toBeHidden();
    await deliver(page, 'our-ship', 'cannon-own');
    await expect(page.locator('#crewKillSuccess')).toHaveText('U-Boot ANNA zerstört · Kanone');
    await expect(page.locator('#crewKillSuccess')).toBeVisible();
    await expect(page.locator('#crewKillSuccess')).toHaveCSS('pointer-events', 'none');
    const unobscured = await page.locator('#crewKillSuccess').evaluate(element => {
      const rect = element.getBoundingClientRect();
      element.style.pointerEvents = 'auto';
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      element.style.pointerEvents = '';
      return top === element;
    });
    expect(unobscured).toBe(true);
  }
  await pages[0].screenshot({ path: testInfo.outputPath('crew-success.png') });
  for (const page of pages) {
    await expect(page.locator('#crewKillSuccess')).toBeHidden({ timeout: 8000 });
    await deliver(page, 'our-ship', 'cannon-own');
    await expect(page.locator('#crewKillSuccess')).toBeHidden();
    await deliver(page, 'our-ship', 'flak-own-second');
    await expect(page.locator('#crewKillSuccess')).toHaveText('U-Boot ANNA zerstört · Flak');
    await expect(page.locator('#crewKillSuccess')).toBeVisible();
    await page.close();
  }
});
