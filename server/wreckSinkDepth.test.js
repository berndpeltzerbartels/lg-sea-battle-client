import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const constant = name => source.match(new RegExp(`const ${name} = ([^;]+);`))[1];
const floor = Number(constant('underwaterSeaFloorY'));
const margin = Number(constant('torpedoBoatModelSinkDepth')) * 5;
const sinkDepth = new Function('underwaterSeaFloorY', 'torpedoBoatModelSinkDepth', 'torpedoBoatVisualScale',
  `return ${constant('torpedoBoatSinkDepth')}`)(floor, Number(constant('torpedoBoatModelSinkDepth')), 5);
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}

for (const startY of [-1, -6, -18]) {
  test(`wreck from ${startY} reaches darkness before being hidden`, () => {
    let hidden = false;
    const motion = { sinkAge: 0, sinkDuration: 11.2, speed: 0, rollImpulse: 0,
      heading: 0, sinkSide: 1, sinkStartY: startY, submergedSinking: startY < -1,
      root: { position: new Vector3(0, startY, 0), setEnabled: () => { hidden = true; } } };
    const update = new Function('Vector3', 'Quaternion', 'torpedoBoatSinkDepth', `
      const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
      const easeInOutCubic = t => t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
      const updateEnemyBowWake = () => {}, hideEnemyWake = () => {};
      const document = {body:{dataset:{}}};
      ${extract('updateEnemySinking')}
      return updateEnemySinking;
    `)(Vector3, Quaternion, sinkDepth);
    update(motion, 5.2, 5.2);
    assert.equal(hidden, false, 'Do not retire at the old animation deadline');
    update(motion, 6, 11.2);
    assert.equal(hidden, true);
    assert.ok(motion.root.position.y + margin <= floor, 'Entire wreck must be below the dark floor');
    assert.equal(motion.state, 'sunk');
  });
}
