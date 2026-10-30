import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Render the built game without starting an application or contacting a server.
const gameDist = fileURLToPath(new URL('../../dist/', import.meta.url));
test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

async function openGame(page, vehicle) {
  await page.addInitScript(() => {
    window.testPad = { id: 'DualSense', index: 0, connected: true, mapping: 'standard', axes: [0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.testPad] });
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    const relative = url.pathname.replace(/^\/sea-battle\//, '/');
    if (relative.startsWith('/game/') || relative.includes('/crew/'))
      return route.fulfill({ json: { ships: [], torpedoes: [], players: [], events: [], islands: [] } });
    let file = path.join(gameDist, relative === '/app' || relative === '/' ? 'index.html' : relative);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(gameDist, 'index.html');
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
      '.svg': 'image/svg+xml', '.json': 'application/json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' }[path.extname(file)];
    await route.fulfill({ body: fs.readFileSync(file), contentType: type ?? 'application/octet-stream' });
  });
  await page.goto(`http://capture.invalid/sea-battle/app?vehicle=${vehicle}&sandbox=side-view&scenarioTest=1`);
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('#renderCanvas').click({ position: { x: 300, y: 350 } });
  await expect(page.locator('body')).toHaveAttribute('data-gamepad', 'connected');
  await neutral(page);
}
async function neutral(page) {
  await page.evaluate(() => { testPad.axes = [0, 0]; testPad.buttons.forEach(b => { b.pressed = false; b.value = 0; }); });
  await page.waitForTimeout(180);
}
async function press(page, index) {
  await page.evaluate(index => { testPad.buttons[index].pressed = true; testPad.buttons[index].value = 1; }, index);
  await page.waitForTimeout(150);
  await page.evaluate(index => { testPad.buttons[index].pressed = false; testPad.buttons[index].value = 0; }, index);
  await page.waitForTimeout(150);
}

for (const vehicle of ['torpedo-boat', 'submarine']) test(`${vehicle}: held gas survives guns, steering stays independent and only bridge vertical input releases it`, async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await openGame(page, vehicle);
  await page.evaluate(() => { testPad.axes = [0, -1]; });
  await expect(page.locator('body')).toHaveAttribute('data-engine-order', 'Ahead Full');
  await press(page, 10);
  await expect(page.locator('#throttleHoldValue')).toBeVisible();
  await neutral(page);
  await expect(page.locator('body')).toHaveAttribute('data-engine-order', 'Ahead Full');
  await page.evaluate(() => { testPad.axes = [1, 0]; });
  await expect(page.locator('body')).toHaveAttribute('data-rudder-degrees', vehicle === 'submarine' ? '45' : '35');
  await neutral(page);
  await expect(page.locator('body')).toHaveAttribute('data-rudder-degrees', '0');
  await press(page, 3);
  await expect.poll(() => page.evaluate(() => {
    const s = seaBattleScenarioTest.stationState(); return s.lookout || s.flak;
  })).toBe(true);
  await page.evaluate(() => { testPad.axes = [0, 1]; });
  await press(page, 10); // Aiming and L3 at a weapon cannot release the gas.
  await expect(page.locator('body')).toHaveAttribute('data-gamepad-throttle-held', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-engine-order', 'Ahead Full');
  await neutral(page);
  await page.evaluate(station => seaBattleScenarioTest.setStation(station), vehicle === 'torpedo-boat' ? 'cannon' : 'flak');
  await neutral(page);
  await expect(page.locator('#throttleHoldValue')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('held-throttle-at-gun.png') });
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('.telegraph').getBoundingClientRect();
    const speed = document.getElementById('telegraphSpeedValue').getBoundingClientRect();
    return { bottom: panel.bottom, speedBottom: speed.bottom };
  });
  expect(layout.speedBottom).toBeLessThanOrEqual(layout.bottom);
  await page.evaluate(() => seaBattleScenarioTest.setStation('bridge'));
  await neutral(page);
  await page.evaluate(() => { testPad.axes = [0, 1]; });
  await expect(page.locator('body')).toHaveAttribute('data-gamepad-throttle-held', 'false');
  await expect(page.locator('body')).toHaveAttribute('data-engine-order', 'Astern Full');
  await neutral(page);
  await expect(page.locator('body')).toHaveAttribute('data-engine-order', 'Stop');
  expect(errors).toEqual([]);
});

test('without L3 triangle returns the throttle to Stop when leaving the bridge', async ({ page }) => {
  await openGame(page, 'torpedo-boat');
  await page.evaluate(() => { testPad.axes = [0, -1]; });
  await expect(page.locator('body')).toHaveAttribute('data-engine-order', 'Ahead Full');
  await press(page, 3);
  await expect.poll(() => page.evaluate(() => seaBattleScenarioTest.stationState().lookout)).toBe(true);
  await expect(page.locator('body')).toHaveAttribute('data-engine-order', 'Stop');
  await expect(page.locator('#throttleHoldValue')).toBeHidden();
});

test('submarine depth changes reset both periscope zoom views, including surfacing', async ({ page }) => {
  test.setTimeout(45000);
  await openGame(page, 'submarine');
  await page.evaluate(() => seaBattleScenarioTest.setSubmarineDepthState('periscope'));
  await expect(page.locator('body')).toHaveAttribute('data-torpedo-view', 'active', { timeout: 14000 });
  const snapshot = () => page.evaluate(() => seaBattleScenarioTest.submarineDiveSequenceSnapshot());
  for (const target of ['submerged', 'periscope', 'surface']) {
    await page.keyboard.press('z');
    await expect.poll(async () => (await snapshot()).torpedoScopeZoom).not.toBe('I');
    await page.evaluate(depth => seaBattleScenarioTest.setSubmarineDepthState(depth), target);
    const s = await snapshot();
    expect(s.torpedoScopeZoom).toBe('I');
    expect(s.observationPeriscopeZoom).toBe('I');
  }
  await page.evaluate(() => seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  expect((await snapshot()).torpedoScopeZoom).toBe('I');
});
