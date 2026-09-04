import { expect, test } from "@playwright/test";

test("side-view sandbox can render the new submarine model", async ({ page }, testInfo) => {
  await page.goto("/sea-battle/?setup=8&vehicle=submarine&hide-beach=1&scenarioTest=1");
  await page.waitForFunction(() => (
    document.body.dataset.playerVehicle === "submarine"
    && Number(document.body.dataset.playerModelMeshes || 0) > 12
    && document.body.dataset.submarineFlak === "1"
  ));

  const submarineLaunch = await page.evaluate(() => window.seaBattleScenarioTest.playerTorpedoLaunchPreview("submarine"));
  const boatLaunch = await page.evaluate(() => window.seaBattleScenarioTest.playerTorpedoLaunchPreview("torpedo-boat"));
  expect(Math.abs(submarineLaunch[0].sideOffset)).toBeLessThan(Math.abs(boatLaunch[0].sideOffset));
  expect(submarineLaunch[0].startY).toBeLessThan(boatLaunch[0].startY);
  expect(submarineLaunch[0].waterStartZ).toBeGreaterThan(boatLaunch[0].waterStartZ);
  expect(submarineLaunch[0].runStartZ).toBeGreaterThan(submarineLaunch[0].waterStartZ);

  await expect(page.locator("#renderCanvas")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("submarine-model.png"), fullPage: true });
});

test("submarine cockpit exposes bridge and flak controls only", async ({ page }) => {
  test.setTimeout(45_000);

  await page.goto("/sea-battle/?setup=8&vehicle=submarine&hide-beach=1");
  await page.waitForFunction(() => document.body.dataset.playerVehicle === "submarine");

  await expect(page.locator("#bridgeViewButton")).toBeVisible();
  await expect(page.locator("#flakViewButton")).toBeVisible();
  await expect(page.locator("#cannonViewButton")).toBeHidden();
  await expect(page.locator("#torpedoAidButton")).toBeVisible();
  await expect(page.locator(".align-weapons-group")).toBeHidden();
  await expect(page.locator(".submarine-depth-actions")).toContainText("Auftauchen");
  await expect(page.locator(".submarine-depth-actions")).toContainText("Tauchen");
  await expect(page.locator(".submarine-depth-actions")).toContainText("Shift");
  await expect(page.locator("#torpedoAidButton")).toBeDisabled();
  await page.keyboard.press("T");
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("hidden");

  await page.keyboard.press("Shift+ArrowDown");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("periscope");
  await expect(page.locator("#depthValue")).toHaveText("Sehrohr");
  await expect(page.locator(".submarine-periscope-mode-panel").first()).toContainText("1");
  await expect(page.locator(".submarine-periscope-mode-panel").first()).toContainText("Fahrt");
  await expect(page.locator(".submarine-periscope-mode-panel").first()).toContainText("2");
  await expect(page.locator(".submarine-periscope-mode-panel").first()).toContainText("Zielen");
  await expect(page.locator(".submarine-periscope-mode-panel").first()).toContainText("3");
  await expect(page.locator(".submarine-periscope-mode-panel").first()).toContainText("360° Periskop");
  await expect(page.locator("#torpedoAidButton")).toBeEnabled();
  await expect(page.locator("#torpedoAidButton")).toContainText("Torpedo");
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("active");
  await expect.poll(() => page.evaluate(() => document.body.dataset.submarinePeriscopeMode)).toBe("drive");
  await expect(page.locator(".torpedo-scope-rudder-scale")).toContainText("Ruder");
  await expect(page.locator(".torpedo-scope-rudder-scale")).toContainText("S 35");
  await expect(page.locator(".torpedo-scope-rudder-scale")).toContainText("P 35");
  await page.keyboard.press("3");
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("hidden");
  await expect.poll(() => page.evaluate(() => document.body.dataset.observationPeriscope)).toBe("active");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("active");
  await page.keyboard.press("B");
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("active");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("periscope");
  await page.keyboard.press("Shift+ArrowUp");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("surface");

  await page.keyboard.press("F");
  await expect.poll(() => page.evaluate(() => document.body.dataset.flakView)).toBe("active");
  await page.keyboard.press("Shift+ArrowDown");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("periscope");
  await expect.poll(() => page.evaluate(() => document.body.dataset.flakView)).toBe("bridge");
  await expect(page.locator("#depthValue")).toHaveText("Sehrohr");
  await expect(page.locator("#torpedoAidButton")).toBeEnabled();
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("active");
  await page.keyboard.press("3");
  await expect.poll(() => page.evaluate(() => document.body.dataset.observationPeriscope)).toBe("active");
  await page.keyboard.press("Shift+ArrowUp");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("surface");
  await expect(page.locator("#torpedoAidButton")).toBeDisabled();
  await page.keyboard.press("Shift+ArrowDown");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("periscope");
  await page.keyboard.press("Shift+ArrowDown");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("submerged");
  await page.keyboard.press("Shift+ArrowUp");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("periscope");
  await page.keyboard.press("Shift+ArrowUp");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("surface");
  await expect.poll(() => page.evaluate(() => document.body.dataset.observationPeriscope)).toBe("hidden");

  await page.keyboard.press("F");
  await expect.poll(() => page.evaluate(() => document.body.dataset.flakView)).toBe("active");
  await page.locator("#bridgeViewButton").click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.flakView)).toBe("bridge");

  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("ArrowUp");
  }
  await page.waitForTimeout(12000);
  const speed = Number(await page.locator("#telegraphSpeedValue").textContent());
  expect(speed).toBeLessThanOrEqual(11.1);

  await page.keyboard.press("Shift+ArrowDown");
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("ArrowUp");
  }
  await page.waitForTimeout(12000);
  const periscopeSpeed = Number(await page.locator("#telegraphSpeedValue").textContent());
  expect(periscopeSpeed).toBeLessThanOrEqual(9.1);
});

