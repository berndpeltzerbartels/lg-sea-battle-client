import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthoredTerrainMeshData, createAuthoredSingleHeightPointSurfaces, authoredLocalTerrainIsland } from '../packages/landscape/geometry.js';
import { editorIslandToLand } from '../packages/landscape/editor.js';

test('elongated single-peak island has no flat grass triangles on its base plateau', () => {
  for (const reverse of [false, true]) {
    const polygon = Array.from({length:32}, (_, i) => ({x:100*Math.cos(i*Math.PI/16), z:600*Math.sin(i*Math.PI/16)}));
    if (reverse) polygon.reverse();
    const heights = [{x:0,z:80,h:160}];
    const bank = {id:'bank', heights:[{h:0.3,plateauGroupId:'top'}]};
    const island = {id:'island',polygon,heights,baseLevel:'plateau',baseLandmassId:'bank',basePlateauGroupId:'top'};
    const editorLand = editorIslandToLand(island, {islands:[bank,island]});
    const gameLand = {...island,x:0,z:0,baseHeight:0.3,seaFloorHeight:-80,heightPoints:heights};
    const mesh = createAuthoredTerrainMeshData(editorLand);
    assert.deepEqual(mesh, createAuthoredTerrainMeshData(gameLand));
    const peakIndex = mesh.vertices.findIndex(p => p.h === 160);
    assert.equal(mesh.indices.length / 3, mesh.vertices.length - 1);
    let triangleArea = 0;
    for (let i=0; i<mesh.indices.length; i+=3) {
      assert.ok(mesh.indices.slice(i,i+3).includes(peakIndex), 'every slope reaches the peak');
      const [a,b,c] = mesh.indices.slice(i,i+3).map(j => mesh.vertices[j]);
      triangleArea += Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/2;
    }
    const boundary = mesh.vertices.filter((_, i) => i !== peakIndex);
    const polygonArea = Math.abs(boundary.reduce((sum,a,i) => {
      const b = boundary[(i+1)%boundary.length];
      return sum + a.x*b.z-b.x*a.z;
    },0))/2;
    assert.ok(Math.abs(triangleArea-polygonArea) < 1e-7, 'slopes cover the footprint exactly once');
    const [surface] = createAuthoredSingleHeightPointSurfaces(authoredLocalTerrainIsland(editorLand));
    assert.ok(surface.triangles.every(t => t.includes(surface.vertices.length - 1)), 'multi-peak inputs use the same complete slopes');
  }
});
