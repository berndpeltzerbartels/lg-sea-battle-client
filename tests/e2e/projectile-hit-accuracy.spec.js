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

const FLAK_FAST_BOAT_SCENARIO = `
scenario: playwright-projectile-flak-fast-boat
version: 9413
cell: 30
map:
.......
.1.....
...2...
.......
objects:
1: ship, light, bot [orientation: 90°, speed: 0knt]
2: ship, dark, scenario [orientation: 270°, speed: 0knt]
`;

const FLAK_ASTERN_BOAT_SCENARIO = `
scenario: playwright-projectile-flak-astern-boat
version: 9414
cell: 30
map:
.......
...2...
...1...
.......
objects:
1: ship, light, bot [orientation: 0°, speed: 0knt]
2: ship, dark, scenario [orientation: 180°, speed: 0knt]
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

const CANNON_OWN_SHIP_LINE_SCENARIO = `
scenario: playwright-cannon-own-ship-line
version: 9417
cell: 30
map:
.......
...2...
...1...
.......
objects:
1: ship, light, bot [orientation: 0°, speed: 0knt]
2: ship, dark, scenario [orientation: 180°, speed: 0knt]
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

const REMOTE_TORPEDO_MUZZLE_SMOKE_SCENARIO = `
scenario: playwright-remote-torpedo-muzzle-smoke
version: 9418
cell: 30
map:
.......
.1..2..
.......
objects:
1: ship, light, bot [orientation: 90°, speed: 0knt]
2: ship, dark, bot [orientation: 270°, speed: 0knt]
`;

const AIR_TORPEDO_DROP_SCENARIO = `
scenario: playwright-air-torpedo-drop
version: 9415
cell: 40
map:
........
..1.....
........
objects:
1: plane, light, bot [orientation: 90°, speed: 30knt, height: 160m]
`;

const PLANE_BOMB_VISUAL_SCENARIO = `
scenario: playwright-plane-bomb-visual
version: 9416
cell: 40
map:
.......
...1...
.......
objects:
1: plane, light, bot [orientation: 0°, speed: 30knt, height: 85m]
`;

const BOT_PLANE_BOMB_VISUAL_SCENARIO = `
scenario: playwright-bot-plane-bomb-visual
version: 9417
cell: 40
map:
.......
...2...
.......
...1...
.......
objects:
1: ship, light, bot [orientation: 180°, speed: 0knt]
2: plane, dark, bot [orientation: 0°, speed: 30knt, height: 110m]
`;

test('cannon hull-height shot hits the visible side of a ship', async ({ page, request }, testInfo) => {
  await openScenario(page, request, CANNON_HULL_HIT_SCENARIO, testInfo);
  await captureFrames(page, testInfo, 'cannon-before', 1, 0);

  const target = await targetPoint(request, 'dark-S2', { y: 0.42 });
  const shot = await page.evaluate((point) => window.seaBattleScenarioTest.fireCannonAt(point), target);
  expect(shot.fire).toBe('ok');
  expect(Math.abs(shot.aim.miss)).toBeLessThan(0.08);
  await page.waitForFunction(() => document.body.dataset.cannonFireSync === 'ok');
  await page.waitForFunction(() => window.seaBattleScenarioTest.vehicleVisual('dark-S2')?.visualState === 'ship-cannon-hit');
  const impact = await page.evaluate(() => window.seaBattleScenarioTest.vehicleVisual('dark-S2'));
  const hitState = await gameState(request);
  const targetShip = hitState.ships.find((ship) => ship.id === 'dark-S2');
  const cannonHit = hitState.flakHits?.find((hit) => hit.targetShipId === 'dark-S2' && String(hit.id).startsWith('cannon-'));
  expect(targetShip, 'target ship should still be visible while the cannon effect starts').toBeTruthy();
  expect(cannonHit, 'server should expose the cannon hit position').toBeTruthy();
  expect(Math.abs(impact.roll), 'cannon ship hit should explode before visible sinking roll takes over').toBeLessThan(0.16);
  expect(impact.damageAnchor, 'cannon hit should expose the ship-bound explosion anchor').not.toBeNull();
  expect(
    distance3d(impact.damageAnchor, cannonHit),
    `cannon explosion should use the server hit point, got ${JSON.stringify({ anchor: impact.damageAnchor, cannonHit })}`
  ).toBeLessThan(0.85);
  expect(
    Math.abs(impact.damageAnchor.worldY - cannonHit.y),
    `cannon explosion should stay near the hit height, got ${JSON.stringify({ anchor: impact.damageAnchor, cannonHit })}`
  ).toBeLessThan(0.3);
  await expectVehicleState(request, 'dark-S2', 'sunk', 'cannon hull hit should sink dark-S2');
  await captureFrames(page, testInfo, 'cannon-flight', 8, 120);

  await page.waitForFunction(() => {
    const visual = window.seaBattleScenarioTest.vehicleVisual('dark-S2');
    return visual?.visualState === 'sinking' || visual?.visualState === 'sunk';
  }, null, { timeout: 4_000 });
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

    const shot = await fireFlakTrackingBurstAtVehicle(page, request, 'dark-F2', { y: 24 }, 6);
    expect(shot.fired).toBeGreaterThan(0);
    await captureFrames(page, testInfo, `flak-plane-${heading}`, 8, 120);

    await expectVehicleState(request, 'dark-F2', 'sunk', `flak should hit dark-F2 at heading ${heading}`);
  }
});

