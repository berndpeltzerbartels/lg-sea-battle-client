import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}
const functions = ['beginEnemyShipCriticalHit', 'beginEnemySinking', 'updateEnemySinking'].map(extract).join('\n');

for (const depth of [-5.58, -9.63]) {
  test(`actual flak death animation never raises submerged boat from ${depth}`, () => {
    const api = new Function('Vector3', 'Quaternion', `
      const submarineWaterlineY = -.78, torpedoBoatSinkDepth = 12;
      const getStableSinkSide = () => 1;
      const updateEnemyBowWake = () => {}, hideEnemyWake = () => {};
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const easeInOutCubic = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
      const document = { body: { dataset: {} } };
      ${functions}
      return { beginEnemyShipCriticalHit, updateEnemySinking };
    `)(Vector3, Quaternion);
    let enabled = true;
    const motion = { id: 'sub', vehicleType: 'submarine', state: 'active', speed: 0, heading: .4,
      root: { position: new Vector3(0, depth, 0), setEnabled: value => { enabled = value; } }, timers: [] };
    api.beginEnemyShipCriticalHit(motion, { id: 'flak-1', x: 0, y: depth, z: 0 }, 0);
    assert.equal(motion.state, 'sinking', 'No surface burning stage');
    assert.equal(motion.sinkStartY, depth);
    let previousY = depth;
    for (let frame = 1; frame <= 400 && enabled; frame++) {
      api.updateEnemySinking(motion, 1/60, frame/60);
      assert.ok(motion.root.position.y <= previousY, 'Depth must only increase');
      const angles = motion.root.rotationQuaternion.toEulerAngles();
      assert.ok(Math.abs(angles.x) < 1e-8 && Math.abs(angles.z) < 1e-8, 'No pitch/roll lifting the hull');
      previousY = motion.root.position.y;
      if (frame === 20) api.beginEnemyShipCriticalHit(motion, { id: 'flak-1' }, frame/60);
      assert.equal(motion.sinkStartY, depth, 'Repeated event must not restart sinking');
    }
    assert.equal(enabled, false);
    assert.equal(motion.state, 'sunk');
  });
}
