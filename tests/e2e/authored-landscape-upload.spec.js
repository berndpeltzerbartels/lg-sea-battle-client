import { expect, test } from '@playwright/test';

test('uploaded editor landscape is converted and rendered as authored polygon terrain', async ({ page, request }, testInfo) => {
  const landscapeName = `Playwright authored hill ${Date.now()}`;
  const islandName = 'Playwright Test Hill';
  const islandMeshName = 'playwright_test_hill';
  const editorLandscape = createEditorLandscape(landscapeName, islandName);

  try {
    await uploadAndStartLandscape(page, landscapeName, 'playwright-authored-hill.json', editorLandscape);

    await expect.poll(async () => {
      const response = await request.get('/game/world');
      if (!response.ok()) return 'missing-world';
      const world = await response.json();
      const land = world.landmasses?.find((candidate) => candidate.name === islandMeshName);
      return JSON.stringify({
        landmasses: world.landmasses?.length ?? 0,
        mapObjects: world.mapObjects?.length ?? 0,
        mapObjectY: world.mapObjects?.[0]?.y ?? null,
        material: land?.material ?? '',
        materialZones: land?.materialZones?.length ?? 0,
        polygonPoints: land?.polygon?.length ?? 0,
        heightPoints: land?.heightPoints?.length ?? 0,
        peak: land?.heightPoints?.[0]?.h ?? 0,
        falloff: land?.heightPoints?.[0]?.falloff ?? ''
      });
    }, {
      timeout: 5_000,
      message: 'uploaded editor landscape should become the active server world'
    }).toBe(JSON.stringify({
      landmasses: 1,
      mapObjects: 1,
      mapObjectY: 4800,
      material: 'grass',
      materialZones: 1,
      polygonPoints: 4,
      heightPoints: 1,
      peak: 4800,
      falloff: 'hill'
    }));

    await enterGameThroughStartPage(page);
    await page.goto('/app?scenarioTest=1&debug=1&bigMap=1&hide-beach=1');
    await expect(page.locator('#renderCanvas')).toBeVisible();
    await page.waitForFunction(() => window.seaBattleScenarioTest && document.body.dataset.scenarioTest === 'ready');
    await aimBridgeAtLandscape(page);

    await expect.poll(async () => {
      const visuals = await page.evaluate(() => window.seaBattleScenarioTest.authoredLandscapeVisuals());
      return visuals[0]?.snow?.maxY ?? 0;
    }, {
      timeout: 5_000,
      message: 'authored hill should produce visible terrain height in the Babylon scene'
    }).toBeGreaterThan(4500);

    const visuals = await page.evaluate(() => window.seaBattleScenarioTest.authoredLandscapeVisuals());
    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      name: islandMeshName,
      polygonPoints: 4,
      heightPoints: 1,
      maxAuthoredMeters: 4800,
      material: 'grass',
      materialZones: 1
    });
    expect(visuals[0].terrain).toBeTruthy();
    expect(visuals[0].terrain.material).toContain('grass');
    expect(visuals[0].terrain.diffuse.g).toBeGreaterThan(visuals[0].terrain.diffuse.r);
    expect(visuals[0].terrain.vertices).toBeGreaterThan(4);
    expect(visuals[0].terrain.minY).toBeGreaterThanOrEqual(0);
    expect(visuals[0].sand).toBeTruthy();
    expect(visuals[0].sand.material).toContain('sand');
    expect(visuals[0].snow).toBeTruthy();
    expect(visuals[0].snow.material).toContain('snow');
    expect(visuals[0].snow.maxY).toBeGreaterThan(4500);
    expect(visuals[0].snow.maxY).toBeLessThan(5000);
    expect(visuals[0].seaFloor).toBeTruthy();
    expect(visuals[0].seaFloor.minY).toBeLessThan(-80);
    expect(visuals[0].seaFloor.maxY).toBeLessThanOrEqual(0);
    expect(visuals[0].underwaterPlug).toBeNull();

    const mapObjectVisuals = await page.evaluate(() => window.seaBattleScenarioTest.mapObjectVisuals());
    expect(mapObjectVisuals).toContainEqual(expect.objectContaining({
      id: 'striped_light',
      type: 'lighthouse-striped',
      y: 4800,
      rootY: 4800
    }));

    await page.screenshot({
      path: testInfo.outputPath('authored-landscape-upload.png'),
      fullPage: false
    });

    const pixelStats = await page.evaluate(() => window.seaBattleScenarioTest.browserViewPixelStats());
    expect(pixelStats).toBeTruthy();
    expect(pixelStats.greenSurfaceRatio).toBeGreaterThan(0.015);
    expect(pixelStats.darkRatio).toBeLessThan(0.18);
  } finally {
    await deleteLandscapeIfPresent(page, landscapeName);
  }
});

