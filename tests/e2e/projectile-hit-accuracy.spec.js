import { expect, test } from '@playwright/test';

test.setTimeout(300_000);

const runExtendedProjectileTests = process.env.SEA_BATTLE_PROJECTILE_EXTENDED === '1';
const extendedTest = runExtendedProjectileTests ? test : test.skip;

let loginCounter = 0;

const CANNON_HULL_HIT_SCENARIO = `
scenario: playwright-projectile-cannon-hull
version: 9401
cell: 30
map:
.......
.1...2.
.......
objects:
1: ship, light, bot [orientation: 90°, speed: 0knt]
2: ship, dark, scenario [orientation: 270°, speed: 0knt]
`;

const CANNON_SIDE_GRID_SCENARIO = `
scenario: playwright-projectile-cannon-side-grid
version: 9411
cell: 12
map:
.........
.1..2....
.........
objects:
1: ship, light, bot [orientation: 90°, speed: 0knt]
2: ship, dark, scenario [orientation: 0°, speed: 0knt]
`;

const FLAK_PLANE_HIT_SCENARIO = `
scenario: playwright-projectile-flak-plane
version: 9402
cell: 30
map:
.......
...2...
...1...
.......
objects:
1: ship, light, bot [orientation: 0°, speed: 0knt]
2: plane, dark, scenario [orientation: 180°, speed: 0knt, height: 24m]
`;

const CANNON_PLANE_HIT_SCENARIO = `
scenario: playwright-projectile-cannon-plane
version: 9412
cell: 12
map:
.........
.1....2..
.........
objects:
1: ship, light, bot [orientation: 90°, speed: 0knt]
2: plane, dark, scenario [orientation: 180°, speed: 0knt, height: 16m]
`;

const TORPEDO_HULL_HIT_SCENARIO = `
scenario: playwright-projectile-torpedo-hull
version: 9403
cell: 10
map:
.........
.1....2..
.........
objects:
1: ship, light, bot [orientation: 90°, speed: 0knt]
2: ship, dark, scenario [orientation: 270°, speed: 0knt]
`;

test('cannon hull-height shot hits the visible side of a ship', async ({ page, request }, testInfo) => {
  await openScenario(page, request, CANNON_HULL_HIT_SCENARIO, testInfo);
  await captureFrames(page, testInfo, 'cannon-before', 1, 0);

  const target = await targetPoint(request, 'dark-S2', { y: 0.42 });
  const shot = await page.evaluate((point) => window.seaBattleScenarioTest.fireCannonAt(point), target);
  expect(shot.fire).toBe('ok');
  expect(Math.abs(shot.aim.miss)).toBeLessThan(0.08);
  await page.waitForFunction(() => document.body.dataset.cannonFireSync === 'ok');
  await captureFrames(page, testInfo, 'cannon-flight', 10, 140);

  await expectVehicleState(request, 'dark-S2', 'sunk', 'cannon hull hit should sink dark-S2');
});

extendedTest('cannon side-hit matrix covers the visible hull instead of only a single point', async ({ page, request }, testInfo) => {
  const forwardOffsets = [-2.6, -1.3, 0, 1.3, 2.6];
  const heights = [0.16, 0.28, 0.4, 0.55, 0.7];
  const misses = [];

  for (const y of heights) {
    for (const forward of forwardOffsets) {
      await openScenario(page, request, CANNON_SIDE_GRID_SCENARIO, testInfo);
      const target = await targetPoint(request, 'dark-S2', {
        localX: -0.66,
        localZ: forward,
        y
      });
      const shot = await fireWeaponAt(page, 'cannon', target);
      await captureFrames(page, testInfo, `cannon-side-y${formatGridValue(y)}-z${formatGridValue(forward)}`, 4, 120);

      const scenarioState = await waitForVehicleStateSnapshot(request, 'dark-S2', 2_000);
      const state = scenarioState.ships.find((ship) => ship.id === 'dark-S2')?.state ?? 'missing';
      if (shot.fire !== 'ok' || Math.abs(shot.aim?.miss ?? 99) >= 0.1 || state !== 'sunk') {
        misses.push({
          forward,
          y,
          fire: shot.fire,
          aimMiss: shot.aim?.miss,
          state,
          projectileCount: scenarioState.flakProjectiles?.length ?? 0,
          recentImpacts: scenarioState.flakImpacts?.slice(-3) ?? [],
          recentHits: scenarioState.flakHits?.slice(-3) ?? []
        });
      }
    }
  }

  expect(misses, `Missed cannon side-grid points:\n${JSON.stringify(misses, null, 2)}`).toEqual([]);
});

test('flak can hit planes from different plane headings', async ({ page, request }, testInfo) => {
  for (const heading of [0, 90, 180, 270]) {
    const scenario = FLAK_PLANE_HIT_SCENARIO.replace('orientation: 180°', `orientation: ${heading}°`);
    await openScenario(page, request, scenario, testInfo);

    const target = await targetPoint(request, 'dark-F2', { y: 24 });
    const shot = await fireFlakBurstAt(page, target, 6);
    expect(shot.fired).toBeGreaterThan(0);
    await captureFrames(page, testInfo, `flak-plane-${heading}`, 8, 120);

    await expectVehicleState(request, 'dark-F2', 'sunk', `flak should hit dark-F2 at heading ${heading}`);
  }
});

