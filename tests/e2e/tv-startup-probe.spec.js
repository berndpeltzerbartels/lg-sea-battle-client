import { test, expect } from '@playwright/test';

test('TV probe advances through isolated imports and then starts the actual game', async ({ page }) => {
  test.setTimeout(60000);
  const checkpoints = [];
  await page.route('**/game/client-error', route => {
    const report = route.request().postDataJSON();
    checkpoints.push(report);
    return route.fulfill({ status: 204 });
  });
  await page.goto('/sea-battle/index.html?setup=8&vehicle=submarine&scenarioTest=1&tv-diagnostic=1');
  await expect.poll(() => checkpoints.some(r => r.message === 'Spielinitialisierung abgeschlossen'), { timeout: 45000 }).toBe(true);
  expect(checkpoints.filter(r => r.type === 'diagnostic-checkpoint').map(r => r.message)).toEqual([
    'Browser ohne Spiel und Babylon', 'Einfaches Spielmodul laden', 'Einfaches Spielmodul erfolgreich',
    'Babylon-Mathematik laden', 'Babylon-Mathematik erfolgreich', 'Babylon-Grafikmodule laden',
    'Babylon-Grafikmodule erfolgreich', 'Vollständiges Spiel starten', 'Spielinitialisierung abgeschlossen'
  ]);
  expect(checkpoints.some(r => r.type !== 'diagnostic-checkpoint')).toBe(false);
  expect(checkpoints.at(-1).stack).toContain('resource loaded');
  await expect(page.locator('#tvDiagnosticStatus')).toHaveCount(0);
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  expect(await page.evaluate(() => document.body.dataset.startupError)).toBeUndefined();
});
