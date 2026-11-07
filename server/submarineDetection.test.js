import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSubmarineDetectionVisible as visible } from '../src/submarineDetection.js';
const ship = { vehicleType: 'submarine', state: 'active', depthState: 'periscope', lifeId: 4 };
const report = { lifeId: 4, until: 60 };
test('hunt remains visible until its deadline and clears on expiry, including missing reports', () => {
  assert.equal(visible(report, ship, 59.9), true);
  assert.equal(visible(report, ship, 60), false);
  assert.equal(visible(undefined, ship, 10), false);
  assert.equal(visible(report, ship, undefined), false);
});
test('eye is limited to a living submarine and its current life', () => {
  for (const change of [{ state: 'sinking' },
    { vehicleType: 'torpedo-boat' }, { lifeId: 5 }]) assert.equal(visible(report, { ...ship, ...change }, 1), false);
});

test('hunt remains visible at every depth and a renewal extends its deadline', () => {
  for (const depthState of ['surface', 'periscope', 'submerged'])
    assert.equal(visible(report, { ...ship, depthState }, 30), true);
  assert.equal(visible({ ...report, until: 90 }, ship, 70), true);
  assert.equal(visible(report, ship, 70), false);
});
