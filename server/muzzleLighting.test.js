import test from "node:test";
import assert from "node:assert/strict";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { PointLight } from "@babylonjs/core/Lights/pointLight.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { prioritizeMuzzleLight, preserveEnvironmentLight } from "../src/muzzleLighting.js";

test("every muzzle flash keeps a material light slot despite earlier projectiles and flashes", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const mesh = new Mesh("deck", scene);
    mesh.material = new StandardMaterial("deck", scene);
    const light = name => new PointLight(name, Vector3.Zero(), scene);
    const sun = light("sun");
    const ambient = light("ambient");
    preserveEnvironmentLight(sun);
    preserveEnvironmentLight(ambient);
    for (let i = 0; i < 6; i++) light(`projectile-${i}`);
    const unsorted = light("unprioritized-flash");
    assert.ok(!mesh.lightSources.slice(0, 4).includes(unsorted));
    unsorted.dispose();
    for (let i = 0; i < 20; i++) {
      const flash = light(`flash-${i}`);
      prioritizeMuzzleLight(flash);
      const selected = mesh.lightSources.slice(0, mesh.material.maxSimultaneousLights);
      assert.ok(selected.includes(flash));
      assert.ok(selected.includes(sun));
      assert.ok(selected.includes(ambient));
      assert.equal(mesh.material.maxSimultaneousLights, 4);
      if (i % 2 === 0) flash.dispose();
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
