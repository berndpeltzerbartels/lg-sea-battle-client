import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { createDepthChargeRacks } from '../src/depthChargeRacks.js';
import { createDepthChargeAnimator } from '../src/depthChargeAnimation.js';

test('racks, reserves and released charges retain their own fleet material', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const light = new StandardMaterial('light', scene);
    const dark = new StandardMaterial('dark', scene);
    const build = (name, paint) => createDepthChargeRacks(scene, new TransformNode(name, scene),
      name, () => 1, 'combined', paint);
    const models = [build('light', light), build('dark', dark)];
    for (const [index, model] of models.entries()) {
      const paint = [light, dark][index];
      const other = [dark, light][index];
      for (const rack of model.racks) for (const charge of rack.charges) {
        assert.ok(charge.mesh.material.subMaterials.includes(paint));
        assert.ok(!charge.mesh.material.subMaterials.includes(other));
      }
      const frame = scene.getMeshByName(model.racks[2].root.name + '_frame');
      assert.ok(frame.material.subMaterials.includes(paint));
      const animator = createDepthChargeAnimator(model);
      animator.fire(2);
      const flight = scene.meshes.find(mesh => mesh.name.startsWith(model.racks[2].charges[0].mesh.name + '_flight'));
      assert.ok(flight.material.subMaterials.includes(paint));
      animator.dispose();
    }
  } finally { engine.dispose(); }
});
