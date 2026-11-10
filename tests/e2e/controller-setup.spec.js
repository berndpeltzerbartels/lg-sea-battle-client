import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const fixtures = fileURLToPath(new URL('../../../server/build/test-fixtures/', import.meta.url));
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));
test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

async function setup(page) {
  const records = Object.entries(JSON.parse(fs.readFileSync(path.join(fixtures, 'controller-responses.json'), 'utf8')));
  const unexpected = [];
  await page.addInitScript(() => {
    window.EventSource = class { constructor() { setTimeout(() => this.onopen?.(), 10); } close() {} addEventListener() {} };
    window.testPad = { id: 'Setup raw controller', mapping: '', connected: true, index: 0,
      axes: [0, 0, 0], buttons: Array.from({ length: 12 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.testPad] });
  });
  await page.route('http://capture.invalid/**', async route => {
    const url = new URL(route.request().url()), pathname = url.pathname;
    if (pathname.startsWith('/xis/')) {
      const body = route.request().postDataJSON?.() ?? {};
      const prefix = `${route.request().method()} ${pathname}${url.search}`;
      const match = records.find(([key]) => {
        if (!key.startsWith(prefix)) return false;
        const stored = key.slice(prefix.length).trim();
        if (!stored) return !route.request().postData();
        const request = JSON.parse(stored);
        return request.pageId === body.pageId && request.frontletId === body.frontletId && request.action === body.action;
      });
      if (match) return route.fulfill({ status: match[1].status, body: match[1].responseText ?? '',
        contentType: pathname.includes('/html') || pathname.includes('/head') || pathname.includes('/body?') ? 'text/html' : 'application/json' });
      unexpected.push(prefix); return route.fulfill({ status: 404, body: '' });
    }
    if (pathname === '/bundle.min.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(fixtures, 'controller-runtime.js')) });
    if (['/controller.html', '/start.html'].includes(pathname)) return route.fulfill({ contentType: 'text/html',
      body: '<html><head><title>Küstenkrieg</title><script src="/bundle.min.js"></script></head><body onload="main()"></body></html>' });
    if (pathname.startsWith('/game/') || pathname.includes('/crew/')) return route.fulfill({ json: { ships: [], torpedoes: [], players: [], events: [], islands: [] } });
    let file = pathname.startsWith('/sea-battle/controller-') ? path.join(publicDir, path.basename(pathname))
      : path.join(dist, pathname.replace(/^\/sea-battle\//, ''));
    if (pathname === '/app') file = path.join(dist, 'index.html');
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wav': 'audio/wav' }[path.extname(file)] ?? 'application/octet-stream';
    return route.fulfill({ body: fs.readFileSync(file), contentType });
  });
  await page.goto('http://capture.invalid/controller.html');
  await expect(page.locator('#controller-setup')).toHaveAttribute('data-mounted', 'true');
  await expect(page.locator('#controller-save')).toBeEnabled();
  return unexpected;
}
async function bind(page, action, kind, index, value = 1) {
  await page.locator(`[data-bind="${action}"]`).click();
  await page.waitForTimeout(300);
  await page.evaluate(({kind,index,value}) => {
    if (kind === 'axis') testPad.axes[index] = value;
    else { testPad.buttons[index].pressed = true; testPad.buttons[index].value = 1; }
  }, {kind,index,value});
  await expect(page.locator('#controller-capture')).toBeHidden();
  await page.evaluate(() => { testPad.axes.fill(0); testPad.buttons.forEach(b => { b.pressed = false; b.value = 0; }); });
  await page.waitForTimeout(120);
}

test('native XIS frontlets configure all functions, detect conflicts and persist shared bindings into the game', async ({page}, info) => {
  test.setTimeout(90000);
  const errors=[];page.on('pageerror', e=>errors.push(e.message));
  const unexpected=await setup(page);
  await expect(page.locator('[data-controller-action]')).toHaveCount(24);
  await expect(page.locator('#family-all')).toHaveText('Für alle Fahrzeuge');
  await expect(page.locator('.intro').first()).toContainText('nur für Gamecontroller');
  await expect(page.locator('#heading-DirectControlFrontlet')).toHaveText('Direkte Brückensteuerung');
  await expect(page.locator('#heading-AimControlFrontlet')).toHaveText('Zielen und Umschauen');
  await expect(page.locator('.keyboard-alternatives strong').first()).toHaveText('Torpedoboot · auf der Tastatur:');
  await expect(page.locator('.keyboard-alternatives strong').nth(1)).toHaveText('U-Boot · auf der Tastatur:');
  await expect(page.locator('#family-boat')).toHaveText('Nur Torpedoboot');
  await expect(page.locator('#family-submarine')).toHaveText('Nur U-Boot');
  await expect(page.locator('[data-controller-action="forward-scope"] .keyboard-hint')).toContainText('1');
  await expect(page.locator('[data-controller-action="observation-scope"] .keyboard-hint')).toContainText('2');
  await bind(page, 'directX', 'axis', 1);
  await bind(page, 'directY', 'axis', 2, -1);
  await bind(page, 'aimX', 'axis', 1);
  await bind(page, 'aimY', 'axis', 2, -1);
  await bind(page, 'fire', 'button', 0);
  await bind(page, 'zoom', 'button', 0);
  await expect(page.locator('#controller-conflicts')).toContainText('Doppelt belegt');
  await expect(page.locator('#controller-save')).toBeDisabled();
  await bind(page, 'zoom', 'button', 1);
  await bind(page, 'stationNext', 'button', 2);
  await bind(page, 'up', 'button', 3);
  await bind(page, 'aimUp', 'button', 3);
  await expect(page.locator('#controller-conflicts')).toHaveText('');
  await bind(page, 'depth-charge', 'button', 4);
  await bind(page, 'forward-scope', 'button', 4);
  await expect(page.locator('#controller-conflicts')).toHaveText('');
  await page.locator('#controller-save').click();
  await expect(page.locator('#controller-save-status')).toContainText('Belegung gespeichert');
  const saved=await page.evaluate(()=>localStorage.getItem('seaBattle.controllerBindings.v1'));
  await page.screenshot({path:info.outputPath('controller-setup-desktop.png'),fullPage:true});
  await page.reload();
  await expect(page.locator('[data-controller-action="fire"] [data-binding-value]')).toHaveText('Taste 1');
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('controller-setup-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1600,height:900});
  for (const vehicle of ['torpedo-boat','submarine']) {
    await page.goto(`http://capture.invalid/app?vehicle=${vehicle}&sandbox=side-view&scenarioTest=1`);
    await page.waitForFunction(()=>window.seaBattleScenarioTest);
    await page.locator('#renderCanvas').click({position:{x:300,y:350}});
    await expect(page.locator('body')).toHaveAttribute('data-gamepad','connected');
    await page.evaluate(()=>{testPad.axes[1]=1;testPad.axes[2]=-1});
    await expect(page.locator('body')).toHaveAttribute('data-engine-order','Ahead Full');
    await expect(page.locator('body')).toHaveAttribute('data-rudder-degrees',vehicle==='submarine'?'45':'35');
    await page.evaluate(()=>testPad.axes.fill(0));
    await expect(page.locator('body')).toHaveAttribute('data-engine-order','Stop');
    if (vehicle === 'torpedo-boat') {
      await page.evaluate(()=>seaBattleScenarioTest.setStation('cannon'));
      await page.waitForTimeout(200);
      const before=await page.evaluate(()=>seaBattleScenarioTest.cannonAimDisplay());
      await page.evaluate(()=>{testPad.axes[1]=.8;testPad.axes[2]=-.8});
      await expect.poll(()=>page.evaluate(before=>{
        const a=seaBattleScenarioTest.cannonAimDisplay();
        return Math.abs(Math.atan2(Math.sin(a.targetYaw-before.targetYaw),Math.cos(a.targetYaw-before.targetYaw)))>.02
          && a.targetPitch>before.targetPitch+.02;
      },before)).toBe(true);
      await page.evaluate(()=>testPad.axes.fill(0));
      await expect(page.locator('body')).toHaveAttribute('data-engine-order','Stop');
      await expect(page.locator('body')).toHaveAttribute('data-rudder-degrees','0');
    }
    if (vehicle === 'submarine') {
      await page.evaluate(()=>seaBattleScenarioTest.setSubmarineDepthState('periscope'));
      await expect(page.locator('body')).toHaveAttribute('data-torpedo-view','active',{timeout:14000});
      await page.keyboard.press('2');
      await expect(page.locator('body')).toHaveAttribute('data-observation-periscope','active');
      await page.evaluate(()=>{testPad.buttons[4].pressed=true;testPad.buttons[4].value=1});
      await expect(page.locator('body')).not.toHaveAttribute('data-observation-periscope','active');
      await page.evaluate(()=>{testPad.buttons[4].pressed=false;testPad.buttons[4].value=0});
    }
    expect(await page.evaluate(()=>localStorage.getItem('seaBattle.controllerBindings.v1'))).toBe(saved);
  }
  expect(unexpected).toEqual([]);expect(errors).toEqual([]);
});

test('returning and cancelling do not require saving and do not create a profile', async ({page}) => {
  const unexpected=await setup(page);
  await bind(page,'fire','button',0);
  await page.locator('#controller-back-top').click();
  await expect(page).toHaveURL(/\/start.html$/);
  expect(await page.evaluate(()=>localStorage.getItem('seaBattle.controllerBindings.v1'))).toBeNull();
  await page.goBack();
  await expect(page.locator('#controller-setup')).toHaveAttribute('data-mounted','true');
  await page.locator('[data-bind="zoom"]').click();
  await page.locator('#controller-cancel').click();
  await expect(page.locator('#controller-capture')).toBeHidden();
  await page.locator('#controller-back-bottom').click();
  await expect(page).toHaveURL(/\/start.html$/);
  expect(unexpected).toEqual([]);
});
