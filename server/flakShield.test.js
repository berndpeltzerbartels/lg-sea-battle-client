import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { createFlakShield } from '../src/flakShield.js';

for (const variant of ['split', 'enclosed']) test(`${variant} flak shell leaves gun and sight movement clear`, () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine), parent = new TransformNode('mount', scene);
    const mesh = createFlakShield(scene, parent, 'test', new StandardMaterial('shell', scene), 1, variant);
    mesh.computeWorldMatrix(true);
    assert.ok(mesh.getTotalIndices() / 3 < 2400);
    assert.equal(mesh.subMeshes.length, 2);
    assert.equal(mesh.material.subMaterials[1].name, 'flak_interior_black');
    assert.equal(mesh.getChildMeshes()[0].material, mesh.material.subMaterials[1]);
    assert.ok(mesh.getVerticesData('position').every(Number.isFinite));
    assert.ok(mesh.getVerticesData('normal').every(Number.isFinite));
    const positions = mesh.getVerticesData('position'), normals = mesh.getVerticesData('normal');
    for (let v = 0; v < positions.length; v += 3) {
      if (Math.abs(positions[v+1] + .145) < 1e-6) {
        const radius = Math.hypot(positions[v], positions[v+2]);
        assert.ok(Math.abs(radius - .31) < 1e-6 || Math.abs(radius - .31*.96) < 1e-6, 'lower rim concentric with pedestal');
      }
    }
    assert.equal(mesh.getChildMeshes()[0].position.z, 0);
    const i = (4 * 25 + 12) * 3;
    assert.ok(positions[i]*normals[i] + (positions[i+1]+.145)*normals[i+1] + positions[i+2]*normals[i+2] > 0, 'outer normals face outward');
    for (const pitch of [-.1, 0, .4, 1, Math.PI/2]) {
      const direction = new Vector3(0, Math.sin(pitch), Math.cos(pitch));
      for (const x of [-.024, 0, .024]) {
        for (const sightY of [0, .14]) {
          const eyeZ = sightY ? .02 : 0;
          const origin = new Vector3(x, .03 + sightY*Math.cos(pitch) + eyeZ*Math.sin(pitch), .16 - sightY*Math.sin(pitch) + eyeZ*Math.cos(pitch));
          assert.equal(new Ray(origin, direction, 2).intersectsMesh(mesh, false).hit, false, `pitch=${pitch}, sight=${sightY}`);
        }
      }
    }
  } finally { engine.dispose(); }
});
