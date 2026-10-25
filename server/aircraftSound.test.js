import test from 'node:test';
import assert from 'node:assert/strict';
import { aircraftDoppler } from '../src/aircraftSound.js';

test('approach raises pitch, recession lowers it, moving listener and altitude participate', () => {
  const listener = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
  assert.ok(aircraftDoppler({ x: 100, z: 0, vx: -20 }, listener) > 1);
  assert.ok(aircraftDoppler({ x: 100, z: 0, vx: 20 }, listener) < 1);
  assert.equal(aircraftDoppler({ x: 100, z: 0, vx: 20 }, { ...listener, vx: 20 }), 1);
  assert.ok(aircraftDoppler({ x: 0, y: 100, z: 0, vy: -20 }, listener) > 1);
  assert.equal(aircraftDoppler(listener, listener), 1);
  for (const vx of [-10000, 10000]) {
    const rate = aircraftDoppler({ x: 10, z: 0, vx }, listener);
    assert.ok(rate >= .7 && rate <= 1.35 && Number.isFinite(rate));
  }
});
