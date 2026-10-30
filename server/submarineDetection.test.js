import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSubmarineDetectionVisible as visible } from '../src/submarineDetection.js';
const ship = { vehicleType: 'submarine', state: 'active', depthState: 'periscope', lifeId: 4 };
const report = { lifeId: 4, until: 3 };
test('search report remains visible for three seconds and clears on expiry, including missing reports', () => {
  assert.equal(visible(report, ship, 2.9), true);
  assert.equal(visible(report, ship, 3), false);
  assert.equal(visible(undefined, ship, 10), false);
  assert.equal(visible(report, ship, undefined), false);
});
test('eye is limited to a living submarine at periscope depth and its current life', () => {
  for (const change of [{ depthState: 'submerged' }, { depthState: 'surface' }, { state: 'sinking' },
    { vehicleType: 'torpedo-boat' }, { lifeId: 5 }]) assert.equal(visible(report, { ...ship, ...change }, 1), false);
});