test('weapon view and projectile start stay on the visible weapon with and without trim', async ({ page, request }, testInfo) => {
  const navigationStates = [
    { label: 'standing', speed: 0, engineOrder: 2 },
    { label: 'flank-trim', speed: 15.5, engineOrder: 8 }
  ];

  for (const navigationState of navigationStates) {
    await openScenario(page, request, FLAK_FAST_BOAT_SCENARIO, testInfo);
    await page.evaluate(({ speed, engineOrder }) => window.seaBattleScenarioTest.setPlayerNavigationState({
      heading: Math.PI / 2,
      speed,
      engineOrder
    }), navigationState);
    await page.waitForTimeout(250);
    const target = await targetPoint(request, 'dark-S2', { y: 0.42 });

    for (const weapon of ['flak', 'cannon']) {
      await page.evaluate(({ selectedWeapon, target }) => {
        if (selectedWeapon === 'flak') {
          return window.seaBattleScenarioTest.aimFlakAt(target);
        }
        return window.seaBattleScenarioTest.aimCannonAt(target);
      }, { selectedWeapon: weapon, target });
      const alignment = await page.evaluate((selectedWeapon) => (
        window.seaBattleScenarioTest.weaponViewAlignment(selectedWeapon)
      ), weapon);
      await captureFrames(page, testInfo, `${weapon}-view-alignment-${navigationState.label}`, 1, 0);

      expect(alignment, `${weapon} alignment should be available while ${navigationState.label}`).toBeTruthy();
      expect(alignment.directionAngle, `${weapon} shot should follow the sight direction while ${navigationState.label}`).toBeLessThan(0.002);
      expect(alignment.muzzleAhead, `${weapon} muzzle should be in front of the shooter camera while ${navigationState.label}`).toBeGreaterThan(0);
      expect(alignment.muzzleDistanceFromSightLine, `${weapon} muzzle should stay close to the sight line while ${navigationState.label}`).toBeLessThan(0.5);
      expect(alignment.visibleMuzzleDistance, `${weapon} projectile should start at the visible muzzle while ${navigationState.label}`).toBeLessThan(0.025);
      expect(alignment.projectileStartDistance, `${weapon} projectile should start just beyond the muzzle while ${navigationState.label}`).toBeLessThan(0.15);
      expect(alignment.visibleProjectileStartDistance, `${weapon} projectile start should stay attached to the visible muzzle while ${navigationState.label}`).toBeLessThan(0.16);
    }
  }
});

