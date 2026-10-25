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
test('foam starts once for surface gunfire sinking, including torpedoes, but not submerged wrecks', () => {
  let calls = 0;
  const begin = new Function('submarineWaterlineY', 'createGunfireSinkingFoam', 'torpedoSystem',
    'updateEnemyBowWake', `${functionSource('beginEnemySinking')}; return beginEnemySinking;`)(
    0, () => calls++, {}, () => {});
  for (const state of ['ship-critical-hit', 'ship-cannon-hit']) {
    const motion = { state, root: { position: Vector3.Zero() }, timers: [], heading: 0 };
    begin(motion, 1, 0);
    assert.ok(motion.sinkDuration >= 18);
    begin(motion, 1, 0);
  }
  assert.equal(calls, 2);
  for (const [state, vehicleType, y] of [['active', 'torpedo-boat', 0], ['ship-cannon-hit', 'submarine', -5]]) {
    begin({ state, vehicleType, root: { position: new Vector3(0, y, 0) }, timers: [] }, 1, 0);
  }
  assert.equal(calls, 3);
});

for (const weapon of ['Cannon', 'Critical']) {
  test(`${weapon}: surfaced submarine uses normal ship effects and foam; underwater uses neither`, () => {
    const fnName = weapon === 'Cannon' ? 'beginEnemyCannonShipHit' : 'beginEnemyShipCriticalHit';
    let explosions = 0, foam = 0;
    const begin = new Function('submarineWaterlineY', 'createGunfireSinkingFoam', 'torpedoSystem',
      'updateEnemyBowWake', 'getStableSinkSide', 'getProjectileHitPosition', 'createShipDamageAnchor',
      'flakSystem', 'Vector3', 'createShipSuperstructureExplosion', 'createShipSuperstructureHitSequence',
      'createCannonShipHitEffect',
      `${functionSource('beginEnemySinking')}\n${functionSource(fnName)}; return { hit: ${fnName}, sink: beginEnemySinking };`)(
      0, () => foam++, {}, () => {}, () => 1, () => Vector3.Zero(), () => ({}), {}, Vector3,
      () => explosions++, () => {}, () => explosions++);
    for (const vehicleType of ['torpedo-boat', 'submarine']) {
      const motion = { vehicleType, state: 'active', root: { position: new Vector3(0, vehicleType === 'submarine' ? -5 : 0, 0) }, timers: [] };
      begin.hit(motion, { targetY: 0 }, 0);
      assert.equal(motion.state, weapon === 'Cannon' ? 'ship-cannon-hit' : 'ship-critical-hit');
      begin.sink(motion, 1, 0);
      assert.equal(motion.submergedSinking, false);
    }
    assert.equal(explosions, 2);
    assert.equal(foam, 2);
    const underwater = { vehicleType: 'submarine', state: 'active', root: { position: Vector3.Zero() }, timers: [] };
    begin.hit(underwater, { targetY: -5 }, 0);
    assert.equal(underwater.state, 'sinking');
    assert.equal(underwater.submergedSinking, true);
    assert.equal(underwater.sinkStartY, -5);
    assert.equal(explosions, 2);
    assert.equal(foam, 2);
  });
}

test('own surface ship creates foam once, deep submarine does not', () => {
  for (const [submarineMode, y, expected] of [[false, 0, 1], [true, 0, 1], [true, -5, 0]]) {
    let calls = 0;
    const begin = new Function('submarineMode', 'createGunfireSinkingFoam', `
      let playerDamageState = 'active', playerSinkStartTime, playerSinkStartY, playerSinkSide;
      let engineOrder, heldRudderDirection, rudderDegrees, turnVelocity = 0, speed = 0;
      const submarineWaterlineY = 0, heading = 0, playerServerShipId = 'own', pendingPlayerServerShip = null;
      const boat = { root: { position: { x: 0, y: ${y}, z: 0 } } }, torpedoSystem = {};
      const invalidatePlayerMotionLife = () => {}, sendClientGameEvent = () => {};
      const getPlayerSinkSide = () => 1, updateSinkingWaterOverlay = () => {};
      ${functionSource('beginPlayerSinking')}
      return beginPlayerSinking;
    `)(submarineMode, (_system, _position, _heading, duration) => { calls++; assert.equal(duration, 18); });
    begin(null, 0);
    begin(null, 1);
    assert.equal(calls, expected);
  }
});
