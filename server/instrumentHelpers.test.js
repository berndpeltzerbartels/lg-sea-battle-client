import test from 'node:test';
import assert from 'node:assert/strict';
import { createZoomIdleTimer, submarineEchoStrength } from '../src/instrumentHelpers.js';

test('zoom resets once after thirty seconds, and real activity postpones it', () => {
  const timer = createZoomIdleTimer();
  assert.equal(timer.expired(60000), false);
  timer.touch(1000);
  assert.equal(timer.expired(30999), false);
  timer.touch(30000);
  assert.equal(timer.expired(59999), false);
  assert.equal(timer.expired(60000), true);
  assert.equal(timer.expired(90000), false);
});

test('echo uses horizontal proximity of nearest living submarine without identifying its side', () => {
  const sub = { id: 'sub', vehicleType: 'submarine', state: 'active', x: 0, z: 0, y: -50 };
  const echo = ships => submarineEchoStrength(ships, 'own', { x: 0, z: 0 }, 36);
  assert.equal(echo([sub]), 1);
  assert.equal(echo([{ ...sub, x: 18 }]), .5);
  assert.equal(echo([{ ...sub, x: 36 }]), 0);
  assert.equal(echo([{ ...sub, x: 37 }]), 0);
  assert.equal(echo([{ ...sub, id: 'own' }]), 0);
  assert.equal(echo([{ ...sub, state: 'sunk' }]), 0);
  assert.equal(echo([{ ...sub, vehicleType: 'torpedo-boat' }]), 0);
  assert.equal(echo([{ ...sub, x: NaN }]), 0);
  assert.equal(echo([{ ...sub, x: 18, teamId: 'light' }, { ...sub, x: 27, teamId: 'dark' }]), .5);
  assert.equal(echo([]), 0);
});