extendedTest('flak plane-hit matrix is visible and works from several plane headings', async ({ page, request }, testInfo) => {
  const samples = [
    { heading: 0, localX: 0, localZ: 0, yOffset: 0, expected: 'sunk', label: 'center' },
    { heading: 90, localX: -2.4, localZ: 0, yOffset: 0, expected: 'sunk', label: 'left-wing' },
    { heading: 180, localX: 1.6, localZ: 0, yOffset: 0, expected: 'sunk', label: 'right-wing-inner' },
    { heading: 270, localX: 0, localZ: 2.0, yOffset: 0, expected: 'sunk', label: 'nose' },
    { heading: 0, localX: -7.2, localZ: 0, yOffset: 0, expected: 'active', label: 'left-clear' },
    { heading: 180, localX: 7.2, localZ: 0, yOffset: 0, expected: 'active', label: 'right-clear' }
  ];
  const mismatches = [];

  for (const sample of samples) {
    const scenario = FLAK_PLANE_HIT_SCENARIO.replace('orientation: 180°', `orientation: ${sample.heading}°`);
    await openScenario(page, request, scenario, testInfo);
    const target = await targetPoint(request, 'dark-F2', {
      localX: sample.localX,
      localZ: sample.localZ,
      yOffset: sample.yOffset
    });
    const shot = sample.expected === 'sunk'
      ? await fireFlakBurstAt(page, target, 6)
      : await fireWeaponAt(page, 'flak', target);
    await captureFrames(page, testInfo, `flak-${sample.label}-${sample.heading}`, 5, 120);

    const state = await vehicleState(request, 'dark-F2', 2_500);
    if (shot.fire !== 'ok' || state !== sample.expected) {
      mismatches.push({
        ...sample,
        fire: shot.fire,
        aimMiss: shot.aim?.miss,
        state
      });
    }
  }

  expect(mismatches, `Unexpected flak plane-grid results:\n${JSON.stringify(mismatches, null, 2)}`).toEqual([]);
});

extendedTest('cannon plane-hit matrix separates real aircraft hits from shots under and above the plane', async ({ page, request }, testInfo) => {
  const samples = [
    { heading: 0, yOffset: 0, expected: 'sunk', label: 'center-h0' },
    { heading: 90, yOffset: 0, expected: 'sunk', label: 'center-h90' },
    { heading: 180, yOffset: 0, expected: 'sunk', label: 'center-h180' },
    { heading: 270, yOffset: 0, expected: 'sunk', label: 'center-h270' },
    { heading: 0, yOffset: -10, expected: 'active', label: 'below-h0' },
    { heading: 90, yOffset: -10, expected: 'active', label: 'below-h90' },
    { heading: 180, yOffset: 10, expected: 'active', label: 'above-h180' },
    { heading: 270, yOffset: 10, expected: 'active', label: 'above-h270' }
  ];
  const mismatches = [];

  for (const sample of samples) {
    const scenario = CANNON_PLANE_HIT_SCENARIO.replace('orientation: 180°', `orientation: ${sample.heading}°`);
    await openScenario(page, request, scenario, testInfo);
    const target = await targetPoint(request, 'dark-F2', { yOffset: sample.yOffset });
    const shot = await fireWeaponAt(page, 'cannon', target);
    await captureFrames(page, testInfo, `cannon-plane-${sample.label}`, 6, 120);

    const state = await vehicleState(request, 'dark-F2', 3_000);
    const aimMismatch = sample.expected === 'sunk' && Math.abs(shot.aim?.miss ?? 99) >= 0.12;
    if (shot.fire !== 'ok' || aimMismatch || state !== sample.expected) {
      mismatches.push({
        ...sample,
        fire: shot.fire,
        aimMiss: shot.aim?.miss,
        state
      });
    }
  }

  expect(mismatches, `Unexpected cannon plane-grid results:\n${JSON.stringify(mismatches, null, 2)}`).toEqual([]);
});

test('torpedo fired from the player ship hits a ship directly ahead', async ({ page, request }, testInfo) => {
  await openScenario(page, request, TORPEDO_HULL_HIT_SCENARIO, testInfo);
  await captureFrames(page, testInfo, 'torpedo-before', 1, 0);

  const fire = await page.evaluate(() => window.seaBattleScenarioTest.fireTorpedo());
  expect(fire.fire).toBe('ok');
  await page.waitForFunction(() => Number(document.body.dataset.serverTorpedoes ?? 0) > 0);
  await captureFrames(page, testInfo, 'torpedo-run', 16, 220);

  await expectVehicleState(request, 'dark-S2', 'sunk', 'torpedo should sink dark-S2');
});

