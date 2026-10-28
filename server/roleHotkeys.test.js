import test from 'node:test';
import assert from 'node:assert/strict';
import { roleHotkeys, gamepadHotkeys } from '../src/roleHotkeys.js';

test('controller help follows all four torpedo boat positions and excludes unavailable controls', () => {
  for (const role of ['bridge', 'lookout', 'flak', 'cannon']) {
    const keys = gamepadHotkeys(roleHotkeys({ role }));
    assert.equal(keys.some(([key]) => key === '□'), role !== 'cannon');
    assert.equal(keys.some(([key]) => key === 'R2'), role !== 'lookout');
    assert.equal(keys.some(([key]) => key === 'L2'), role === 'lookout' || role === 'cannon');
    assert.ok(keys.some(([key]) => key === '△'));
    if (role === 'lookout') assert.ok(keys.some(([key, label]) => key.startsWith('Linker Stick') && label === 'Blickrichtung'));
  }
  assert.equal(gamepadHotkeys(roleHotkeys({ role: 'bridge', depthChargesReady: false })).some(([key]) => key === '□'), false);
});

test('both submarine positions and depths have their own accurate controller help', () => {
  for (const role of ['bridge', 'flak']) for (const depth of ['surface', 'periscope', 'submerged']) {
    const hints = gamepadHotkeys(roleHotkeys({ role, submarine: true, depth,
      periscopeAvailable: depth !== 'surface', torpedoScope: role === 'bridge' && depth !== 'surface' }));
    assert.equal(hints.some(([key]) => key === '□'), false);
    assert.equal(hints.some(([key]) => key === 'Steuerkreuz ↑'), depth !== 'surface');
    assert.equal(hints.some(([key]) => key === 'Steuerkreuz ↓'), depth !== 'submerged');
    assert.equal(hints.some(([key]) => key === 'L2'), role === 'bridge' && depth !== 'surface');
    if (role === 'flak') assert.equal(hints.some(([, label]) => label.includes('Peilung')), false);
  }
  const hints = gamepadHotkeys(roleHotkeys({ role: 'bridge', submarine: true, depth: 'periscope',
    periscopeAvailable: true, observationScope: true }));
  assert.ok(hints.some(([key, label]) => key === 'Stick ← / →' && label === 'Blickrichtung'));
  assert.equal(hints.some(([key]) => key === 'R2'), false);
  const deep = gamepadHotkeys(roleHotkeys({ role: 'bridge', submarine: true, depth: 'submerged',
    periscopeAvailable: true, observationScope: true }));
  assert.ok(deep.some(([key, label]) => key === 'R2' && label === 'Torpedo voraus'));
});
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
  for (const role of ['bridge', 'flak', 'cannon', 'lookout']) {
    for (const submarine of [false, true]) {
      const keys = roleHotkeys({ role, submarine });
      for (const key of ['U', 'L']) assert.equal(keys.filter(([k]) => k === key).length, 0);
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
