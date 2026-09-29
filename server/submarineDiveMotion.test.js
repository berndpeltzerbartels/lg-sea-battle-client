import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceSubmarineDepth } from '../src/submarineDiveMotion.js';

const move = (from, to, dt) => advanceSubmarineDepth(from, to, dt, -1.6, -6.16, .28);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('deep stage takes six seconds in either direction without overshooting', () => {
  near(move(-1.6, -6.16, 3), -3.88);
  near(move(-1.6, -6.16, 6), -6.16);
  near(move(-6.16, -1.6, 6), -1.6);
  near(move(-6.16, -1.6, 30), -1.6);
});
test('surface animation keeps its speed and transitions are frame independent', () => {
  near(move(0, -6.16, 1), -.28);
  near(move(-1.6, 0, 1), -1.32);
  for (const [from, to] of [[0, -6.16], [-6.16, 0]]) {
    let y = from;
    for (let i = 0; i < 90; i++) y = move(y, to, .1);
    near(y, move(from, to, 9));
  }
});
