import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Render the built game without starting an application or contacting a server.
const gameDist = fileURLToPath(new URL('../../dist/', import.meta.url));
test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

async function openGame(page, vehicle) {
  await page.addInitScript(() => {
    window.testPad = { id: '057e-2019-N64 Controller', index: 0, connected: true, mapping: '', axes: [9 / 7, 0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
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
  await page.evaluate(() => { testPad.axes = [9 / 7, 0, 0, 0, 0]; testPad.buttons.forEach(b => { b.pressed = false; b.value = 0; }); });
  await page.waitForTimeout(180);
}
async function press(page, index) {
  await page.evaluate(index => { testPad.buttons[index].pressed = true; testPad.buttons[index].value = 1; }, index);
  await page.waitForTimeout(150);
  await page.evaluate(index => { testPad.buttons[index].pressed = false; testPad.buttons[index].value = 0; }, index);
  await page.waitForTimeout(150);
}


for (const vehicle of ['torpedo-boat', 'submarine']) test(`${vehicle}: N64 C keys retain throttle/rudder; hat cycles positions and stick remains direct`, async ({ page }) => {
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  await openGame(page, vehicle);
  await press(page, 2);
  const engine = await page.locator('body').getAttribute('data-engine-order');
  expect(engine).not.toBe('Stop');
  await press(page, 8);
  const rudder = await page.locator('body').getAttribute('data-rudder-degrees');
  expect(Number(rudder)).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  await expect(page.locator('body')).toHaveAttribute('data-engine-order', engine);
  await expect(page.locator('body')).toHaveAttribute('data-rudder-degrees', rudder);
  await page.evaluate(()=>{testPad.axes[0]=-3/7});
  await expect.poll(()=>page.evaluate(()=>{const s=seaBattleScenarioTest.stationState();return s.lookout||s.flak})).toBe(true);
  await neutral(page);
  await page.evaluate(()=>{testPad.axes[0]=5/7});
  await expect.poll(()=>page.evaluate(()=>{const s=seaBattleScenarioTest.stationState();return !s.lookout&&!s.flak&&!s.cannon&&!s.torpedo})).toBe(true);
  await neutral(page);
  await page.evaluate(()=>{testPad.axes[1]=1;testPad.axes[2]=-1});
  await expect(page.locator('body')).toHaveAttribute('data-engine-order','Ahead Full');
  await expect(page.locator('body')).toHaveAttribute('data-rudder-degrees',vehicle==='submarine'?'45':'35');
  await neutral(page);
  await expect(page.locator('body')).toHaveAttribute('data-engine-order','Stop');
  await expect(page.locator('body')).toHaveAttribute('data-rudder-degrees','0');
  expect(errors).toEqual([]);
});
