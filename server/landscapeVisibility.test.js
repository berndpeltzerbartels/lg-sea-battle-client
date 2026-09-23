import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { prepareLandscapeVisibility, updateLandscapeCameraLayers, splitAtWaterline, SURFACE_LAYER, UNDERWATER_LAYER } from '../src/landscapeVisibility.js';

test('waterline splitting preserves area, winding, attributes and shared edge vertices', () => {
  const attributes = {
    position: {size:3, data:[0,-1,0, 2,1,0, 0,1,0]},
    normal: {size:3, data:[0,0,1, 0,0,1, 0,0,1]},
    uv: {size:2, data:[0,0, 1,1, 0,1]}
  };
  const result = splitAtWaterline(attributes, new Uint16Array([0,1,2]), [-1,1,1]);
  let area=0;
  for (const [side, part] of Object.entries(result)) {
    const p=part.attributes.position.data;
    for(let i=0;i<p.length;i+=3) assert.ok(side==='above'?p[i+1]>=0:p[i+1]<=0);
    for(let i=0;i<part.indices.length;i+=3) {
      const [a,b,c]=part.indices.slice(i,i+3).map(n=>n*3);
      const signed=((p[b]-p[a])*(p[c+1]-p[a+1])-(p[b+1]-p[a+1])*(p[c]-p[a]))/2;
      assert.ok(signed>0);area+=signed;
    }
    assert.equal(part.attributes.uv.data.length,p.length/3*2);
    for(let i=0;i<p.length/3;i++) assert.equal(part.attributes.uv.data[i*2+1],(p[i*3+1]+1)/2);
  }
  assert.equal(area,2);
  assert.equal(result.above.indices.length,6);
  assert.equal(result.below.indices.length,3);
});

test('coplanar triangles belong to surface only',()=>{
  const r=splitAtWaterline({position:{size:3,data:[0,0,0,1,0,0,0,0,1]}},[0,1,2],[0,0,0]);
  assert.equal(r.above.indices.length,3);assert.equal(r.below.indices.length,0);
});

test('camera selects one world side while retaining ordinary objects and sea-level view',()=>{
  const camera={position:{y:2},layerMask:0x0fffffff};
  for(const [y,expected] of [[2,SURFACE_LAYER],[-20,UNDERWATER_LAYER],[0,SURFACE_LAYER],[1.2,SURFACE_LAYER]]) {
    camera.position.y=y;updateLandscapeCameraLayers(camera);
    assert.equal(camera.layerMask & (SURFACE_LAYER|UNDERWATER_LAYER),expected);
    assert.equal(camera.layerMask & 0x0fffffff,0x0fffffff);
  }
});

test('static mixed meshes are split once in world coordinates and excluded from active rendering',()=>{
  const engine=new NullEngine();const scene=new Scene(engine);
  try {
    const root=new TransformNode('landscape',scene);root.position.y=1;
    const mesh=new Mesh('rock',scene);mesh.parent=root;
    const vd=new VertexData();vd.positions=[-2,-3,0,2,2,0,0,2,0];vd.indices=[0,1,2];vd.normals=[0,0,-1,0,0,-1,0,0,-1];vd.applyToMesh(mesh);
    mesh.freezeWorldMatrix();
    prepareLandscapeVisibility(root);
    const below=scene.getMeshByName('rock_below_water');assert.ok(below);
    assert.equal(mesh.layerMask,SURFACE_LAYER);assert.equal(below.layerMask,UNDERWATER_LAYER);
    for(const m of [mesh,below]) {
      const points=m.getVerticesData('position');
      for(let i=0;i<points.length;i+=3) {
        const y=Vector3.TransformCoordinates(Vector3.FromArray(points,i),m.computeWorldMatrix(true)).y;
        assert.ok(m===mesh?y>=-1e-6:y<=1e-6);
      }
    }
    const camera=new FreeCamera('camera',new Vector3(0,2,-10),scene);camera.setTarget(Vector3.Zero());
    updateLandscapeCameraLayers(camera);scene.render();
    assert.ok(scene.getActiveMeshes().data.slice(0,scene.getActiveMeshes().length).includes(mesh));
    assert.ok(!scene.getActiveMeshes().data.slice(0,scene.getActiveMeshes().length).includes(below));
    camera.position.y=-2;camera.setTarget(Vector3.Zero());updateLandscapeCameraLayers(camera);scene.render();
    assert.ok(!scene.getActiveMeshes().data.slice(0,scene.getActiveMeshes().length).includes(mesh));
    assert.ok(scene.getActiveMeshes().data.slice(0,scene.getActiveMeshes().length).includes(below));
  } finally {scene.dispose();engine.dispose();}
});

test('prepared LODs, disabled landmarks and replacement landscapes retain the correct side',()=>{
  const engine=new NullEngine();const scene=new Scene(engine);
  try {
    const create=(root,name,y)=>{
      const mesh=new Mesh(name,scene);mesh.parent=root;
      const vd=new VertexData();vd.positions=[-1,y,0,1,y,0,0,y,1];vd.indices=[0,1,2];vd.applyToMesh(mesh);
      return mesh;
    };
    const root=new TransformNode('landscape',scene);
    const mesh=create(root,'underwater',-5),lod=create(root,'underwater_lod',-5);
    mesh.addLODLevel(100,lod);
    const lamp=create(root,'light',2);lamp.setEnabled(false);
    prepareLandscapeVisibility(root);
    assert.equal(mesh.layerMask,UNDERWATER_LAYER);assert.equal(lod.layerMask,UNDERWATER_LAYER);
    assert.equal(lamp.layerMask,SURFACE_LAYER);assert.equal(lamp.isEnabled(),false);
    root.dispose();
    const replacement=new TransformNode('replacement',scene);
    const island=create(replacement,'new_island',2);prepareLandscapeVisibility(replacement);
    assert.equal(island.layerMask,SURFACE_LAYER);
    assert.equal(scene.meshes.length,1);
  } finally {scene.dispose();engine.dispose();}
});
