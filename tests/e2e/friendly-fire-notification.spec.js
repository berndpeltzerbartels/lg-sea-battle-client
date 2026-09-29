import { test, expect } from '@playwright/test';

test('own fleet ship and aircraft kills show warnings without marking enemy or unknown teams', async ({ page }, testInfo) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  // The model sandbox hides the player/kill panel; reveal it for this presentation test.
  await page.addStyleTag({ content: '.player-list { display: block !important; }' });
  const deliver = async (vehicleType, teamId, id) => page.evaluate(({ vehicleType, teamId, id }) => {
    window.seaBattleScenarioTest.crewKillSnapshot({
      ships: [
        { id: 'own', controlledBy: 'player-CAP-1', teamId: 'light', vehicleType: 'torpedo-boat', state: 'active' },
        { id: 'target', controlledBy: 'player-ANNA-2', teamId, vehicleType, state: 'active' }
      ],
      flakHits: id ? [{ id, shipId: 'own', targetShipId: 'target', t: 123 }] : []
    }, 'own');
  }, { vehicleType, teamId, id });
  await deliver('torpedo-boat', 'light');
  const toast = page.locator('#crewKillSuccess');
  for (const [type, label] of [['torpedo-boat', 'Schiff'], ['scout-plane', 'Flugzeug']]) {
    await deliver(type, 'light', `flak-friendly-${type}`);
    await expect(toast).toBeVisible();
    await expect(toast).toHaveClass(/is-friendly-fire/);
    await expect(toast).toContainText(`Eigene Flotte: ${label} ANNA zerstört`);
    const row = page.locator('.kill-feed-row').first();
    await expect(row.locator('.kill-feed-warning')).toBeVisible();
    await expect(row).toContainText('Eigene Flotte');
  }
  await page.screenshot({ path: testInfo.outputPath('friendly-aircraft-warning.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: testInfo.outputPath('friendly-aircraft-warning-mobile.png') });
  for (const [team, id] of [['dark', 'enemy'], [null, 'unknown']]) {
    await deliver('scout-plane', team, `flak-${id}`);
    await expect(toast).not.toHaveClass(/is-friendly-fire/);
    await expect(toast).toHaveText('Flugzeug ANNA zerstört · Flak');
    await expect(page.locator('.kill-feed-row').first().locator('.kill-feed-warning')).toHaveCount(0);
  }
});
