import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function syncServerProjectileHitEffects(');
const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));
const snapshotStart = source.indexOf('function applyServerShipSnapshot(');
const snapshotFn = source.slice(snapshotStart, source.indexOf('\nfunction ', snapshotStart + 1));

function fixture(hasTarget, vehicleType = 'submarine', hasSnapshot = false) {
  const splashes = [];
  const system = { hitEffectIds: new Set() };
  const target = { id: 'sub', vehicleType, state: 'active', heading: 0,
    root: { position: new Vector3(0, -5, 0), setEnabled() {} }, serverPosition: Vector3.Zero() };
  let explosions = 0;
  const begin = motion => {
    if (!['active', 'sinking'].includes(motion.state)) return;
    motion.state = 'ship-cannon-hit';
    explosions++;
  };
  const sync = new Function('flakSystem', 'scoutPlaneMode', 'playerServerShipId', 'pendingPlayerServerShip',
    'enemyMotions', 'serverShipsById', 'Vector3', 'isScoutPlaneMotion', 'isCannonServerProjectile', 'time',
    'torpedoSystem', 'createTorpedoShipWaterColumn', 'beginEnemyCannonShipHit',
    'beginEnemyShipCriticalHit', 'createScoutPlaneCriticalHitSequence', 'getProjectileHitPosition',
    `${fn}; return syncServerProjectileHitEffects;`)(system, false, 'own', null,
    hasTarget ? [target] : [], new Map(hasSnapshot ? [['sub', { id: 'sub', vehicleType, heading: 0 }]] : []), Vector3, () => false,
    id => id.startsWith('cannon-'), 0,
    { hits: 0 }, (_, position, heading, scale) => splashes.push({ position, scale }),
    begin, begin, () => {}, hit => new Vector3(hit.x, hit.y, hit.z));
  const snapshot = hit => {
    const apply = new Function('isScoutPlaneMotion', 'remoteVehicleY', 'getShipDepthState',
      'getRemoteSubmarineDepthOffset', 'pendingCriticalFlakShipHitsByTarget', 'pendingCannonShipHitsByTarget',
      'flakSystem', 'time', 'beginEnemyShipCriticalHit', 'beginEnemyCannonShipHit',
      `${snapshotFn}; return applyServerShipSnapshot;`)(() => false, ship => ship.y, () => 'periscope', () => -1.6,
      new Map(hit.id.startsWith('flak-') ? [['sub', hit]] : []),
      new Map(hit.id.startsWith('cannon-') ? [['sub', hit]] : []), system, 0, begin, begin);
    apply(target, { state: 'sunk', x: 4, y: -5, z: 8, heading: 0 });
  };
  return { sync, snapshot, splashes, explosions: () => explosions };
}

for (const hasTarget of [true, false]) {
  for (const weapon of ['cannon', 'flak']) {
    test(`${weapon} underwater hits have one surface effect each, target present=${hasTarget}`, () => {
      const { sync, splashes } = fixture(hasTarget);
      const first = { id: `${weapon}-1`, targetShipId: 'sub', x: 4, y: -5, z: 8 };
      sync([first]);
      sync([first]);
      sync([first, { ...first, id: `${weapon}-2` }]);
      assert.equal(splashes.length, 2);
      for (const splash of splashes) {
        assert.deepEqual(splash.position, new Vector3(4, 0, 8));
      }
    });
  }
}

for (const weapon of ['cannon', 'flak']) {
  for (const snapshotFirst of [true, false]) {
    test(`${weapon} effect survives snapshot/event order, snapshot first=${snapshotFirst}`, () => {
      const f = fixture(true);
      const hit = { id: `${weapon}-1`, targetShipId: 'sub', x: 4, y: -5, z: 8 };
      if (snapshotFirst) f.snapshot(hit);
      f.sync([hit]);
      f.snapshot(hit);
      f.sync([hit]);
      assert.equal(f.splashes.length, 1);
      assert.equal(f.explosions(), 1);
    });
  }
}

test('above-water surface ship hits do not acquire an additional water effect', () => {
  const { sync, splashes } = fixture(true, 'torpedo-boat');
  sync([{ id: 'cannon-1', targetShipId: 'sub', x: 4, y: .5, z: 8 }]);
  assert.equal(splashes.length, 0);
});

for (const weapon of ['cannon', 'flak']) for (const hasTarget of [true, false]) {
  test(`${weapon} periscope kill emits one large water explosion, visual target present=${hasTarget}`, () => {
    const { sync, splashes } = fixture(hasTarget, 'submarine', true);
    const hit = { id: `${weapon}-periscope`, targetShipId: 'sub', x: 4, y: .5, z: 8 };
    sync([hit]);
    sync([hit]);
    assert.equal(splashes.length, 1);
    assert.equal(splashes[0].scale, 1.6);
    assert.deepEqual(splashes[0].position, new Vector3(4, 0, 8));
  });
}