test('cannon fire is blocked by the actual own-ship shot line instead of fixed yaw limits', async ({ page, request }, testInfo) => {
  await openScenario(page, request, CANNON_OWN_SHIP_LINE_SCENARIO, testInfo);

  const blocked = await page.evaluate(() => window.seaBattleScenarioTest.cannonShotLineAt({
    yaw: Math.PI,
    pitch: 0.02
  }));
  expect(blocked.blocked).toBe(true);

  const clear = await page.evaluate(() => window.seaBattleScenarioTest.cannonShotLineAt({
    yaw: Math.PI,
    pitch: 0.48
  }));
  expect(clear.blocked).toBe(false);
  expect(Math.abs(Math.abs(clear.yaw) - Math.PI)).toBeLessThan(0.04);
  expect(clear.shot.direction.z).toBeLessThan(-0.7);
  expect(clear.shot.direction.y).toBeGreaterThan(0.16);
});

test('cannon own-ship safety uses narrow superstructure instead of broad bases', async ({ page, request }, testInfo) => {
  await openScenario(page, request, CANNON_OWN_SHIP_LINE_SCENARIO, testInfo);

  const lowerBridgeBase = await page.evaluate(() => window.seaBattleScenarioTest.cannonShotLineAtLocalTarget({
    x: 0.2,
    y: 0.92,
    z: 0.72
  }));
  const upperPortBridgeGap = await page.evaluate(() => window.seaBattleScenarioTest.cannonShotLineAtLocalTarget({
    x: 0.47,
    y: 1.3,
    z: 0.72
  }));
  const upperStarboardBridgeGap = await page.evaluate(() => window.seaBattleScenarioTest.cannonShotLineAtLocalTarget({
    x: -0.47,
    y: 1.3,
    z: 0.72
  }));

  expect(lowerBridgeBase.blocked, `bridge base material should block, blocker=${lowerBridgeBase.blocker}`).toBe(true);
  expect(upperPortBridgeGap.blocked, `port upper bridge gap should be clear, blocker=${upperPortBridgeGap.blocker}`).toBe(false);
  expect(upperStarboardBridgeGap.blocked, `starboard upper bridge gap should be clear, blocker=${upperStarboardBridgeGap.blocker}`).toBe(false);
});

test('flak own-ship safety allows low water shots beside the boat', async ({ page, request }, testInfo) => {
  await openScenario(page, request, CANNON_OWN_SHIP_LINE_SCENARIO, testInfo);

  const portWater = await page.evaluate(() => window.seaBattleScenarioTest.flakShotLineAt({
    yaw: -Math.PI / 2,
    pitch: -0.12
  }));
  const starboardWater = await page.evaluate(() => window.seaBattleScenarioTest.flakShotLineAt({
    yaw: Math.PI / 2,
    pitch: -0.12
  }));
  const throughShip = await page.evaluate(() => window.seaBattleScenarioTest.flakShotLineAt({
    yaw: 0,
    pitch: -0.08
  }));

  expect(portWater.blocked, `port water shot should be clear, blocker=${portWater.blocker}`).toBe(false);
  expect(starboardWater.blocked, `starboard water shot should be clear, blocker=${starboardWater.blocker}`).toBe(false);
  expect(portWater.shot.direction.y).toBeLessThan(0);
  expect(starboardWater.shot.direction.y).toBeLessThan(0);
  expect(throughShip.blocked, 'flak should still block a real shot through the own boat').toBe(true);
});

test('flak own-ship safety still blocks the funnel base as real material', async ({ page, request }, testInfo) => {
  await openScenario(page, request, CANNON_OWN_SHIP_LINE_SCENARIO, testInfo);

  const throughFunnelBase = await page.evaluate(() => window.seaBattleScenarioTest.flakShotLineAtLocalTarget({
    x: 0,
    y: 0.92,
    z: -0.5
  }));

  expect(throughFunnelBase.blocked, `funnel base should block flak, blocker=${throughFunnelBase.blocker}`).toBe(true);
});

test('flak own-ship safety allows a tight shot just above the bridge', async ({ page, request }, testInfo) => {
  await openScenario(page, request, CANNON_OWN_SHIP_LINE_SCENARIO, testInfo);

  const justAboveBridge = await page.evaluate(() => window.seaBattleScenarioTest.flakShotLineAtLocalTarget({
    x: 0.36,
    y: 1.48,
    z: 0.72
  }));

  expect(justAboveBridge.blocked, `shot just above bridge should be clear, blocker=${justAboveBridge.blocker}`).toBe(false);
});

