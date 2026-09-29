import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shipVisibleAtRadarDepth, torpedoVisibleAtRadarDepth } from '../src/radarDepthVisibility.js';

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
