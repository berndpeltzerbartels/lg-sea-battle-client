import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotionSyncHealth } from '../src/motionSyncHealth.js';

function setup() {
  let clock = 0;
  const reports = [], warnings = [];
  const health = createMotionSyncHealth({ now: () => clock, report: (...args) => reports.push(args), warn: message => warnings.push(message) });
  return { health, reports, warnings, at: value => { clock = value; health.tick(); } };
}

test('transient failure and successful correction remain silent', () => {
  const s = setup();
  s.health.fail('offline');
  s.at(2999);
  s.health.success();
  s.at(5000);
  assert.equal(s.reports.length, 0);
  assert.equal(s.warnings.length, 0);
});

test('three seconds produces one correlated report and recovery, never per-tick spam', () => {
  const s = setup();
  s.health.remember('grounding', { x: 12, z: 23 });
  s.health.fail('offline');
  s.at(3000);
  for (let i = 0; i < 100; i++) { s.health.fail('offline'); s.at(4000 + i); }
  assert.equal(s.reports.length, 1);
  const details = s.reports[0][1];
  assert.match(s.warnings[0], new RegExp(details.id));
  assert.equal(details.history[0].event, 'grounding');
  s.health.success();
  assert.equal(s.reports[1][1].id, details.id);
  assert.equal(s.reports[1][0], 'motion-sync-recovered');
});

test('death resets the timer and history is bounded', () => {
  const s = setup();
  s.health.fail('offline');
  s.at(2000);
  s.health.reset();
  s.at(3000);
  assert.equal(s.warnings.length, 0);
  for (let i = 0; i < 1000; i++) s.health.remember('position', { x: i });
  s.health.fail('offline');
  s.at(6000);
  assert.equal(s.reports[0][1].history.length, 24);
});
