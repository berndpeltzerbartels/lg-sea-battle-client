import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}
test('gunfire sinking foam has a fixed budget and stays at the surface independently of the hull', () => {
  const create = new Function('Vector3', 'getForwardVector', 'getRightVector', 'torpedoBoatVisualScale',
    'createJaggedSurfacePatch', `${functionSource('createGunfireSinkingFoam')}; return createGunfireSinkingFoam;`)(
    Vector3, h => new Vector3(Math.sin(h), 0, Math.cos(h)), h => new Vector3(Math.cos(h), 0, -Math.sin(h)),
    2.5, () => ({ position: Vector3.Zero(), scaling: Vector3.One(), rotation: {} }));
  const system = { nextId: 1, materials: { foam: {} }, hitEffects: [], root: {} };
  create(system, new Vector3(10, -2, 20), 0, 6.6);
  assert.equal(system.hitEffects.length, 12);
  for (const effect of system.hitEffects) {
    assert.equal(effect.mesh.parent, system.root);
    assert.equal(effect.mesh.material, system.materials.foam);
    assert.ok(effect.origin.y > 0 && effect.origin.y < .1);
    assert.equal(effect.gravity, 0);
    assert.ok(Math.abs(effect.velocity.y) < 1e-9);
    assert.equal(effect.lifetime, 8.1);
  }
});
test('foam starts once for surface gunfire sinking, not torpedoes or submerged wrecks', () => {
  let calls = 0;
  const begin = new Function('submarineWaterlineY', 'createGunfireSinkingFoam', 'torpedoSystem',
    'updateEnemyBowWake', `${functionSource('beginEnemySinking')}; return beginEnemySinking;`)(
    0, () => calls++, {}, () => {});
  for (const state of ['ship-critical-hit', 'ship-cannon-hit']) {
    const motion = { state, root: { position: Vector3.Zero() }, timers: [], heading: 0 };
    begin(motion, 1, 0);
    begin(motion, 1, 0);
  }
  assert.equal(calls, 2);
  for (const [state, vehicleType, y] of [['active', 'torpedo-boat', 0], ['ship-cannon-hit', 'submarine', -5]]) {
    begin({ state, vehicleType, root: { position: new Vector3(0, y, 0) }, timers: [] }, 1, 0);
  }
  assert.equal(calls, 2);
});