test('flak hull impacts do not sink a nearby ship when the own-ship shot line is clear', async ({ page, request }, testInfo) => {
  await openScenario(page, request, FLAK_FAST_BOAT_SCENARIO, testInfo);

  const target = await targetPoint(request, 'dark-S2', { y: 0.42 });
  const shot = await fireWeaponAt(page, 'flak', target);
  await captureFrames(page, testInfo, 'flak-clear-line-ship-hit', 8, 120);

  expect(shot.fire, `unexpected own-ship blocker: ${shot.blocker}`).toBe('ok');
  expect(Math.abs(shot.aim?.miss ?? 99)).toBeLessThan(0.08);
  await expectVehicleState(request, 'dark-S2', 'active', 'flak hull impacts should not sink dark-S2');
  const scenarioState = await gameState(request);
  expect(scenarioState.flakHits ?? []).toEqual([]);
});

test('flak critical ship hits burn before the ship starts sinking', async ({ page, request }, testInfo) => {
  await openScenario(page, request, FLAK_ASTERN_BOAT_SCENARIO, testInfo);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({
    heading: 0,
    speed: 0,
    engineOrder: 2
  }));

  const target = await targetPoint(request, 'dark-S2', { localZ: 2.4, y: 3.6 });
  const shot = await fireFlakBurstAt(page, target, 4);
  expect(shot.fire).toBe('ok');
  expect(Math.abs(shot.aim?.miss ?? 99)).toBeLessThan(0.08);

  await expectVehicleState(request, 'dark-S2', 'sunk', 'critical flak should still count as a ship kill on the server');
  await page.waitForFunction(() => window.seaBattleScenarioTest.vehicleVisual('dark-S2')?.visualState === 'ship-critical-hit');
  const early = await page.evaluate(() => window.seaBattleScenarioTest.vehicleVisual('dark-S2'));
  expect(early.roll, 'ship should not take immediate heavy list from a bridge hit').toBeLessThan(0.08);
  await page.waitForTimeout(800);
  const burning = await page.evaluate(() => window.seaBattleScenarioTest.vehicleVisual('dark-S2'));
  expect(burning.visualState).toBe('ship-critical-hit');
  expect(burning.roll, 'ship should burn upright before the delayed explosion').toBeLessThan(0.08);
  await captureFrames(page, testInfo, 'flak-critical-ship-burns-before-sinking', 4, 180);

  await page.waitForFunction(() => {
    const visual = window.seaBattleScenarioTest.vehicleVisual('dark-S2');
    return visual?.visualState === 'sinking' || visual?.visualState === 'sunk';
  }, null, { timeout: 5_000 });
  const sinkingStart = await page.evaluate(() => window.seaBattleScenarioTest.vehicleVisual('dark-S2'));
  expect(Math.abs(sinkingStart.roll), 'ship should start listing gently after a flak bridge kill').toBeLessThan(0.2);
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

test('cannon scout-plane kill appears in the kill feed as a plane target', async ({ page, request }, testInfo) => {
  await openScenario(page, request, CANNON_PLANE_HIT_SCENARIO, testInfo);
  const target = await targetPoint(request, 'dark-F2');
  const shot = await fireWeaponAt(page, 'cannon', target);

  expect(shot.fire).toBe('ok');
  await expectVehicleState(request, 'dark-F2', 'sunk', 'cannon should sink dark-F2');

  const firstKill = page.locator('.kill-feed-row').first();
  await expect(firstKill).toContainText('F 82');
  await expect(firstKill).toContainText('durch');
  await expect(firstKill).toContainText('Kanone');
  await expect(firstKill.locator('.kill-feed-party-target .unit-marker-plane')).toHaveCount(1);
});

test('flak scout-plane kill appears in the kill feed as a plane target', async ({ page, request }, testInfo) => {
  await openScenario(page, request, FLAK_PLANE_HIT_SCENARIO, testInfo);
  const shot = await fireFlakTrackingBurstAtVehicle(page, request, 'dark-F2', { y: 24 }, 6);

  expect(shot.fired).toBeGreaterThan(0);
  await expectVehicleState(request, 'dark-F2', 'sunk', 'flak should sink dark-F2');

  const firstKill = page.locator('.kill-feed-row').first();
  await expect(firstKill).toContainText('F 82');
  await expect(firstKill).toContainText('durch');
  await expect(firstKill).toContainText('Flak');
  await expect(firstKill.locator('.kill-feed-party-target .unit-marker-plane')).toHaveCount(1);
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

test('remote ship torpedo smoke starts at the tube instead of above the boat', async ({ page, request }, testInfo) => {
  await openScenario(page, request, REMOTE_TORPEDO_MUZZLE_SMOKE_SCENARIO, testInfo);

  await page.waitForFunction(() => (
    window.seaBattleScenarioTest.shipTorpedoMuzzleSmoke()
      .some((effect) => effect.mode === 'server-position')
  ), null, { timeout: 10_000 });

  const smoke = await page.evaluate(() => (
    window.seaBattleScenarioTest.shipTorpedoMuzzleSmoke()
      .filter((effect) => effect.mode === 'server-position')
  ));
  const launchHeights = smoke.map((effect) => effect.launchY);
  const offsets = smoke.map((effect) => effect.verticalOffset);
  const diameters = smoke.map((effect) => effect.diameter);
  const burstSpeeds = smoke.map((effect) => effect.burstSpeed);

  expect(smoke).toHaveLength(3);
  expect(Math.min(...launchHeights), `remote tube launch heights: ${JSON.stringify(launchHeights)}`).toBeGreaterThan(1.35);
  expect(Math.max(...launchHeights), `remote tube launch heights: ${JSON.stringify(launchHeights)}`).toBeLessThan(2.05);
  expect(Math.max(...offsets), `muzzle smoke should begin close to the tube: ${JSON.stringify(offsets)}`).toBeLessThan(0.18);
  expect(Math.min(...diameters), `muzzle smoke should be at least tube-sized: ${JSON.stringify(diameters)}`).toBeGreaterThan(0.42);
  expect(Math.min(...burstSpeeds), `muzzle smoke should leave the tube as a burst: ${JSON.stringify(burstSpeeds)}`).toBeGreaterThan(18);
});

test('air-dropped torpedo falls from plane height without snapping forward at water entry', async ({ page, request }, testInfo) => {
  await openScenario(page, request, AIR_TORPEDO_DROP_SCENARIO, testInfo, { vehicleType: 'scout-plane' });
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({
    x: 0,
    y: 160,
    z: 0,
    heading: Math.PI / 2,
    speed: 30,
    verticalSpeed: 0,
    engineOrder: 7
  }));

  const fire = await page.evaluate(() => window.seaBattleScenarioTest.fireTorpedo());
  expect(fire.fire).toBe('ok');
  await page.waitForFunction(() => window.seaBattleScenarioTest.airDropTorpedoVisuals().length > 0);

  const first = (await page.evaluate(() => window.seaBattleScenarioTest.airDropTorpedoVisuals()))[0];
  expect(first.startY).toBeGreaterThan(145);
  await captureFrames(page, testInfo, 'air-torpedo-drop', 6, 220);

  await page.waitForFunction(() => {
    const visual = window.seaBattleScenarioTest.airDropTorpedoVisuals()[0];
    return visual && visual.splashCreated;
  }, { timeout: 6_000 });
  const afterWater = (await page.evaluate(() => window.seaBattleScenarioTest.airDropTorpedoVisuals()))[0];

  expect(afterWater.waterEntryJump).toBeLessThan(8);
  expect(afterWater.runDistanceAtSplash).toBeLessThan(1);
});

test('plane bomb visuals stay below the dropping plane in external view', async ({ page, request }, testInfo) => {
  await openScenario(page, request, PLANE_BOMB_VISUAL_SCENARIO, testInfo, { vehicleType: 'scout-plane' });
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({
    y: 85,
    heading: 0,
    speed: 30,
    verticalSpeed: 0,
    engineOrder: 7
  }));

  const drop = await page.evaluate(() => window.seaBattleScenarioTest.dropBomb());
  expect(drop.drop).toBe('ok');
  await page.waitForFunction(() => window.seaBattleScenarioTest.bombVisuals()
    .some((bomb) => bomb.shooterId === 'light-F1'), null, { timeout: 8_000 });

  for (let frame = 0; frame < 10; frame += 1) {
    const abovePlaneBombs = await page.evaluate(() => {
      const plane = window.seaBattleScenarioTest.vehicleVisual('light-F1');
      if (!plane) return [{ reason: 'missing-plane' }];
      return window.seaBattleScenarioTest.bombVisuals()
        .filter((bomb) => bomb.shooterId === 'light-F1' && bomb.topY > plane.y + 0.5);
    });
    expect(abovePlaneBombs, `no bomb may render above the dropping plane in frame ${frame}`).toEqual([]);
    await captureFrames(page, testInfo, `bot-bomb-visual-${String(frame).padStart(2, '0')}`, 1, 140);
  }
});

test('bot plane bomb visuals stay below the visible dropping plane', async ({ page, request }, testInfo) => {
  await openScenario(page, request, BOT_PLANE_BOMB_VISUAL_SCENARIO, testInfo);

  await page.evaluate(() => {
    window.seaBattleScenarioTest.setEnemyVisualState('dark-F2', {
      x: 0,
      y: 106,
      z: -20,
      heading: 0,
      speed: 30
    });
    window.seaBattleScenarioTest.syncBombSnapshot({
      id: 'test-bot-bomb-1',
      teamId: 'dark',
      shipId: 'dark-F2',
      x: 0,
      y: 109.5,
      z: -18,
      launchX: 0,
      launchY: 109.5,
      launchZ: -20,
      heading: 0,
      speed: 30,
      droppedAt: 0
    });
  });

  for (let frame = 0; frame < 12; frame += 1) {
    const aboveVisiblePlaneBombs = await page.evaluate(() => {
      const plane = window.seaBattleScenarioTest.vehicleVisual('dark-F2');
      if (!plane) return [{ reason: 'missing-plane' }];
      return window.seaBattleScenarioTest.bombVisuals()
        .filter((bomb) => bomb.shooterId === 'dark-F2' && bomb.topY > plane.y + 0.5);
    });
    expect(aboveVisiblePlaneBombs, `no bot bomb may render above the visible plane in frame ${frame}`).toEqual([]);
    await captureFrames(page, testInfo, `bot-plane-bomb-visual-${String(frame).padStart(2, '0')}`, 1, 140);
  }
});

test('ship wake follows actual speed while the engine is stopped', async ({ page, request }, testInfo) => {
  await openScenario(page, request, TORPEDO_HULL_HIT_SCENARIO, testInfo);

  await page.evaluate(() => window.seaBattleScenarioTest.setEnemyWakeState('dark-S2', {
    speed: 0,
    engineOrder: 2
  }));
  await page.waitForTimeout(450);
  const stopped = await page.evaluate(() => window.seaBattleScenarioTest.enemyWakeSnapshot('dark-S2'));

  await page.evaluate(() => window.seaBattleScenarioTest.setEnemyWakeState('dark-S2', {
    speed: 2,
    engineOrder: 2
  }));
  await page.waitForTimeout(900);
  const slowCoasting = await page.evaluate(() => window.seaBattleScenarioTest.enemyWakeSnapshot('dark-S2'));
  await captureFrames(page, testInfo, 'wake-coasting-slow', 3, 160);

  await page.evaluate(() => window.seaBattleScenarioTest.setEnemyWakeState('dark-S2', {
    speed: 10,
    engineOrder: 2
  }));
  await page.waitForTimeout(900);
  const fastCoasting = await page.evaluate(() => window.seaBattleScenarioTest.enemyWakeSnapshot('dark-S2'));
  await captureFrames(page, testInfo, 'wake-coasting-fast', 3, 160);

  expect(stopped.strength).toBeLessThan(0.08);
  expect(slowCoasting.wakeEnabled).toBe(true);
  expect(slowCoasting.bowVisibility).toBeGreaterThan(0);
  expect(slowCoasting.sternEdgeVisibility).toBeGreaterThan(0);
  expect(slowCoasting.sternChurnVisibility).toBeGreaterThan(0);
  expect(fastCoasting.strength).toBeGreaterThan(slowCoasting.strength);
  expect(fastCoasting.bowVisibility).toBeGreaterThan(slowCoasting.bowVisibility);
  expect(fastCoasting.sternEdgeVisibility).toBeGreaterThan(slowCoasting.sternEdgeVisibility);
  expect(fastCoasting.sternChurnVisibility).toBeGreaterThan(slowCoasting.sternChurnVisibility);
});

test('server position correction does not leave wake on a stopped ship', async ({ page, request }, testInfo) => {
  await openScenario(page, request, TORPEDO_HULL_HIT_SCENARIO, testInfo);

  await page.evaluate(() => window.seaBattleScenarioTest.setEnemyServerWakeCorrectionState('dark-S2', {
    offset: 24
  }));
  await page.waitForTimeout(900);
  const corrected = await page.evaluate(() => window.seaBattleScenarioTest.enemyWakeSnapshot('dark-S2'));

  expect(corrected.speed).toBeLessThan(0.04);
  expect(corrected.serverSpeed).toBe(0);
  expect(corrected.strength).toBeLessThan(0.08);
  expect(corrected.wakeEnabled).toBe(false);
  expect(corrected.sternEdgeVisibility).toBe(0);
  expect(corrected.sternChurnVisibility).toBe(0);
});

async function openScenario(page, request, scenario, testInfo, options = {}) {
  await page.goto('/start.html');
  await page.evaluate((vehicleType) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    if (vehicleType) {
      window.localStorage.setItem('vehicleType', vehicleType);
    }
  }, options.vehicleType ?? null);
  await resetScenario(request, scenario);
  await ensureLoggedIn(page, testInfo, options);

  await page.goto(appScenarioTestUrl(options));
  await expect(page.locator('#renderCanvas')).toBeVisible();
  await expect(page.locator('.login-card')).toHaveCount(0);
  await page.waitForFunction(() => window.seaBattleScenarioTest && document.body.dataset.playerShipId !== 'pending');
}