test("remote submarine keeps its real flak visible and stows it while diving", async ({ page }) => {
  await page.goto("/sea-battle/?setup=8&vehicle=submarine&hide-beach=1&scenarioTest=1");
  await page.waitForFunction(() => (
    window.seaBattleScenarioTest
    && document.body.dataset.scenarioTest === "ready"
  ));

  const surfaced = await page.evaluate(() => window.seaBattleScenarioTest.createRemoteSubmarineForTest({
    id: "test-U1",
    depthState: "surface",
    x: 0,
    z: 22,
    heading: Math.PI
  }));
  expect(surfaced?.hasFlak).toBe(true);
  expect(surfaced.meshCount).toBeGreaterThan(4);
  expect(surfaced.enabledMeshCount).toBe(surfaced.meshCount);
  expect(surfaced.pitchDeg).toBeGreaterThan(10);
  expect(surfaced.pitchDeg).toBeLessThan(20);
  const periscopeMaterials = await page.evaluate(() => window.seaBattleScenarioTest.submarinePeriscopeMaterialsForTest());
  expect(periscopeMaterials).toHaveLength(2);
  expect(periscopeMaterials.every((entry) => entry.material.includes("_tower_material"))).toBe(true);

  const ownPeriscopeShotLine = await page.evaluate(() => (
    window.seaBattleScenarioTest.flakShotLineAtLocalTarget({ x: 0, y: 1.58, z: 0.02 })
  ));
  expect(ownPeriscopeShotLine.blocked).toBe(true);
  expect(ownPeriscopeShotLine.blocker).toContain("_periscope_");
  const ownSailShotLine = await page.evaluate(() => (
    window.seaBattleScenarioTest.flakShotLineAtLocalTarget({ x: 0, y: 0.95, z: 0.02 })
  ));
  expect(ownSailShotLine.blocked).toBe(true);

  const fire = await page.evaluate(() => window.seaBattleScenarioTest.syncRemoteFlakShotForTest("test-U1"));
  expect(fire.projectileCount).toBeGreaterThan(0);
  expect(fire.flashesAfter).toBeGreaterThan(fire.flashesBefore);
  expect(fire.muzzle).toBeTruthy();

  const periscope = await page.evaluate(() => window.seaBattleScenarioTest.setRemoteSubmarineDepthForTest("test-U1", "periscope"));
  expect(periscope.enabledMeshCount).toBe(periscope.meshCount);
  expect(periscope.mountY).toBeLessThan(surfaced.mountY - 0.35);
  expect(periscope.platformY).toBeLessThan(surfaced.platformY - 0.35);
  expect(periscope.pitchDeg).toBeGreaterThan(80);

  const resurface = await page.evaluate(() => window.seaBattleScenarioTest.setRemoteSubmarineDepthForTest("test-U1", "surface"));
  expect(resurface.enabledMeshCount).toBe(resurface.meshCount);
  expect(resurface.mountY).toBeCloseTo(surfaced.mountY, 2);
  expect(resurface.platformY).toBeCloseTo(surfaced.platformY, 2);
});

