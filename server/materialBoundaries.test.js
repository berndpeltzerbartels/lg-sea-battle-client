import test from "node:test";
import assert from "node:assert/strict";
import { splitAuthoredTerrainSurfaces, pointInPolygon2d } from "../packages/landscape/geometry.js";

const rectangle = (x0, z0, x1, z1) => [{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}];
const zone = polygon => ({ material: "sand", polygon });
const area = surface => triangles(surface).reduce((sum, [a,b,c]) => sum + Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/2, 0);
function triangles(surface) {
  const result = [];
  for (let i=0; i<surface.indices.length; i+=3) result.push(surface.indices.slice(i,i+3).map(index => {
    const [x,h,z] = surface.positions.slice(index*3,index*3+3);
    return {x,h,z};
  }));
  return result;
}
function split(zones, height = (x,z) => 10+x+2*z) {
  const vertices = rectangle(0,0,10,10).map(p => ({...p,h:height(p.x,p.z)}));
  return splitAuthoredTerrainSurfaces({vertices,indices:[0,1,2,0,2,3]}, {material:"grass",materialZones:zones});
}

test("narrow sand strip cuts triangles even when no original centroid is inside", () => {
  const surfaces = split([zone(rectangle(1,0,2,10))]);
  assert.ok(Math.abs(area(surfaces.sand)-10)<1e-7);
  assert.ok(Math.abs(area(surfaces.land)-90)<1e-7);
  for (const triangle of triangles(surfaces.sand)) for (const p of triangle) {
    assert.ok(p.x >= 1-1e-7 && p.x <= 2+1e-7);
    assert.ok(Math.abs(p.h-(10+p.x+2*p.z))<1e-7);
  }
});

test("concave, reversed and overlapping zones form a union without duplicate faces", () => {
  const l = [{x:1,z:1},{x:5,z:1},{x:5,z:2},{x:2,z:2},{x:2,z:5},{x:1,z:5}];
  for (const ring of [l,[...l].reverse()]) {
    const surfaces=split([zone(ring),zone(rectangle(1,1,2,5)),zone(ring)]);
    assert.ok(Math.abs(area(surfaces.sand)-7)<1e-7);
    assert.ok(Math.abs(area(surfaces.land)+area(surfaces.sand)-100)<1e-7);
    for (const t of triangles(surfaces.sand)) {
      assert.ok(pointInPolygon2d({x:t.reduce((s,p)=>s+p.x,0)/3,z:t.reduce((s,p)=>s+p.z,0)/3},l));
    }
  }
});

test("waterline clipping remains independent and terrain outside zones is unchanged", () => {
  const surfaces=split([zone(rectangle(2,-2,8,12))],(x)=>x-5);
  assert.ok(Math.abs(area(surfaces.seaFloor)-50)<1e-7);
  assert.ok(Math.abs(area(surfaces.sand)-30)<1e-7);
  assert.ok(Math.abs(area(surfaces.land)-20)<1e-7);
  assert.equal(area(split([zone(rectangle(20,20,30,30))]).sand),0);
  assert.equal(area(split([zone(rectangle(-1,-1,11,11))]).sand),100);
});
