import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { createLandscapeMaterials } from "../packages/landscape/materials.js";
import { createAuthoredIslandSurface } from "../packages/landscape/renderer.js";
import { createAuthoredTerrainMeshData, authoredLocalTerrainIsland, splitAuthoredTerrainSurfaces } from "../packages/landscape/geometry.js";
import { editorIslandToLand } from "../packages/landscape/editor.js";

export function fixtures() {
  const polygon = [{x:-180,z:-140},{x:160,z:-140},{x:200,z:160},{x:-160,z:190}];
  const peak = {x:-40,z:0,h:80,falloff:"spike",radius:160};
  const plateau = [{x:-60,z:-60},{x:50,z:-60},{x:50,z:50},{x:-60,z:50}]
    .map((p,i)=>({...p,h:12,plateauGroupId:"top",plateauOrder:i}));
  return [
    {id:"peak",polygon,heights:[peak]},
    {id:"twins",polygon,heights:[peak,{...peak,x:80,z:40,h:120}]},
    {id:"bank",material:"sand",polygon,heights:plateau,seaFloorHeight:-120}
  ];
}

test("mesh and waterline splits retain corrected peak and unchanged plateau output", () => {
  const expected = [
    "546624cc70e14dfec97219ad12d571d99d20de456dbf7b033a66460390013055",
    "1abd3b9d9a32351b5129265ce04ca403198c0ec964a3fd87d4157f621183a070",
    "64a9fdc1b1d66c01deedd6eb437795c698d52841e875e1cdb4ad7a12e9062ab5"
  ];
  fixtures().forEach((island,index) => {
    const land = {name:"fixture",x:10,z:25,polygon:island.polygon,heightPoints:island.heights,seaFloorHeight:-80};
    const mesh = createAuthoredTerrainMeshData(land);
    const surfaces = splitAuthoredTerrainSurfaces(mesh,authoredLocalTerrainIsland(land));
    const hash = createHash("sha256").update(JSON.stringify({mesh,surfaces})).digest("hex");
    assert.equal(hash,expected[index]);
  });
});

test("shared renderer disposes all LOD geometry when rebuilding a preview", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const root = new TransformNode("root",scene);
  const materials = createLandscapeMaterials(scene);
  assert.deepEqual(materials.grass.diffuseColor.asArray(),[0.22,0.34,0.3]);
  assert.equal(materials.sand.zOffset,-2);
  assert.equal(materials.terrainSand.zOffset,0);
  for(let i=0;i<3;i++) {
    const meshes = createAuthoredIslandSurface(editorIslandToLand(fixtures()[1]),scene,materials,root);
    assert.ok(meshes.length > 0);
    assert.ok(meshes.every(mesh=>mesh.getLODLevels().length === 1));
    for(const mesh of meshes) mesh.dispose();
    assert.equal(scene.meshes.length,0);
    assert.equal(scene.geometries.length,0);
  }
  const bankMeshes = createAuthoredIslandSurface(editorIslandToLand(fixtures()[2]),scene,materials,root);
  assert.ok(bankMeshes.length > 0);
  assert.ok(bankMeshes.every(mesh => mesh.material === materials.terrainSand));
  scene.dispose();engine.dispose();
});

test("editor input matches server bounds-centered game geometry", () => {
  for(const island of fixtures()) {
    const editorLand = editorIslandToLand(island);
    // Bounds of these fixtures: [-180,200] x [-140,190].
    const gameLand = {...island,name:island.id,x:10,z:25,heightPoints:island.heights};
    const editor = createAuthoredTerrainMeshData(editorLand);
    const game = createAuthoredTerrainMeshData(gameLand);
    assert.deepEqual(game.indices,editor.indices);
    assert.deepEqual(game.vertices,editor.vertices);
  }
});

test("editor adapter resolves the same base plateau height as the server", () => {
  const bank=fixtures()[2];
  const mountain={...fixtures()[0],baseLevel:"plateau",baseLandmassId:bank.id,basePlateauGroupId:"top"};
  assert.equal(editorIslandToLand(mountain,{islands:[bank,mountain]}).baseHeight,12);
  assert.equal(editorIslandToLand({...mountain,baseLandmassId:"missing"}).baseHeight,0.1);
});
