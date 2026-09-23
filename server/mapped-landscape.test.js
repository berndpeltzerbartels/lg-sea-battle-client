import test from "node:test";
import assert from "node:assert/strict";
import { createAuthoredTerrainMeshData, authoredLocalTerrainIsland, barycentricAuthoredWeightsForPoint, authoredTriangleOrientation } from "../packages/landscape/geometry.js";
import { mappedTerrainHeight } from "../packages/landscape/mapped.js";

function fixture(count = 2) {
  const polygon = [[-200,-200],[200,-200],[200,200],[-200,200]].map(([x,z],i)=>({x,z,boundaryPointId:`b${i}`}));
  const heightPoints = Array.from({length:count},(_,group)=>[[-30,-40],[30,-40],[30,40],[-30,40]].map(([x,z],i)=>({
    x:x+(group===0?-70:70),z,h:2,plateauGroupId:`p${group}`,plateauOrder:i,plateauBoundaryPointId:`b${i}`
  }))).flat();
  return {x:0,z:0,polygon,heightPoints,seaFloorHeight:-80,baseHeight:-80};
}

function meshHeights(mesh,p) {
  const heights=[];
  for(let i=0;i<mesh.indices.length;i+=3) {
    const [a,b,c]=mesh.indices.slice(i,i+3).map(i=>mesh.vertices[i]);
    const w=barycentricAuthoredWeightsForPoint(p,a,b,c);
    if(w) heights.push(w.a*a.h+w.b*b.h+w.c*c.h);
  }
  return heights;
}

test("mapped envelope covers the boundary exactly once and matches maximum heights",()=>{
  const land=fixture(),island=authoredLocalTerrainIsland(land),mesh=createAuthoredTerrainMeshData(land);
  let area=0;
  for(let i=0;i<mesh.indices.length;i+=3) area+=Math.abs(authoredTriangleOrientation(...mesh.indices.slice(i,i+3).map(i=>mesh.vertices[i])))/2;
  assert.ok(Math.abs(area-160000)<1e-5);
  for(let x=-190.123;x<200;x+=13.1)for(let z=-190.321;z<200;z+=11.3) {
    const heights=meshHeights(mesh,{x,z});
    assert.equal(heights.length,1,`coverage at ${x},${z}`);
    assert.ok(Math.abs(heights[0]-mappedTerrainHeight(island,{x,z}))<1e-6);
  }
  assert.ok(mesh.indices.length/3<100);
});

test("second plateau never removes the original slope and leaves water between low plateaus",()=>{
  const one=authoredLocalTerrainIsland(fixture(1)),two=authoredLocalTerrainIsland(fixture(2));
  for(let x=-190;x<200;x+=11)for(let z=-190;z<200;z+=13) assert.ok(mappedTerrainHeight(two,{x,z})>=mappedTerrainHeight(one,{x,z})-1e-8);
  assert.ok(mappedTerrainHeight(two,{x:0,z:0})<0);
});

test("mapping supports extra outer vertices and reverse boundary order",()=>{
  const land=fixture(1);
  land.polygon.splice(1,0,{x:0,z:-200,boundaryPointId:"extra"});
  const a=createAuthoredTerrainMeshData(land);
  land.polygon.reverse();
  const b=createAuthoredTerrainMeshData(land);
  assert.equal(a.indices.length,b.indices.length);
  assert.ok(meshHeights(b,{x:-70,z:0}).every(h=>Math.abs(h-2)<1e-8));
});

test("overlapping and identical plateau tops have no duplicate coplanar faces",()=>{
  for(const shift of [0,20]) {
    const land=fixture();
    for(let i=4;i<8;i++)land.heightPoints[i].x=land.heightPoints[i-4].x+shift;
    const mesh=createAuthoredTerrainMeshData(land);
    assert.equal(meshHeights(mesh,{x:-69.123,z:3.21}).length,1);
  }
});

test("missing and duplicate targets are rejected rather than guessing new links",()=>{
  const land=fixture();land.heightPoints[0].plateauBoundaryPointId="missing";
  assert.throws(()=>createAuthoredTerrainMeshData(land),/Randpunkte/);
  land.heightPoints[0].plateauBoundaryPointId="b1";
  assert.throws(()=>createAuthoredTerrainMeshData(land),/Randpunkte/);
});