function appScenarioTestUrl(options = {}) {
  const vehicleSuffix = options.vehicleType ? `&vehicle=${encodeURIComponent(options.vehicleType)}` : '';
  return `/app?scenarioTest=1${vehicleSuffix}`;
}

async function ensureLoggedIn(page, testInfo, options = {}) {
  await page.goto(appScenarioTestUrl(options));
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
  const vehicleType = loginCard.locator('input[name="vehicleType"]');
  if (options.vehicleType && await vehicleType.count()) {
    await vehicleType.evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, options.vehicleType);
  }
  await loginCard.locator('select[name="team"]').selectOption('light');
  await loginCard.locator('button[type="submit"]').click();
  await expect(loginCard).toHaveCount(0);
}

function testAlias(testInfo) {
  const seed = Date.now() + process.pid + testInfo.workerIndex * 997 + testInfo.retry * 37 + loginCounter;
  const serial = (seed % 1_679_616).toString(36).padStart(4, '0').toUpperCase();
  loginCounter += 1;
  return `P${serial}`;
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
  result.blocker = await page.evaluate(() => document.body.dataset.ownShotBlocker ?? '');
  if (result.fire !== 'ok') {
    return result;
  }
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

async function fireFlakTrackingBurstAtVehicle(page, request, vehicleId, targetOverride, shots) {
  let lastResult = null;
  let fired = 0;
  for (let attempt = 0; attempt < shots * 3 && fired < shots; attempt += 1) {
    const target = await targetPoint(request, vehicleId, targetOverride);
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
    try {
      await page.screenshot({ path, fullPage: false, timeout: 5_000 });
    } catch (error) {
      await testInfo.attach(`${prefix}-${String(frame).padStart(2, '0')}-screenshot-error`, {
        body: String(error?.message ?? error),
        contentType: 'text/plain'
      });
      return;
    }
    await testInfo.attach(`${prefix}-${String(frame).padStart(2, '0')}`, {
      path,
      contentType: 'image/png'
    });
    if (delayMs > 0) {
      await page.waitForTimeout(delayMs);
    }
  }
}

function distance3d(anchor, point) {
  const dx = Number(anchor.worldX ?? 0) - Number(point.x ?? 0);
  const dy = Number(anchor.worldY ?? 0) - Number(point.y ?? 0);
  const dz = Number(anchor.worldZ ?? 0) - Number(point.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function formatGridValue(value) {
  return String(Math.round(value * 100)).replace('-', 'm');
}
