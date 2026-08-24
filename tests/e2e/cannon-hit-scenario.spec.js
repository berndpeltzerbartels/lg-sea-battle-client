import { expect, test } from '@playwright/test';

const CANNON_HULL_SCENARIO = `
scenario: playwright-cannon-hull-hit
version: 9303
cell: 40
map:
.......
.1...2.
.......
objects:
1: ship, light, bot [orientation: 90°, speed: 0knt]
2: ship, dark, bot [orientation: 270°, speed: 0knt]
actions:
1: cannon at [x: 80, y: 0.42, z: 0]
`;

const CANNON_TARGET = { x: 80, y: 0.42, z: 0 };

test('real player cannon can sink a ship with a visible hull-height side hit', async ({ page, request }, testInfo) => {
  await ensureLoggedIn(page);
  await resetScenario(request, CANNON_HULL_SCENARIO);

  await page.goto('/app?scenarioTest=1');
  await expect(page.locator('#renderCanvas')).toBeVisible();
  await expect(page.locator('.login-card')).toHaveCount(0);
  await page.waitForFunction(() => window.seaBattleScenarioTest && document.body.dataset.playerShipId !== 'pending');

  await page.screenshot({
    path: testInfo.outputPath('cannon-hull-before.png'),
    fullPage: false
  });

  const shot = await page.evaluate((target) => window.seaBattleScenarioTest.fireCannonAt(target), CANNON_TARGET);
  expect(shot.fire).toBe('ok');
  expect(Math.abs(shot.aim.miss)).toBeLessThan(0.08);
  await page.waitForFunction(() => document.body.dataset.cannonFireSync === 'ok');

  for (let frame = 0; frame < 8; frame += 1) {
    await page.screenshot({
      path: testInfo.outputPath(`cannon-hull-${String(frame).padStart(2, '0')}.png`),
      fullPage: false
    });
    await page.waitForTimeout(160);
  }

  await expect.poll(async () => {
    const response = await request.get('/game/state');
    const state = await response.json();
    return state.ships.find((ship) => ship.id === 'dark-S2')?.state ?? 'missing';
  }, {
    timeout: 5_000,
    message: 'dark-S2 should sink after the real cannon shot crosses the visible hull'
  }).toBe('sunk');
});

async function ensureLoggedIn(page) {
  await page.goto('/app?scenarioTest=1');
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

async function resetScenario(request, scenario) {
  const reset = await request.post('/game/test-scenario', {
    data: {
      adminKey: 'bernd',
      scenario
    }
  });
  if (!reset.ok()) {
    throw new Error(`Scenario reset failed ${reset.status()}: ${await reset.text()}`);
  }
}
