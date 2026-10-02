import test from 'node:test';
import assert from 'node:assert/strict';
import { roleHotkeys } from '../src/roleHotkeys.js';
test('submarine hints match depth and available posts', () => {
  const surface = roleHotkeys({ role: 'bridge', submarine: true });
  assert.ok(surface.some(([k]) => k === 'F'));
  assert.ok(surface.some(([k]) => k === '⇧↓'));
  assert.ok(!surface.some(([k]) => ['O', 'C', 'W', '⇧↑'].includes(k)));
  const deep = roleHotkeys({ role: 'bridge', submarine: true, depth: 'submerged', periscopeAvailable: true, torpedoScope: true });
  for (const key of ['1', '2', '3', 'Z', '⇧↑', 'Leertaste']) assert.ok(deep.some(([k]) => k === key));
  assert.ok(!deep.some(([k]) => ['F', 'C', 'O', 'W', '⇧↓'].includes(k)));
});
test('role hints exclude occupied posts and allow depth charges for flak but not cannon', () => {
  const members = [{ playerId: 'gunner', station: 'flak' }, { playerId: 'two', station: 'cannon' }, { playerId: 'three', station: 'lookout' }];
  const bridge = roleHotkeys({ role: 'bridge', playerId: 'captain', members });
  assert.ok(bridge.some(([k]) => k === 'W'));
  assert.ok(!bridge.some(([k]) => ['F', 'C', 'O', 'A', '⇧A'].includes(k)));
  const flak = roleHotkeys({ role: 'flak', playerId: 'gunner', members });
  assert.ok(flak.some(([k]) => k === 'W'));
  assert.ok(!roleHotkeys({ role: 'cannon' }).some(([k]) => k === 'W'));
  assert.ok(flak.some(([k]) => k === 'A'));
  const lookout = roleHotkeys({ role: 'lookout', depthChargesReady: false });
  assert.ok(lookout.some(([k]) => k === 'Z'));
  assert.ok(lookout.some(([k, label]) => k === 'U' && label === 'Warnung: U-Boot'));
  assert.ok(lookout.some(([k, label]) => k === 'L' && label === 'Warnung: Flugzeug'));
  for (const role of ['bridge', 'flak', 'cannon', 'lookout']) {
    for (const submarine of [false, true]) {
      const keys = roleHotkeys({ role, submarine });
      for (const key of ['U', 'L']) assert.equal(keys.filter(([k]) => k === key).length, 1);
    }
  }
  assert.ok(!lookout.some(([k]) => k === 'W'));
  assert.equal(lookout.filter(([k]) => k === 'C').length, 1);
  assert.equal(lookout.filter(([k]) => k === 'F').length, 1);
  assert.ok(!lookout.some(([k]) => k.includes('⇧C') || k.includes('⇧F')));
  const occupiedLookout = roleHotkeys({ role: 'lookout', playerId: 'look', members });
  assert.ok(occupiedLookout.some(([k, label]) => k === 'C' && label.includes('Zustimmung')));
  assert.ok(occupiedLookout.some(([k, label]) => k === 'F' && label.includes('Zustimmung')));
});
