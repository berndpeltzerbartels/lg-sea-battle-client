import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

for (const crewResponse of ["empty-200", "empty-204", "json-null"])
for (const initiallyFinished of [false, true]) test(`submarine burn-down (${crewResponse}): ${initiallyFinished ? 'already finished at startup' : 'last friendly bot boat destroyed'}`, async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const vehicle = (id, teamId, vehicleType, controlledBy = 'bot') => ({ id, teamId, vehicleType, controlledBy,
    state: 'active', x: teamId === 'dark' ? 300 : 0, z: 0, y: 0, heading: 0, speed: 0,
    turnVelocity: 0, engineOrder: 2, rudderDegrees: 0, torpedoesRemaining: 12, depthState: 'surface', lifeId: 0 });
  const initial = { sessionId: 'islands', instanceId: 'test-round', mode: 'BURN_DOWN', state: 'running', t: 0,
    ships: [vehicle('sub', 'light', 'submarine', 'player-SUB-test'), vehicle('last', 'light', 'torpedo-boat'), vehicle('enemy', 'dark', 'torpedo-boat')],
    torpedoes: [], bombs: [], flakShots: [], cannonShots: [], flakHits: [], ramHits: [], killsByPlayer: {}, destroyedShipsByTeam: {} };
  const finished = { ...initial, state: 'finished', winningTeam: 'dark', t: 1, ships: initial.ships.filter(s => s.id !== 'last') };
  await page.addInitScript(() => {
    localStorage.setItem('accountId', 'test');
    window.EventSource = class { constructor() { window.testStream = this; } close() {} };
  });
  await page.route('**/*', async route => {
    const relative = new URL(route.request().url()).pathname.replace(/^\/sea-battle\//, '/');
    if (relative.includes('/game/')) {
      if (relative.includes('/session/')) return route.fulfill({ json: { playerId: 'player-SUB-test', initials: 'SUB', teamId: 'light' } });
      if (relative.endsWith('/world')) return route.fulfill({ json: { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } } });
      if (relative.includes('/crew/')) return crewResponse === 'json-null'
        ? route.fulfill({ json: null })
        : route.fulfill({ status: crewResponse === 'empty-204' ? 204 : 200, body: '' });
      return route.fulfill({ json: initiallyFinished ? finished : initial });
    }
    if (relative.endsWith('/crew-inbox.html')) return route.fulfill({ body: '' });
    const file = path.join(dist, relative === '/app' ? 'index.html' : relative);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ body: '{}' });
    const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav' }[path.extname(file)] ?? 'application/octet-stream';
    await route.fulfill({ body: fs.readFileSync(file), contentType });
  });
  await page.goto('http://capture.invalid/sea-battle/app?vehicle=submarine');
  await page.waitForFunction(() => window.testStream?.onmessage, null, { timeout: 7000 });
  if (!initiallyFinished) await page.evaluate(state => window.testStream.onmessage({ data: JSON.stringify({ type: 'game-stream', state }) }), finished);
  await expect(page.locator('#round-result')).toContainText('Dunkel');
  expect(errors).toEqual([]);
});