test('authored low and submerged terrain keeps objects below the waterline', async ({ page, request }) => {
  const landscapeName = `Playwright waterline ${Date.now()}`;
  const editorLandscape = createWaterlineLandscape(landscapeName);

  try {
    await uploadAndStartLandscape(page, landscapeName, 'playwright-waterline.json', editorLandscape);

    await expect.poll(async () => {
      const response = await request.get('/game/world');
      if (!response.ok()) return 'missing-world';
      const world = await response.json();
      const landNames = (world.landmasses ?? []).map((land) => land.name).sort();
      return JSON.stringify({
        landmasses: world.landmasses?.length ?? 0,
        landNames,
        mapObjects: world.mapObjects?.length ?? 0
      });
    }, {
      timeout: 5_000,
      message: 'waterline test landscape should become the active server world'
    }).toBe(JSON.stringify({
      landmasses: 2,
      landNames: ['emergent_bank', 'submerged_bank'],
      mapObjects: 2
    }));

    await enterGameThroughStartPage(page);
    await page.goto('/app?scenarioTest=1&debug=1&bigMap=1&hide-beach=1');
    await expect(page.locator('#renderCanvas')).toBeVisible();
    await page.waitForFunction(() => window.seaBattleScenarioTest && document.body.dataset.scenarioTest === 'ready');

    const visuals = await page.evaluate(() => window.seaBattleScenarioTest.authoredLandscapeVisuals());
    const byName = new Map(visuals.map((visual) => [visual.name, visual]));
    const emergent = byName.get('emergent_bank');
    const submerged = byName.get('submerged_bank');

    expect(emergent?.terrain).toBeTruthy();
    expect(emergent.terrain.material).toContain('grass');
    expect(emergent.terrain.minY).toBeGreaterThanOrEqual(0);
    expect(emergent.terrain.maxY).toBeGreaterThan(100);
    expect(emergent.terrain.maxY).toBeLessThan(170);
    expect(emergent.seaFloor).toBeTruthy();
    expect(emergent.seaFloor.minY).toBeLessThan(0);
    expect(emergent.seaFloor.maxY).toBeLessThanOrEqual(0);
    expect(emergent.underwaterPlug).toBeNull();

    expect(submerged?.terrain).toBeNull();
    expect(submerged?.seaFloor).toBeTruthy();
    expect(submerged.material).toBe('sand');
    expect(submerged.seaFloor.material).toContain('sand');
    expect(submerged.seaFloor.maxY).toBeLessThan(0);
    expect(submerged.underwaterPlug).toBeNull();

    const mapObjectVisuals = await page.evaluate(() => window.seaBattleScenarioTest.mapObjectVisuals());
    expect(mapObjectVisuals).toContainEqual(expect.objectContaining({
      id: 'submerged_rock',
      type: 'rock',
      y: -35,
      rootY: -35
    }));
  } finally {
    await deleteLandscapeIfPresent(page, landscapeName);
  }
});

function createEditorLandscape(name, islandName) {
  return {
    format: 'game-landscape-designer.v1',
    name,
    world: {
      width: 3200,
      height: 2200
    },
    islands: [
      {
        id: 'playwright-test-hill',
        name: islandName,
        material: 'grass',
        seaFloorHeight: -90,
        materialZones: [
          {
            id: 'west-beach',
            material: 'sand',
            polygon: [
              { x: -420, z: -220 },
              { x: 420, z: -160 },
              { x: 250, z: -40 },
              { x: -340, z: -40 }
            ]
          }
        ],
        polygon: [
          { x: -420, z: -220 },
          { x: 420, z: -160 },
          { x: 360, z: 260 },
          { x: -380, z: 230 }
        ],
        heights: [
          { x: -40, z: 20, h: 4800, radius: 360, falloff: 'hill' }
        ],
        landmarks: [
          { id: 'striped-light', type: 'lighthouse-striped', name: 'Rot-Weiss', x: -40, y: 4800, z: 20, scale: 1.1 }
        ]
      }
    ]
  };
}

