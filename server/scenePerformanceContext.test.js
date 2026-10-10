import test from 'node:test';
import assert from 'node:assert/strict';
import { collectScenePerformanceContext } from '../src/scenePerformanceContext.js';
import { createProjectilePerformance } from '../src/projectilePerformance.js';

test('context distinguishes ship course from active-camera bearing and counts only active geometry', () => {
  const mesh = (name, category) => ({ material:{name}, metadata:{performanceCategory:category},
    subMeshes:[{}], getTotalIndices:()=>300 });
  const data = [mesh('terrain_material','landscape'), mesh('foam_material','landscape'), mesh('smoke_material','landscape'), mesh('hull')];
  const scene = { getActiveMeshes:()=>({data,length:3}), activeCamera:{name:'gun',position:{x:1,y:2,z:3},
    fov:.2,getForwardRay:()=>({direction:{x:1,y:0,z:0}})} };
  const context=collectScenePerformanceContext(scene,{x:10,y:0,z:20},0,'flak');
  assert.equal(context.camera.headingDegrees,90);
  assert.equal(context.ship.headingDegrees,0);
  assert.equal(context.ship.station,'flak');
  assert.equal(context.camera.fov,.2);
  assert.deepEqual(context.categories.landscape,{meshes:1,triangles:100,subMeshes:1});
  assert.equal(context.categories.foam.meshes,1);
  assert.equal(context.categories.effects.meshes,1);
  assert.equal(context.materials.hull,undefined);
});

test('context sampling is throttled, absent when disabled or hidden, and retained with its report', () => {
  let calls=0;
  const collect=()=>({sequence:++calls});
  const reports=[];
  const perf=createProjectilePerformance(true,r=>reports.push(r));
  for(let t=10;t<=5010;t+=10) perf.frame(t,{},true,collect);
  assert.equal(calls,6);
  assert.equal(reports[0].contextSamples.length,6);
  assert.equal(reports[0].contextSamples[1].frameMs,10);
  assert.ok(reports[0].metrics.diagnosticContextMs);
  perf.frame(6010,{},false,collect);
  assert.equal(calls,6);
  createProjectilePerformance(false).frame(7000,{},true,collect);
  assert.equal(calls,6);
});
