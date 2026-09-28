import test from 'node:test';
import assert from 'node:assert/strict';
import { roleHotkeys } from '../src/roleHotkeys.js';
test('role hints exclude occupied posts and gunner depth charges', () => {
  const members = [{ playerId: 'gunner', station: 'flak' }, { playerId: 'two', station: 'cannon' }, { playerId: 'three', station: 'lookout' }];
  const bridge = roleHotkeys({ role: 'bridge', playerId: 'captain', members });
  assert.ok(bridge.some(([k]) => k === 'W'));
  assert.ok(!bridge.some(([k]) => ['F', 'C', 'O', 'A / ⇧A'].includes(k)));
  const flak = roleHotkeys({ role: 'flak', playerId: 'gunner', members });
  assert.ok(!flak.some(([k]) => k === 'W'));
  assert.ok(flak.some(([k]) => k === 'A'));
  const lookout = roleHotkeys({ role: 'lookout', depthChargesReady: false });
  assert.ok(lookout.some(([k]) => k === 'Z'));
  assert.ok(!lookout.some(([k]) => k === 'W'));
});
