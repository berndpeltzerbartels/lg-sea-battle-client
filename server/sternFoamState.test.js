import test from 'node:test';
import assert from 'node:assert/strict';
import { createSternFoamState } from '../src/sternFoamState.js';

test('deposits three lanes and leaves old foam anchored through a turn', () => {
  const state = createSternFoamState(3);
  state.update({x:0,z:0},0,17,1,.1);
  state.update({x:0,z:3},0,17,1,.1);
  const first = state.patches.slice(0,3).map(p=>({...p}));
  assert.deepEqual(first.map(p=>p.lane),[-1,0,1]);
  state.update({x:4,z:3},Math.PI/2,17,1,.1);
  for(let i=0;i<3;i++)assert.deepEqual(state.patches[i], first[i]);
  assert.ok(first[0].x < first[1].x && first[1].x < first[2].x);
});
test('pool is bounded and stationary foam ages out without spawning', () => {
  const state = createSternFoamState(3);
  for(let i=0;i<10000;i++) state.update({x:0,z:i},0,17,1,.05);
  assert.equal(state.patches.length,144);
  const born=state.patches.map(p=>p.born);
  state.update({x:0,z:9999},0,0,0,7);
  assert.deepEqual(state.patches.map(p=>p.born),born);
  assert.ok(state.patches.every(p=>state.now-p.born>p.life));
});
test('teleports clear previous foam and do not draw a trail across the map', () => {
  const state=createSternFoamState(3);
  state.update({x:0,z:0},0,17,1,.1);
  state.update({x:0,z:3},0,17,1,.1);
  state.update({x:1000,z:1000},0,17,1,.1);
  assert.ok(state.patches.every(p=>p.born===-Infinity));
});
