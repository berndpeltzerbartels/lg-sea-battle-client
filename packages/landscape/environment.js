import { Scene } from '@babylonjs/core/scene.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';

export function createLandscapeLighting(scene) {
  const sun = new DirectionalLight('sun', new Vector3(-0.45, -0.9, 0.32), scene);
  sun.position = new Vector3(35, 80, -45);
  sun.intensity = 1.2;
  sun.diffuse = new Color3(0.83, 0.85, 0.83);
  sun.specular = new Color3(0.48, 0.55, 0.62);
  const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.42;
  ambient.diffuse = new Color3(0.5, 0.6, 0.7);
  ambient.groundColor = new Color3(0.2, 0.24, 0.28);
  return { sun, ambient };
}

export function updateLandscapeAtmosphere(scene, cameraY) {
  const ratio = Math.max(0, Math.min(1, (0.08 - cameraY) / 1.1));
  const mix = (a, b) => a + (b - a) * ratio;
  scene.clearColor = new Color4(mix(0.38, 0.07), mix(0.5, 0.22), mix(0.6, 0.28), 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  // Above water, fully fogged terrain must disappear into the sky before it is clipped.
  scene.fogColor = new Color3(mix(0.38, 0.055), mix(0.5, 0.2), mix(0.6, 0.24));
  scene.fogDensity = mix(0.00135, 0.0016);
  return ratio;
}
