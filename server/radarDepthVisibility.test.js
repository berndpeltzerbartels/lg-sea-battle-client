import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usesUnderwaterRadar, shipVisibleAtRadarDepth, torpedoVisibleAtRadarDepth, torpedoTargetAtDepth } from '../src/radarDepthVisibility.js';

test('torpedo hit indication follows actual launch and target depth, not radar visibility', () => {
  const scale = 3;
  for (const vehicleType of ['torpedo-boat', 'submarine', 'scout-plane']) {
    for (const [depthState, y] of [['surface', 0], ['periscope', -5.58], ['submerged', -9.63]]) {
      const contact = { vehicleType, depthState, y };
      assert.equal(torpedoTargetAtDepth(-9.03, contact, scale), vehicleType === 'submarine' && depthState === 'submerged');
      assert.equal(torpedoTargetAtDepth(.05, contact, scale), vehicleType === 'torpedo-boat' || vehicleType === 'submarine' && depthState === 'surface');
    }
  }
  assert.equal(torpedoTargetAtDepth(-9.03, { vehicleType: 'submarine', depthState: 'submerged', y: -15 }, scale), false);
  assert.equal(torpedoTargetAtDepth(-9.03, { vehicleType: 'submarine', depthState: 'submerged', y: 0 }, scale), false);
});

test('underwater radar sees all ships but no aircraft; surface radar hides submerged submarines', () => {
  for (const underwater of [false, true]) {
    for (const type of ['torpedo-boat', 'submarine', 'scout-plane']) {
      for (const depth of ['surface', 'periscope', 'submerged']) {
        const submerged = type === 'submarine' && depth !== 'surface';
        assert.equal(shipVisibleAtRadarDepth(underwater, type, depth), underwater ? type !== 'scout-plane' : !submerged);
      }
    }
  }
});

test('underwater radar sees running torpedoes at both depths; surface radar hides deep torpedoes', () => {
  for (const underwater of [false, true]) {
    for (const y of [.05, -9]) {
      for (const state of ['running', 'airborne', 'hit', 'expired']) {
        assert.equal(torpedoVisibleAtRadarDepth(underwater, { y, state }),
          state === 'running' && (underwater || y >= -1));
      }
    }
    assert.equal(torpedoVisibleAtRadarDepth(underwater, null), false);
  }
});

test('radar remains restricted between deep and periscope depth', () => {
  for (const actual of [-6.16, -5, -3, -1.7]) {
    assert.equal(usesUnderwaterRadar(true, actual, -1.6), true);
  }
  for (const actual of [-1.67, -1.6, -.5, 0]) {
    assert.equal(usesUnderwaterRadar(true, actual, -1.6), false);
  }
  assert.equal(usesUnderwaterRadar(false, -6.16, -1.6), false);
});