function createWaterlineLandscape(name) {
  return {
    format: 'game-landscape-designer.v1',
    name,
    world: {
      width: 3000,
      depth: 2200
    },
    islands: [
      {
        id: 'emergent-bank',
        name: 'Emergent Bank',
        seaFloorHeight: -70,
        polygon: [
          { x: -520, z: -180 },
          { x: 10, z: -220 },
          { x: 280, z: 130 },
          { x: -420, z: 260 }
        ],
        heights: [
          { x: -120, z: 20, h: 145, radius: 430, falloff: 'hill' }
        ],
        landmarks: [
          { id: 'emergent-light', type: 'lighthouse-striped', name: 'Rot-Weiss', x: -120, y: 145, z: 20, scale: 1 }
        ]
      },
      {
        id: 'submerged-bank',
        name: 'Submerged Bank',
        material: 'sand',
        seaFloorHeight: -130,
        polygon: [
          { x: 560, z: -220 },
          { x: 1040, z: -180 },
          { x: 1080, z: 230 },
          { x: 620, z: 260 }
        ],
        heights: [
          { x: 820, z: 30, h: -35, radius: 390, falloff: 'plateau' }
        ],
        landmarks: [
          { id: 'submerged-rock', type: 'rock', name: 'Unterwasserfelsen', x: 820, y: -35, z: 30, scale: 1.1 }
        ]
      }
    ]
  };
}

async function uploadAndStartLandscape(page, landscapeName, fileName, editorLandscape) {
  page.on('dialog', (dialog) => dialog.accept());
  await openAdmin(page);
  await page.locator('#landscapeFile').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(editorLandscape, null, 2), 'utf8')
  });
  await page.getByRole('button', { name: 'Hochladen', exact: true }).click();

  const tile = page.locator('article.tile').filter({ hasText: landscapeName }).first();
  await expect(tile).toBeVisible();
  await tile.getByRole('button', { name: /^starten$/i }).first().click();
}

async function openAdmin(page) {
  await page.goto('/admin.html');
  await page.waitForLoadState('domcontentloaded');

  const landscapeFile = page.locator('#landscapeFile');
  const username = page.locator('#username, input[name="username"]').first();
  const password = page.locator('#password, input[name="password"]').first();
  await Promise.race([
    landscapeFile.waitFor({ state: 'visible', timeout: 5_000 }),
    password.waitFor({ state: 'visible', timeout: 5_000 })
  ]).catch(() => {});

  if (await landscapeFile.isVisible({ timeout: 500 }).catch(() => false)) {
    return;
  }

  if (await password.isVisible({ timeout: 500 }).catch(() => false)) {
    await username.fill('admin');
    await password.fill('bernd');
    const loginButton = page.getByRole('button', { name: /anmelden|einloggen|login|weiter/i }).first();
    if (await loginButton.count()) {
      await loginButton.click();
    } else {
      await page.locator('button[type="submit"], input[type="submit"]').first().click();
    }
  }

  await expect(landscapeFile).toBeVisible();
}

async function enterGameThroughStartPage(page) {
  await page.goto('/start.html');
  await page.locator('#nickname').fill('Playwright Landscape');
  await page.locator('#alias').fill(`P${String(Date.now()).slice(-4)}`);
  await page.locator('#team').selectOption('light');
  await page.locator('#vehicleType').selectOption('torpedo-boat');
  await page.getByRole('button', { name: /einsteigen/i }).click();
  await page.waitForURL(/\/app(?:\?|$)/, { timeout: 5_000 });
}

async function aimBridgeAtLandscape(page) {
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({
    x: 0,
    z: -950,
    heading: 0,
    speed: 0,
    engineOrder: 2
  }));
  await page.waitForTimeout(300);
}

async function deleteLandscapeIfPresent(page, landscapeName) {
  try {
    await openAdmin(page);
    const tile = page.locator('article.tile').filter({ hasText: landscapeName }).first();
    if (await tile.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await tile.getByRole('button', { name: /löschen/i }).first().click();
    }
  } catch {
    // Best-effort cleanup only; the temp E2E runner removes its copied database.
  }
}
