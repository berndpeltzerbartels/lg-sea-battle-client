import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { acquireWeaponLight, releaseWeaponLight } from '../src/weaponLightPool.js';
import { prioritizeMuzzleLight, flushMuzzleLightPriorities } from '../src/muzzleLighting.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { createProjectilePerformance } from '../src/projectilePerformance.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function updateProjectileLightBudget(');
const fn = source.slice(start, source.indexOf('\nfunction ', start+1));
const budget = new Function('acquireWeaponLight', 'releaseWeaponLight', 'Color3', 'shipGunVisualScale',
  `${fn};return updateProjectileLightBudget;`)(acquireWeaponLight, releaseWeaponLight, Color3, 3);

test('diagnostic light switch preserves projectiles and muzzle light and records comparison mode', () => {
  const engine=new NullEngine(); const scene=new Scene(engine);
  try {
    const reports=[];
    const perf=createProjectilePerformance(true,r=>reports.push(r));
    assert.equal(perf.projectileLights,false);
    const muzzle=acquireWeaponLight(scene,'muzzle',Vector3.Zero());
    const active=[{id:1,age:0,position:new Vector3(1,2,3),weaponType:'cannon'}];
    const system={scene,active};
    budget(system,3);
    const light=active[0].light;
    perf.setProjectileLights(false);
    budget(system,perf.projectileLights?3:0);
    assert.equal(active[0].light,null);
    assert.equal(light.isEnabled(),false);
    assert.equal(muzzle.isEnabled(),true);
    assert.equal(active.length,1);
    assert.deepEqual(active[0].position,new Vector3(1,2,3));
    perf.frame(1,{}); perf.frame(5001,{});
    assert.equal(reports[0].projectileLights,false);
    perf.setProjectileLights(true);
    budget(system,3);
    assert.equal(active[0].light,light);
    assert.equal(light.isEnabled(),true);
  } finally {scene.dispose();engine.dispose();}
});

test('hundreds of real projectiles use only the existing light budget and retain their trajectories', () => {
  const engine = new NullEngine(); const scene = new Scene(engine);
  try {
    const active = Array.from({length:200}, (_,id) => ({ id, age:id, position:new Vector3(id,2,3), light:null,
      weaponType:'flak', lightIntensity:.8 }));
    const system = { scene, active };
    budget(system,5);
    assert.equal(scene.lights.length,5);
    let toggles=0;
    for(const light of scene.lights) { const original=light.setEnabled.bind(light); light.setEnabled=value=>{toggles++;original(value);}; }
    for(let frame=0;frame<60;frame++) { active[0].position.x++; budget(system,5); }
    assert.equal(toggles,0);
    assert.equal(active[0].light.position.x,60);
    active[199].age=-1;
    budget(system,5);
    assert.equal(scene.lights.length,5);
    assert.equal(active[4].light,null);
    assert.ok(active[199].light);
    assert.equal(active.length,200);
    for(const p of active) releaseWeaponLight(p.light);
    assert.ok(scene.lights.every(l=>!l.isEnabled()));
  } finally {scene.dispose();engine.dispose();}
});

test('muzzle lights are reused, overlapping flashes stay independent and reordering is batched', () => {
  const engine = new NullEngine(); const scene = new Scene(engine);
  try {
    const mesh=new Mesh('deck',scene);
    const first=acquireWeaponLight(scene,'muzzle',new Vector3(1,2,3));
    const second=acquireWeaponLight(scene,'muzzle',new Vector3(4,5,6));
    assert.notEqual(first,second);
    prioritizeMuzzleLight(first); prioritizeMuzzleLight(second);
    flushMuzzleLightPriorities(scene);
    assert.equal(mesh.lightSources[0],second);
    releaseWeaponLight(first);
    const reused=acquireWeaponLight(scene,'muzzle',new Vector3(7,8,9));
    assert.equal(reused,first);
    assert.deepEqual(reused.position,new Vector3(7,8,9));
    prioritizeMuzzleLight(reused);
    flushMuzzleLightPriorities(scene);
    assert.equal(mesh.lightSources[0],reused);
    let sorts=0; mesh.lightSources.sort=()=>{sorts++;};
    flushMuzzleLightPriorities(scene);
    assert.equal(sorts,0);
    assert.equal(scene.lights.length,2);
  } finally {scene.dispose();engine.dispose();}
});
