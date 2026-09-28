import test from 'node:test';
import assert from 'node:assert/strict';
import { createDepthChargeEvents } from '../src/depthChargeEvents.js';

test('release and explosion play exactly once, even without a flying projectile', () => {
  const releases = [], explosions = [];
  const events = createDepthChargeEvents(c => releases.push(c.id), c => explosions.push(c.id));
  const charge = { id: 'a', releasedAt: 0, explodesAt: 2.5, exploded: false };
  events.consume('round', [charge], 0);
  events.consume('round', [charge], .1);
  events.consume('round', [{ ...charge, exploded: true }], 2.5);
  events.consume('round', [{ ...charge, exploded: true }], 2.6);
  events.consume('round', [{ ...charge, id: 'b', exploded: true }], 2.6);
  assert.deepEqual(releases, ['a']);
  assert.deepEqual(explosions, ['a', 'b']);
  events.consume('new-round', [charge], 0);
  assert.deepEqual(releases, ['a', 'a']);
});