async function openScenario(page, request, scenario, testInfo) {
  await page.goto('/start.html');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await resetScenario(request, scenario);
  await ensureLoggedIn(page, testInfo);

  await page.goto('/app?scenarioTest=1');
  await expect(page.locator('#renderCanvas')).toBeVisible();
  await expect(page.locator('.login-card')).toHaveCount(0);
  await page.waitForFunction(() => window.seaBattleScenarioTest && document.body.dataset.playerShipId !== 'pending');
}

async function ensureLoggedIn(page, testInfo) {
  await page.goto('/app?scenarioTest=1');
  const loginCard = page.locator('.login-card');
  if (!(await loginCard.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }

  const alias = testAlias(testInfo);
  await loginCard.locator('input[name="nickname"]').fill(`Playwright ${alias}`);
  await loginCard.locator('input[name="alias"]').fill(alias);
  const email = loginCard.locator('input[name="email"]');
  if (await email.count()) {
    await email.fill(`${alias.toLowerCase()}@playwright.test`);
  }
  await loginCard.locator('select[name="team"]').selectOption('light');
  await loginCard.locator('button[type="submit"]').click();
  await expect(loginCard).toHaveCount(0);
}

function testAlias(testInfo) {
  const serial = (loginCounter % 1296).toString(36).padStart(2, '0').toUpperCase();
  loginCounter += 1;
  return `P${String(testInfo.workerIndex).slice(-1)}${String(testInfo.retry).slice(-1)}${serial}`;
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

async function fireWeaponAt(page, weapon, target) {
  const result = await page.evaluate(({ weapon, target }) => {
    if (weapon === 'cannon') {
      return window.seaBattleScenarioTest.fireCannonAt(target);
    }
    if (weapon === 'flak') {
      return window.seaBattleScenarioTest.fireFlakAt(target);
    }
    throw new Error(`Unknown weapon: ${weapon}`);
  }, { weapon, target });
  if (weapon === 'cannon') {
    await page.waitForFunction(() => document.body.dataset.cannonFireSync === 'ok', { timeout: 5_000 }).catch(() => {});
  } else {
    await page.waitForFunction(() => document.body.dataset.flakFireSync === 'ok', { timeout: 5_000 }).catch(() => {});
  }
  return result;
}

async function fireFlakBurstAt(page, target, shots) {
  let lastResult = null;
  let fired = 0;
  for (let attempt = 0; attempt < shots * 3 && fired < shots; attempt += 1) {
    lastResult = await fireWeaponAt(page, 'flak', target);
    if (lastResult.fire === 'ok') {
      fired += 1;
    }
    if (fired < shots) {
      await page.waitForTimeout(120);
    }
  }
  return { ...lastResult, fired };
}

async function targetPoint(request, vehicleId, override = {}) {
  const state = await gameState(request);
  const vehicle = state.ships.find((ship) => ship.id === vehicleId);
  if (!vehicle) {
    throw new Error(`Vehicle not found in scenario: ${vehicleId}`);
  }
  const localX = Number(override.localX ?? 0);
  const localZ = Number(override.localZ ?? 0);
  const heading = Number(vehicle.heading ?? 0);
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  return {
    x: vehicle.x + rightX * localX + forwardX * localZ,
    y: override.y ?? (vehicle.y ?? 0) + Number(override.yOffset ?? 0),
    z: vehicle.z + rightZ * localX + forwardZ * localZ
  };
}

async function expectVehicleState(request, vehicleId, expectedState, message) {
  await expect.poll(async () => {
    const state = await gameState(request);
    return state.ships.find((ship) => ship.id === vehicleId)?.state ?? 'missing';
  }, {
    timeout: 8_000,
    message
  }).toBe(expectedState);
}

async function vehicleState(request, vehicleId, timeoutMs) {
  const state = await waitForVehicleStateSnapshot(request, vehicleId, timeoutMs);
  return state.ships.find((ship) => ship.id === vehicleId)?.state ?? 'missing';
}

async function waitForVehicleStateSnapshot(request, vehicleId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot = null;
  while (Date.now() < deadline) {
    const state = await gameState(request);
    lastSnapshot = state;
    const vehicleState = state.ships.find((ship) => ship.id === vehicleId)?.state ?? 'missing';
    if (vehicleState === 'sunk') {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return lastSnapshot ?? await gameState(request);
}

async function gameState(request) {
  const response = await request.get('/game/state');
  if (!response.ok()) {
    throw new Error(`Game state failed ${response.status()}: ${await response.text()}`);
  }
  return response.json();
}

async function captureFrames(page, testInfo, prefix, count, delayMs) {
  for (let frame = 0; frame < count; frame += 1) {
    const path = testInfo.outputPath(`${prefix}-${String(frame).padStart(2, '0')}.png`);
    await page.screenshot({ path, fullPage: false });
    await testInfo.attach(`${prefix}-${String(frame).padStart(2, '0')}`, {
      path,
      contentType: 'image/png'
    });
    if (delayMs > 0) {
      await page.waitForTimeout(delayMs);
    }
  }
}

function formatGridValue(value) {
  return String(Math.round(value * 100)).replace('-', 'm');
}