test("submarine periscope depth keeps the observation view above water", async ({ page }) => {
  test.setTimeout(70_000);

  await page.goto("/sea-battle/?setup=8&vehicle=submarine&hide-beach=1&scenarioTest=1");
  await page.waitForFunction(() => (
    document.body.dataset.playerVehicle === "submarine"
    && document.body.dataset.scenarioTest === "ready"
  ));

  const initial = await diveSnapshot(page);
  expect(initial.observationPeriscope).toBe("hidden");
  expect(initial.cameraY).toBeGreaterThan(0);
  expect(initial.radarDepthMode).toBe("normal");
  expect(initial.radarRange).toBeGreaterThan(0);
  expect(initial.submarineWakeExposure).toBe(1);

  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 6, speed: 0 }));
  const halfAheadAtSurface = await diveSnapshot(page);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 0, speed: 0 }));
  const fullAsternAtSurface = await diveSnapshot(page);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 2, speed: 0 }));

  await page.keyboard.press("Shift+ArrowDown");
  const startedAt = Date.now();
  const samples = [];
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(250);
    samples.push({
      elapsed: Date.now() - startedAt,
      ...(await diveSnapshot(page))
    });
  }

  const targetDepthIndex = samples.findIndex((sample, index) => (
    index > 0
    && Math.abs(sample.depthOffset - sample.targetDepthOffset) < 0.05
  ));
  const bridgeDiveIndex = samples.findIndex((sample) => (
    Math.abs(sample.depthOffset) > 0.12
    && Math.abs(sample.depthOffset) < 0.75
  ));
  expect(bridgeDiveIndex).toBeGreaterThanOrEqual(0);
  expect(samples[bridgeDiveIndex].torpedoView).toBe("hidden");
  expect(samples[bridgeDiveIndex].observationPeriscope).toBe("hidden");
  expect(targetDepthIndex).toBeGreaterThan(0);
  expect(samples[targetDepthIndex].torpedoView).toBe("active");
  expect(samples[targetDepthIndex].submarinePeriscopeMode).toBe("drive");
  expect(samples[targetDepthIndex].cameraY).toBeGreaterThan(0.03);
  expect(samples[targetDepthIndex].cameraY).toBeLessThan(0.55);
  expect(samples[targetDepthIndex].periscopeLift).toBe(0);
  expect(samples[targetDepthIndex].radarDepthMode).toBe("periscope");
  expect(samples[targetDepthIndex].radarRange).toBeGreaterThan(0);
  expect(samples[targetDepthIndex].radarRange).toBeLessThan(initial.radarRange);
  expect(samples[targetDepthIndex].submarineWakeExposure).toBe(0);
  expect(samples[targetDepthIndex].bowWakeVisible).toBe(false);

  await page.keyboard.press("3");
  await expect.poll(() => diveSnapshot(page).then((snapshot) => snapshot.observationPeriscope)).toBe("active");
  await expect.poll(() => diveSnapshot(page).then((snapshot) => snapshot.radarTargetLineMode)).toBe("periscope");
  await expect(page.locator(".observation-periscope-bearing-scale .observation-periscope-scale-title")).toContainText("Zielen");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1200);
  await page.keyboard.up("ArrowRight");
  const turnedPeriscope = await diveSnapshot(page);
  expect(Math.abs(turnedPeriscope.observationYawDeg)).toBeGreaterThan(10);

  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 2, speed: 0, heading: 0 }));
  await page.keyboard.press("2");
  await expect.poll(() => diveSnapshot(page).then((snapshot) => snapshot.submarinePeriscopeMode)).toBe("aiming");
  await expect.poll(() => diveSnapshot(page).then((snapshot) => snapshot.submarinePeriscopeMode), { timeout: 14_000 }).toBe("drive");
  const alignedPeriscope = await diveSnapshot(page);
  expect(alignedPeriscope.submarinePeriscopeMode).toBe("drive");
  expect(alignedPeriscope.torpedoView).toBe("active");
  expect(alignedPeriscope.engineOrder).toBe(2);

  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState("surface"));
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState("periscope"));
  const resetPeriscope = await diveSnapshot(page);
  expect(resetPeriscope.observationYawDeg).toBe(0);

  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 6, speed: 0 }));
  const halfAheadAtPeriscope = await diveSnapshot(page);
  expect(halfAheadAtPeriscope.engineTargetSpeed).toBeGreaterThan(0);
  expect(halfAheadAtPeriscope.engineTargetSpeed).toBeLessThan(halfAheadAtSurface.engineTargetSpeed);

  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 0, speed: 0 }));
  const fullAsternAtPeriscope = await diveSnapshot(page);
  expect(Math.abs(fullAsternAtPeriscope.engineTargetSpeed)).toBeLessThan(Math.abs(fullAsternAtSurface.engineTargetSpeed));

  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState("submerged"));
  await expect.poll(() => diveSnapshot(page).then((snapshot) => snapshot.radarDepthMode), { timeout: 12_000 }).toBe("submerged");
  const submergedRadar = await diveSnapshot(page);
  expect(submergedRadar.observationPeriscope).toBe("hidden");
  expect(submergedRadar.torpedoView).toBe("active");
  expect(submergedRadar.submarinePeriscopeMode).toBe("drive");
  expect(submergedRadar.radarTargetLineMode).toBe("torpedo");
  expect(submergedRadar.radarRange).toBeGreaterThan(0);
  expect(submergedRadar.radarRange).toBeLessThan(samples[targetDepthIndex].radarRange);
  await expect(page.locator(".torpedo-scope-line-center")).toBeHidden();
  await expect(page.locator(".torpedo-scope-line-left")).toBeHidden();
  await expect(page.locator(".torpedo-scope-target-bearing-marker")).toBeHidden();

  const respawnedFromSubmerged = await page.evaluate(() => window.seaBattleScenarioTest.respawnPlayerForTest("submerged"));
  expect(respawnedFromSubmerged.depthState).toBe("surface");
  expect(respawnedFromSubmerged.depthOffset).toBe(0);
  expect(respawnedFromSubmerged.torpedoView).toBe("hidden");
  expect(respawnedFromSubmerged.observationPeriscope).toBe("hidden");
  expect(respawnedFromSubmerged.cameraY).toBeGreaterThan(0);

  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState("submerged"));
  await expect.poll(() => diveSnapshot(page).then((snapshot) => snapshot.radarDepthMode), { timeout: 12_000 }).toBe("submerged");
  await page.keyboard.press("2");
  await expect.poll(() => diveSnapshot(page).then((snapshot) => snapshot.depthState)).toBe("periscope");
  await expect.poll(() => diveSnapshot(page).then((snapshot) => Math.abs(snapshot.depthOffset - snapshot.targetDepthOffset)), { timeout: 12_000 }).toBeLessThan(0.05);
  await expect.poll(() => diveSnapshot(page).then((snapshot) => snapshot.submarinePeriscopeMode), { timeout: 14_000 }).toBe("drive");

  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("active");
  const targetPeriscope = await diveSnapshot(page);
  expect(targetPeriscope.cameraY).toBeGreaterThan(0.03);
  expect(targetPeriscope.cameraY).toBeLessThan(0.55);
  await expect(page.locator(".torpedo-scope-line-center")).toBeVisible();
  await expect(page.locator(".torpedo-scope-range-mid")).toBeHidden();
  await page.keyboard.press("Z");
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoScopeZoom)).toBe("II");
  await page.mouse.wheel(0, -140);
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoScopeZoom)).toBe("III");
  const zoomedTargetPeriscope = await diveSnapshot(page);
  expect(zoomedTargetPeriscope.torpedoScopeFov).toBeLessThan(targetPeriscope.torpedoScopeFov);
});

async function diveSnapshot(page) {
  return page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot());
}
