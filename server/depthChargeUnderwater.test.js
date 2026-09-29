import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { createDepthChargeUnderwater, depthChargeUnderwaterPose } from '../src/depthChargeUnderwater.js';

const charge = { id: 'one', lane: 0, x: 10, z: 20, heading: 0, releasedAt: 0, explodesAt: 2.5, radius: 24 };
test('charges enter water before sinking to detonation depth, for racks and throwers', () => {
  for (const lane of [0, 1, 2, 3]) {
    const c = { ...charge, lane };
    assert.equal(depthChargeUnderwaterPose(c, .4, 2.5).visible, false);
    const start = depthChargeUnderwaterPose(c, 1.4, 2.5);
    const end = depthChargeUnderwaterPose(c, 2.49, 2.5);
    assert.ok(start.visible && end.visible && end.y < start.y && end.y < -7);
    assert.equal(depthChargeUnderwaterPose(c, 2.5, 2.5).visible, false);
  }
});
test('late observers see sinking bombs; explosions are bounded, fade and dispose all geometry', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const system = createDepthChargeUnderwater(scene, 2.5);
  system.sync('first', [charge], 1.5);
  assert.equal(system.state().charges.length, 1);
  assert.equal(system.state().charges[0].visible, true);
  const y = system.state().charges[0].y;
  system.update(.2);
  assert.ok(system.state().charges[0].y < y);
  system.sync('first', [{ ...charge, exploded: true }], 2.5);
  system.explode(charge); system.explode(charge);
  assert.equal(system.state().charges.length, 0);
  assert.equal(system.state().blasts.length, 1);
  assert.ok(system.state().blasts[0].radius > 8 && system.state().blasts[0].radius < charge.radius);
  system.update(.5);
  assert.ok(system.state().blasts[0].alpha < .8);
  assert.equal(scene.meshes.length, 2);
  for (let i = 0; i < 40; i++) system.explode({ ...charge, id: `extra-${i}` });
  assert.equal(system.state().blasts.length, 12);
  assert.equal(scene.meshes.length, 24);
  system.update(4);
  assert.equal(scene.meshes.length, 0);
  system.sync('first', [charge], 1);
  system.sync('second', [], 0);
  assert.equal(scene.meshes.length, 0);
  system.dispose();
  assert.equal(scene.materials.filter(m => m.name.startsWith('depth_charge')).length, 0);
  scene.dispose(); engine.dispose();
});
