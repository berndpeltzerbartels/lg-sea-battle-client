import test from 'node:test';
import assert from 'node:assert/strict';
import { projectedDiameter, shouldShowProjectile, updateProjectileScreenVisibility } from '../src/projectileScreenVisibility.js';
import { createProjectilePerformance } from '../src/projectilePerformance.js';

const identity = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
test('pixel estimate follows zoom, resolution, and observer distance rather than flight distance', () => {
  const p = { x: 0, y: 0, z: 1000 };
  const size = projectedDiameter(p, .3, identity, identity, 1000, 800);
  assert.ok(size < .45);
  const zoom = [...identity]; zoom[0] = zoom[5] = 4;
  assert.ok(projectedDiameter(p, .3, identity, zoom, 1000, 800) > .75);
  assert.ok(projectedDiameter(p, .3, identity, identity, 4000, 3200) > .75);
  assert.ok(projectedDiameter({ ...p, z: 10 }, .3, identity, identity, 1000, 800) > .75);
});
test('thresholds have hysteresis and near-camera or unknown sizes stay visible', () => {
  assert.equal(shouldShowProjectile(.6, true), true);
  assert.equal(shouldShowProjectile(.6, false), false);
  assert.equal(shouldShowProjectile(.4, true), false);
  assert.equal(shouldShowProjectile(.8, false), true);
  assert.equal(shouldShowProjectile(Infinity, false), true);
});
test('hiding affects only model and trail, restores on zoom or disable, and avoids repeated toggles', () => {
  let toggles = 0;
  const mesh = z => ({ position: {x:0,y:0,z}, scaling:{x:1}, setEnabled(value) { this.enabled=value; toggles++; },
    getBoundingInfo: () => ({ boundingSphere: { radius:.3 } }) });
  const p = { root:mesh(2000), core:mesh(2000), trail:[mesh(2000)], position:{x:0,y:0,z:2000}, velocity:{z:20}, light:{} };
  const camera = { getViewMatrix: () => ({m:identity}), getProjectionMatrix: () => ({m:identity}) };
  updateProjectileScreenVisibility(p,camera,1000,800,true);
  assert.equal(p.screenHidden,true);
  updateProjectileScreenVisibility(p,camera,1000,800,true);
  assert.equal(toggles,2);
  assert.deepEqual(p.velocity,{z:20});
  assert.deepEqual(p.light,{});
  // A nearby trail must remain visible even when the core is far away.
  p.trail[0].position.z=20;
  updateProjectileScreenVisibility(p,camera,1000,800,true);
  assert.equal(p.screenHidden,false);
  p.trail[0].position.z=2000;
  updateProjectileScreenVisibility(p,camera,1000,800,true);
  updateProjectileScreenVisibility(p,camera,1000,800,false);
  assert.equal(p.screenHidden,false);
});
test('diagnostics aggregate, bound history, reset comparison windows, and do nothing when disabled', () => {
  const output=[];
  const perf=createProjectilePerformance(true, r=>output.push(r));
  for(let i=1;i<=400;i++) { perf.record('jsonParseMs',.1); perf.frame(i*1000,{cannonHidden:3}); }
  assert.equal(perf.reports.length,60);
  assert.ok(output.length>60);
  assert.equal(output[0].metrics.cannonHidden.mean,3);
  perf.setCulling(false);
  perf.frame(401000,{}); perf.frame(406000,{});
  assert.equal(output.at(-1).culling,false);
  const off=createProjectilePerformance(false,()=>assert.fail());
  off.record('x',3); off.frame(1,{}); off.frame(9000,{});
  assert.equal(off.reports.length,0);
});
