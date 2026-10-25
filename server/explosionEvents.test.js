import test from 'node:test';
import assert from 'node:assert/strict';
import { createExplosionEvents } from '../src/explosionEvents.js';

test('all impact families sound once, duplicate hit/impact reports preserve own-ship priority', () => {
  const calls = [];
  const events = createExplosionEvents((...args) => calls.push(args));
  const hit = (id, fields = {}) => ({ id, x: 0, z: 0, t: 10, ...fields });
  const snapshot = { instanceId: 'server', sessionId: 'game', t: 10,
    flakHits: [hit('flak-1', { targetShipId: 'own' }), hit('cannon-1', { targetShipId: 'enemy' })],
    flakImpacts: [hit('flak-1', { reason: 'ship-hit' }), hit('cannon-1', { reason: 'ship-hit' }),
      hit('flak-water', { reason: 'sea-hit' }), hit('cannon-water', { reason: 'sea-hit' }), hit('expired', { reason: 'expired' })],
    torpedoImpacts: [hit('torpedo', { reason: 'ship-hit', targetShipId: 'own' }), hit('old', { reason: 'expired' })],
    bombImpacts: [hit('bomb', { reason: 'sea-hit' })],
    depthCharges: [hit('charge', { exploded: true, explodesAt: 10, targetShipIds: ['own'] })] };
  events.consume(snapshot, 'own');
  events.consume(snapshot, 'own');
  assert.equal(calls.length, 7);
  assert.equal(calls[0][2], true);
  assert.ok(calls[0][3].variant < 3);
  assert.equal(calls[1][3].variant, 6);
  assert.ok(calls[2][3].variant >= 3 && calls[2][3].variant < 6);
  assert.equal(calls[4][2], true);
  assert.ok(calls[4][3].rate < calls[1][3].rate);
  assert.equal(calls[6][2], true);
});

test('old reports are silent, rapid flak hits coalesce, a new session can replay IDs', () => {
  const calls = [];
  const events = createExplosionEvents((...args) => calls.push(args));
  const hit = (id, t) => ({ id, x: 0, z: 0, targetShipId: 'own', t });
  const state = { sessionId: 'one', t: 10, flakHits: [hit('old', 1), hit('first', 10), hit('fast', 10.01), hit('next', 10.2)] };
  events.consume(state, 'own');
  assert.equal(calls.length, 2);
  events.consume({ ...state, sessionId: 'two' }, 'own');
  assert.equal(calls.length, 4);
});

test('deep submarine hits select underwater-only sound and collision prioritizes either own participant', () => {
  const calls = [];
  const events = createExplosionEvents((...args) => calls.push(args));
  events.consume({ instanceId: 'underwater', t: 10,
    ships: [{ id: 'sub', vehicleType: 'submarine', y: -10 }],
    torpedoImpacts: [{ id: 'torpedo', reason: 'ship-hit', targetShipId: 'sub', x: 1, z: 2, t: 10 }],
    ramHits: [{ id: 'ram', shipId: 'own', targetShipId: 'other', x: 1, z: 2, t: 10 }] }, 'own');
  assert.equal(calls[0][3].variant, 8);
  assert.equal(calls[0][3].underwaterOnly, true);
  assert.equal(calls[1][3].variant, 9);
  assert.equal(calls[1][2], true);
});

test('torpedo ship and coast hits retain a strong attack and reduced distance loss', () => {
  const calls = [];
  const events = createExplosionEvents((...args) => calls.push(args));
  events.consume({ instanceId: 'loud-torpedo', t: 10, torpedoImpacts: [
    { id: 'ship', reason: 'ship-hit', x: 500, z: 0, t: 10 },
    { id: 'coast', reason: 'land-hit', x: 500, z: 0, t: 10 }
  ] }, 'own');
  assert.equal(calls.length, 2);
  for (const [, , , options] of calls) {
    assert.equal(options.variant, 6, 'use explosion attack rather than a rumble-only recording');
    assert.ok(options.gain > 2);
    assert.equal(options.rangeScale, 3);
    assert.equal(options.noDucking, true);
  }
});
