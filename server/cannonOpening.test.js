import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function createBowCannon(');
const end = source.indexOf('\nfunction ', start + 1);
const build = new Function('MeshBuilder', 'TransformNode', 'getTorpedoBoatDeckY',
  `${source.slice(start, end)}; return createBowCannon;`)(MeshBuilder, TransformNode, () => 0);

test('cannon opening faces the muzzle and follows aim and recoil for all boats', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    for (const isPlayer of [true, false]) {
      const name = isPlayer ? 'player' : 'other';
      const parent = new TransformNode(name, scene);
      const cannon = build(scene, {}, parent, name, {}, 2.35, isPlayer);
      const opening = scene.getMeshByName(`${name}_cannon_opening`);
      assert.equal(opening.parent, cannon.barrel);
      assert.equal(opening.getTotalIndices(), 42, 'only fourteen triangles');
      assert.equal(cannon.viewHiddenMeshes.includes(opening), isPlayer);
      cannon.mount.rotation.y = Math.PI;
      cannon.elevationRoot.rotation.x = -0.3;
      cannon.barrel.position.z -= 0.16;
      const world = opening.computeWorldMatrix(true);
      const barrelWorld = cannon.barrel.computeWorldMatrix(true);
      const normal = Vector3.TransformNormal(new Vector3(...opening.getVerticesData('normal').slice(0, 3)), world).normalize();
      const forward = Vector3.TransformNormal(Vector3.Up(), barrelWorld).normalize();
      assert.ok(Vector3.Dot(normal, forward) > 0.999, 'front face points out of the barrel');
      const offset = opening.getAbsolutePosition().subtract(cannon.barrel.getAbsolutePosition());
      assert.ok(Vector3.Dot(offset.normalize(), forward) > 0.999);
    }
  } finally { engine.dispose(); }
});
