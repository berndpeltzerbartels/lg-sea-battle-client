import test from 'node:test';
import assert from 'node:assert/strict';
import { periscopeMastTop, periscopeLiftAtDepth, periscopeFoamStrength } from '../src/periscopeGeometry.js';
import { createPeriscopeFoamState } from '../src/periscopeFoamState.js';
test('twenty percent more exposed mast at actual periscope depth, retracted at surface and deep', () => {
  assert.ok(Math.abs((periscopeMastTop - 1.86 + periscopeLiftAtDepth(-1.6)) / (periscopeMastTop - 1.86) - 1.2) < 1e-10);
  assert.equal(periscopeLiftAtDepth(0), 0);
  assert.equal(periscopeLiftAtDepth(-6.16), 0);
});
test('small periscope foam stays anchored, bounded, works in reverse and dissolves', () => {
  const state = createPeriscopeFoamState(3);
  state.update({x:0,z:0},0,9,1,.1);
  state.update({x:0,z:1},0,9,1,.1);
  const first = {...state.patches[0]};
  state.update({x:1,z:1},Math.PI/2,9,1,.1);
  assert.deepEqual(state.patches[0],first);
  for(let i=0;i<500;i++)state.update({x:1,z:-i},0,-9,1,.05);
  assert.equal(state.patches.length,164);
  const born=state.patches.map(p=>p.born);
  state.update({x:1,z:-499},0,0,0,2.3);
  assert.deepEqual(state.patches.map(p=>p.born),born);
  assert.ok(state.patches.every(p=>state.now-p.born>p.life));
});

test('Slow is quiet but one third has a modest trace and FULL is brightest', () => {
  assert.equal(periscopeFoamStrength(.9,.9,9),0);
  const third=periscopeFoamStrength(2.93,.9,9);
  assert.ok(third>.08 && third<.3);
  assert.equal(periscopeFoamStrength(9,.9,9),1);
});
test('FULL outer trail lasts 50 percent longer and pressure waves cover both mast positions', () => {
  const state=createPeriscopeFoamState(3);
  state.update({x:0,z:0},0,9,1,.1);
  state.update({x:0,z:1},0,9,1,.1);
  assert.ok(Math.abs(state.patches[0].life-2.1)<1e-10);
  const heads=state.patches.filter(p=>p.head);
  assert.equal(heads.length,20);
  assert.ok(heads.some(p=>p.z>1+.184*3));
  assert.ok(heads.some(p=>p.x<0) && heads.some(p=>p.x>0));
});
