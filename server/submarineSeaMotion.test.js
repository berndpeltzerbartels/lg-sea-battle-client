import test from 'node:test';
import assert from 'node:assert/strict';
import { submarineSeaMotionFactor } from '../src/submarineSeaMotion.js';

test('surfaced submarines have only a quarter of their previous sea motion', () => {
  assert.equal(submarineSeaMotionFactor('surface', 0), .25);
});

test('diving, periscope and submerged boats have no sea motion', () => {
  for (const depth of ['periscope', 'submerged']) {
    for (const offset of [0, -.5, -1.86, -3.21]) {
      assert.equal(submarineSeaMotionFactor(depth, offset), 0);
    }
  }
});

test('surfacing order does not restore rocking while the hull is still underwater', () => {
  assert.equal(submarineSeaMotionFactor('surface', -3.21), 0);
  assert.equal(submarineSeaMotionFactor('surface', -.1), 0);
});
