import test from 'node:test';
import assert from 'node:assert/strict';
import { createWreckVisuals } from '../src/wreckVisuals.js';

function fixture() {
  const created = [], disposed = [];
  const visuals = createWreckVisuals({
    create(wreck, age) {
      const motion = { id: wreck.id, originalShipId: wreck.ship.id, sunkAt: wreck.sunkAt,
        state: 'sinking', x: wreck.ship.x, age };
      created.push(motion); return motion;
    },
    update(motion, dt) { motion.age += dt; if (motion.age >= 20) motion.state = 'sunk'; },
    dispose: motion => disposed.push(motion)
  });
  return { visuals, created, disposed };
}
const death = (id, sunkAt = 1, x = 0, controlledBy = 'bot') => ({ id, sunkAt,
  ship: { id: 'boat', x, controlledBy, vehicleType: 'torpedo-boat' } });
const snapshot = (wrecks, t = 2, sessionId = 'game') => ({ instanceId: 'server', sessionId, t, wrecks,
  ships: [{ id: 'boat', state: 'active', x: 1000 }] });

test('a missed death snapshot still leaves a wreck beside the already active replacement', () => {
  const f = fixture(), state = snapshot([death('first')]);
  f.visuals.sync(state, 'player');
  f.visuals.sync(state, 'player');
  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].x, 0);
  assert.equal(state.ships[0].x, 1000);
  f.visuals.tick(20, 22);
  assert.equal(f.disposed.length, 1);
  assert.equal(f.visuals.motions.size, 0);
  f.visuals.sync(snapshot([death('first')], 23), 'player');
  assert.equal(f.created.length, 1, 'finished animations never replay');
});

test('consecutive losses of one fleet slot get distinct wrecks and hit effects target the correct death', () => {
  const f = fixture();
  f.visuals.sync(snapshot([death('first'), death('second', 3, 1000)], 4), 'player');
  assert.equal(f.visuals.motions.size, 2);
  assert.equal(f.visuals.target({ targetShipId: 'boat', t: 1 }).id, 'first');
  assert.equal(f.visuals.target({ targetShipId: 'boat', t: 3 }).id, 'second');
  assert.equal(f.visuals.target({ targetShipId: 'boat', t: 4 }), undefined);
});

test('own death stays with the player camera, expired events are ignored, session change disposes wrecks', () => {
  const f = fixture();
  f.visuals.sync(snapshot([death('own', 39, 0, 'player'), death('expired', 0), death('fresh', 38)], 40), 'player');
  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].age, 2);
  f.visuals.sync(snapshot([], 0, 'new-game'), 'player');
  assert.equal(f.visuals.motions.size, 0);
  assert.equal(f.disposed.length, 1);
});

test('mass destruction has a bounded visual pool', () => {
  const f = fixture();
  f.visuals.sync(snapshot(Array.from({ length: 300 }, (_, i) => death(String(i)))), 'player');
  assert.equal(f.visuals.motions.size, 256);
  assert.equal(f.disposed.length, 44);
});
