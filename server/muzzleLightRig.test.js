import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createMuzzleLightRig } from '../src/muzzleLighting.js';
import { acquireMuzzleFlash, releaseMuzzleFlash } from '../src/muzzleFlashPool.js';

function fixture(mode = 'crew') {
  const engine = new NullEngine(), scene = new Scene(engine);
  const water = new Mesh('water', scene), deck = new Mesh('own-deck', scene), other = new Mesh('other-ship', scene), island = new Mesh('island', scene);
  const rig = createMuzzleLightRig(scene, {water, ownShipMeshes: [deck], observerPosition: Vector3.Zero(), mode});
  return {scene,water,deck,other,island,rig,close() {scene.dispose();engine.dispose();}};
}

test('water and crew have separate fixed budgets; terrain and other ships stay excluded', () => {
  const f = fixture();
  try {
    assert.equal(f.scene.lights.length, 4);
    for (const light of f.scene.lights) {
      assert.equal(light.canAffectMesh(f.island), false);
      assert.equal(light.canAffectMesh(f.other), false);
      assert.notEqual(light.canAffectMesh(f.deck), light.canAffectMesh(f.water));
    }
    f.rig.flash(new Vector3(1,2,3), 'flak', true);
    f.rig.flash(new Vector3(4,5,6), 'cannon', true);
    const crew = f.rig.snapshot().filter(s=>s.role.startsWith('crew'));
    assert.ok(crew.every(s=>s.intensity>0));
    f.rig.update(1);
    assert.ok(f.rig.snapshot().every(s=>s.intensity===0 && s.enabled));
  } finally {f.close();}
});

test('a thousand shots never toggle lights, rescan scene light membership or reorder mesh lights', () => {
  const f = fixture();
  try {
    let scans=0, toggles=0, sorts=0;
    for (const light of f.scene.lights) { light._resyncMeshes=()=>scans++; light.setEnabled=()=>toggles++; }
    for (const mesh of f.scene.meshes) mesh.lightSources.sort=()=>sorts++;
    for(let i=0;i<1000;i++) {f.rig.flash(new Vector3(i%50,2,10),i%2?'cannon':'flak',i%3===0);f.rig.update(.01);}
    assert.equal(f.scene.lights.length,4);
    assert.deepEqual({scans,toggles,sorts},{scans:0,toggles:0,sorts:0});
    assert.ok(f.rig.snapshot().every(s=>s.enabled));
  } finally {f.close();}
});

test('distant or remote guns cannot take away the crew lighting', () => {
  const f=fixture();
  try {
    f.rig.flash(new Vector3(0,2,0),'flak',true);
    const crew=f.scene.lights.find(l=>l.name==='muzzle-crew-flak');
    f.rig.flash(new Vector3(100,2,100),'flak',false);
    assert.deepEqual(crew.position,new Vector3(0,2,0));
    const before=f.rig.snapshot();
    f.rig.flash(new Vector3(10000,2,10000),'cannon',false);
    assert.deepEqual(f.rig.snapshot(),before);
    assert.ok(f.rig.snapshot().filter(s=>s.role.startsWith('crew')).some(s=>s.intensity>0));
  } finally {f.close();}
});

test('water-only and unlit modes retain no unwanted light memberships', () => {
  for (const mode of ['water','none']) {
    const f=fixture(mode);
    try {
      assert.equal(f.scene.lights.length,mode==='water'?2:0);
      f.rig.flash(Vector3.Zero(),'flak',true);
      assert.ok(f.scene.lights.every(light=>light.canAffectMesh(f.water)&&!light.canAffectMesh(f.deck)));
    } finally {f.close();}
  }
});

test('flash geometry is reused, resets correctly and never suppresses concurrent gun activity', () => {
  const f=fixture();
  try {
    const owner={};let created=0;
    const flash=()=>acquireMuzzleFlash(owner,'flak',()=>{created++;return new Mesh('flash',f.scene);});
    const first=flash();first.visibility=.1;first.scaling.setAll(4);
    releaseMuzzleFlash(first);releaseMuzzleFlash(first);
    const next=flash();assert.equal(first,next);assert.equal(next.visibility,1);assert.equal(next.scaling.x,1);
    assert.equal(created,1);
    const overlapping=Array.from({length:200},flash);
    assert.equal(new Set(overlapping).size,200);
    assert.ok(overlapping.every(m=>m.isEnabled()));
    for(const m of [next,...overlapping])releaseMuzzleFlash(m);
    assert.equal(f.scene.meshes.filter(m=>m.name==='flash').length,32);
  } finally {f.close();}
});
