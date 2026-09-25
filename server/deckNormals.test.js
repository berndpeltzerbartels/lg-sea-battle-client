import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

// Exercise the production mesh builder without starting the DOM-dependent game.
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const names = ['torpedoBoatHullSections', 'createBoatDeckMesh', 'pushQuad',
  'pushOrientedQuad', 'quadNormalDot', 'createMeshFromData', 'reverseTriangleWinding'];
const functions = names.map(name => {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const end = source.indexOf('\nfunction ', start + 1);
  assert.ok(end > start);
  return source.slice(start, end);
}).join('\n');

test('deck folds preserve all faces and winding but isolate ramp normals', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const build = new Function('Mesh', 'VertexData', 'Vector3', 'scene', functions + `
      const sections=torpedoBoatHullSections();
      const corrected=createBoatDeckMesh('corrected',scene);
      const positions=[],indices=[];
      for(const s of sections){
        const w=Math.max(0,s.topWidth/2-0.001);
        positions.push(-w,s.top+0.0015,s.z,w,s.top+0.0015,s.z);
      }
      for(let i=0;i<sections.length-1;i++){
        const a=i*2,b=(i+1)*2;
        pushOrientedQuad(indices,positions,a,a+1,b+1,b,Vector3.Up());
      }
      return {corrected,positions,indices:reverseTriangleWinding(indices)};
    `);
    const {corrected,positions,indices} = build(Mesh,VertexData,Vector3,scene);
    const p=corrected.getVerticesData('position'), n=corrected.getVerticesData('normal');
    const actual=corrected.getIndices();
    assert.equal(p.length,positions.length+12, 'only four vertices duplicated');
    assert.equal(actual.length,indices.length, 'no added triangles');
    assert.deepEqual(actual.flatMap(i=>p.slice(i*3,i*3+3)), indices.flatMap(i=>positions.slice(i*3,i*3+3)));
    const rampFaces=[8,9];
    for(const face of [6,7,8,9,10,11]){
      const ids=actual.slice(face*3,face*3+3);
      const expected=[];
      VertexData.ComputeNormals(ids.flatMap(i=>p.slice(i*3,i*3+3)),[0,1,2],expected);
      assert.ok(expected[1]>0, 'deck faces point upward');
      for(const id of ids.filter(i=>[-0.22,-0.04].includes(p[i*3+2]))) for(let axis=0;axis<3;axis++) {
        assert.ok(Math.abs(n[id*3+axis]-expected[axis])<1e-7, `face ${face} has its own planar normal`);
      }
      if(rampFaces.includes(face)) assert.ok(expected[2]<-0.68);
      else assert.equal(expected[2],0);
    }
  } finally { engine.dispose(); }
});
