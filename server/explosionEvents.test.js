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
  assert.ok(calls[4][3].variant >= 11 && calls[4][3].variant <= 13);
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

test('torpedo ship and coast hits use distinct wet and dry attacks with reduced distance loss', () => {
  const calls = [];
  const events = createExplosionEvents((...args) => calls.push(args));
  events.consume({ instanceId: 'loud-torpedo', t: 10, torpedoImpacts: [
    { id: 'ship', reason: 'ship-hit', x: 500, z: 0, t: 10 },
    { id: 'coast', reason: 'land-hit', x: 500, z: 0, t: 10 }
  ] }, 'own');
  assert.equal(calls.length, 2);
  for (const [, , , options] of calls) {
    assert.equal(options.waterExplosion, true, 'coastal blasts also propagate through water');
    assert.equal(options.rangeScale, 3);
    assert.equal(options.noDucking, true);
  }
  assert.ok(calls[0][3].variant >= 11 && calls[0][3].variant <= 13);
  assert.equal(calls[0][3].lowpassHz, 750);
  assert.equal(calls[0][3].rate, .92);
  assert.equal(calls[0][3].underwaterRate, .82);
  assert.equal(calls[1][3].variant, 6);
  assert.equal(calls[1][3].lowpassHz, 1800);
  assert.ok(calls[1][3].gain < calls[0][3].gain);
});

test('depth charges share the wet explosion family but are lower and a little quieter than torpedoes', () => {
  const calls = [];
  const events = createExplosionEvents((...args) => calls.push(args));
  events.consume({ instanceId: 'balance', t: 10,
    torpedoImpacts: [{ id: 'torpedo', reason: 'ship-hit', x: 0, z: 0, t: 10 }],
    depthCharges: [{ id: 'depth', exploded: true, explodesAt: 10, x: 0, z: 0 }] }, 'own');
  const torpedo = calls[0][3], depth = calls[1][3];
  assert.ok(depth.variant >= 14 && depth.variant <= 16);
  assert.ok(depth.rate < torpedo.rate);
  assert.ok(depth.gain < torpedo.gain && depth.gain > torpedo.gain * .8);
  assert.equal(depth.rangeScale, torpedo.rangeScale);
  assert.equal(depth.noDucking, true);
});


test('submerged flak hits and a newly sunk submarine produce wet explosions without replaying sunk snapshots', () => {
  const calls = [];
  const events = createExplosionEvents((...args) => calls.push(args));
  const ship = { id: 'sub', vehicleType: 'submarine', state: 'active', x: 1, y: -10, z: 2 };
  events.consume({ t: 10, ships: [ship] });
  const snapshot = { t: 11, ships: [{ ...ship, state: 'sunk' }],
    flakHits: [{ id: 'flak-sub', targetShipId: 'sub', targetY: -10, x: 1, z: 2, t: 11 }] };
  events.consume(snapshot);
  events.consume({ ...snapshot, t: 12 });
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.ok(call[3].variant >= 14 && call[3].variant <= 16);
    assert.equal(call[3].waterExplosion, true);
    assert.equal(call[3].underwaterOnly, undefined, 'the shooter above water also hears the destruction');
  }
  const initial = [];
  createExplosionEvents((...args) => initial.push(args)).consume(snapshot);
  assert.equal(initial.length, 1, 'joining must not replay an existing wreck explosion');
});


test('depth charges boost underwater listening especially when hitting the own submarine', () => {
  const calls = [];
  createExplosionEvents((...args) => calls.push(args)).consume({ t: 10, depthCharges: [
    { id: 'near', x: 30, z: 0, exploded: true, explodesAt: 10, targetShipIds: [] },
    { id: 'hit', x: 0, z: 0, exploded: true, explodesAt: 10, targetShipIds: ['own'] }
  ] }, 'own');
  assert.equal(calls[0][3].underwaterGain, 2);
  assert.equal(calls[1][3].underwaterGain, 3);
  assert.equal(calls[1][2], true);
  assert.equal(calls[1][3].noDucking, true);
});
