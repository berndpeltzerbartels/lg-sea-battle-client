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

for (const [vehicle, speed] of [['torpedo-boat', 17.5], ['torpedo-boat', -6], ['submarine', 10]]) {
  test(`${vehicle} at ${speed}: foam is cleared when a remote bot becomes the own ship and on respawn`, async ({ page }) => {
    await openGame(page, vehicle);
    for (let life = 0; life < 3; life++) for (const mode of ['handoff', 'respawn']) {
      const result = await page.evaluate(({mode, speed}) => seaBattleScenarioTest.wakeCleanupForTest(mode, speed), { mode, speed });
      const key = vehicle === 'submarine' ? 'periscopeActive' : 'bowActive';
      expect(result.before[key]).toBeGreaterThan(0);
      expect(result.after.bowActive).toBe(0);
      expect(result.after.periscopeActive).toBe(0);
      expect(result.after.bowEnabled).toBe(false);
      expect(result.after.periscopeEnabled).toBe(false);
      if (mode === 'handoff') expect(result.meshesAfter).toBe(result.meshesBefore);
    }
  });
}
