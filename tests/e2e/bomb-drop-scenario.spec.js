import { expect, test } from '@playwright/test';

const BOMB_DROP_SCENARIO = `
scenario: playwright-bomb-drop
version: 9301
cell: 40
map:
.....
..1..
.....
..2..
.....
objects:
1: plane, light, human [orientation: 0°, speed: 30knt, height: 150m]
2: ship, dark, human [orientation: 180°, speed: 0knt]
`;

test('bomb drop scenario can be observed as screenshot series', async ({ page, request }, testInfo) => {
  await ensureLoggedIn(page);

  const reset = await request.post('/game/test-scenario', {
    data: {
      adminKey: 'bernd',
      scenario: BOMB_DROP_SCENARIO
    }
  });
  if (!reset.ok()) {
    throw new Error(`Scenario reset failed ${reset.status()}: ${await reset.text()}`);
  }

  await page.goto('/app?scenarioTest=1&vehicle=scout-plane');
  const loginCard = page.locator('.login-card');
  if (await loginCard.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await loginCard.locator('input[name="nickname"]').fill('Playwright');
    await loginCard.locator('input[name="alias"]').fill('PWT');
    const email = loginCard.locator('input[name="email"]');
    if (await email.count()) {
      await email.fill('playwright@example.test');
    }
    await loginCard.locator('select[name="team"]').selectOption('light');
    await loginCard.locator('button[type="submit"]').click();
  }

  await expect(page.locator('#renderCanvas')).toBeVisible();
  await expect(page.locator('.login-card')).toHaveCount(0);
  await page.waitForFunction(() => window.seaBattleScenarioTest && document.body.dataset.scenarioTest === 'ready');
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({
    x: 0,
    y: 150,
    z: -40,
    heading: 0,
    speed: 30,
    verticalSpeed: 0,
    engineOrder: 7
  }));
  const drop = await page.evaluate(() => window.seaBattleScenarioTest.dropBomb());
  expect(drop.drop, drop.error).toBe('ok');
  await page.waitForFunction(() => window.seaBattleScenarioTest.bombVisuals().some((bomb) => bomb.shooterId === 'light-F1'), null, { timeout: 4_000 });

  const firstBomb = await page.evaluate(() => {
    const plane = window.seaBattleScenarioTest.vehicleVisual('light-F1');
    const bomb = window.seaBattleScenarioTest.bombVisuals()
      .filter((candidate) => candidate.shooterId === 'light-F1')
      .sort((a, b) => (a.age ?? 99) - (b.age ?? 99))[0];
    return { plane, bomb };
  });
  expect(firstBomb.plane, 'bot plane should be visible in Babylon').toBeTruthy();
  expect(firstBomb.bomb, 'bot bomb should be visible in Babylon').toBeTruthy();
  expect(firstBomb.bomb.snapshotLaunchY, 'server launch height should be present').not.toBeNull();
  expect(firstBomb.bomb.startY, 'visible bomb must start from the server launch height').toBeCloseTo(firstBomb.bomb.snapshotLaunchY, 1);
  expect(firstBomb.bomb.startY, 'visible bomb must not start above the plane').toBeLessThanOrEqual(firstBomb.plane.y + 0.5);
  expect(firstBomb.bomb.startY, 'visible bomb must start near the plane, not hundreds of meters below it').toBeGreaterThan(firstBomb.plane.y - 4);

  for (let frame = 0; frame < 12; frame += 1) {
    const abovePlaneBombs = await page.evaluate(() => {
      const plane = window.seaBattleScenarioTest.vehicleVisual('light-F1');
      if (!plane) return [];
      return window.seaBattleScenarioTest.bombVisuals()
        .filter((bomb) => bomb.shooterId === 'light-F1' && bomb.y > plane.y + 0.5);
    });
    expect(abovePlaneBombs, `no visible bomb may appear above the plane in frame ${frame}`).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`bomb-drop-${String(frame).padStart(2, '0')}.png`),
      fullPage: false
    });
    await page.waitForTimeout(250);
  }
});

async function ensureLoggedIn(page) {
  await page.goto('/app?scenarioTest=1&vehicle=scout-plane');
  const loginCard = page.locator('.login-card');
  if (!(await loginCard.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }

  await loginCard.locator('input[name="nickname"]').fill('Playwright');
  await loginCard.locator('input[name="alias"]').fill('PWT');
  const email = loginCard.locator('input[name="email"]');
  if (await email.count()) {
    await email.fill('playwright@example.test');
  }
  await loginCard.locator('select[name="team"]').selectOption('light');
  await loginCard.locator('button[type="submit"]').click();
  await expect(loginCard).toHaveCount(0);
}
