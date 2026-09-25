import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { createLandscapeLighting, updateLandscapeAtmosphere } from '../packages/landscape/environment.js';

test('shared landscape lighting preserves game settings', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const { sun, ambient } = createLandscapeLighting(scene);
    assert.equal(scene.lights.length, 2);
    assert.equal(sun.intensity, 1.2);
    assert.equal(ambient.intensity, 0.42);
    assert.deepEqual(sun.direction.asArray(), [-0.45, -0.9, 0.32]);
  } finally { engine.dispose(); }
});

test('shared atmosphere transitions between surface and underwater without rebuilding scene', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    assert.equal(updateLandscapeAtmosphere(scene, 10), 0);
    assert.equal(scene.fogDensity, 0.00135);
    assert.equal(scene.clearColor.r, 0.38);
    assert.equal(updateLandscapeAtmosphere(scene, -10), 1);
    assert.equal(scene.fogDensity, 0.0016);
    assert.ok(Math.abs(scene.clearColor.r - 0.07) < 1e-12);
    assert.ok(Math.abs(updateLandscapeAtmosphere(scene, -0.47) - 0.5) < 1e-12);
    assert.equal(scene.meshes.length, 0);
    assert.equal(scene.fogMode, Scene.FOGMODE_EXP2);
  } finally { engine.dispose(); }
});
