import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

for (const remote of [false, true]) test(`${remote ? 'remote' : 'player'} torpedo openings stay flush with tube ends`, () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const marker = remote ? 'const tube = MeshBuilder.CreateCylinder(`${name}_tube_${i}`' : 'const tube = MeshBuilder.CreateCylinder(`${name}_torpedo_tube_${i}`';
  const at = source.indexOf(marker);
  const start = source.lastIndexOf('  for (let i = 0;', at);
  const end = source.indexOf(remote ? '\n  const bowCannon' : '\n  const hatch', at);
  const build = new Function('MeshBuilder', 'scene', 'root', `
    const name='test', materials={}, tubeMaterial=null, hullMaterial=null, funnelMaterial=null;
    ${source.slice(start, end)}
  `);
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine), root = new TransformNode('ship', scene);
    build(MeshBuilder, scene, root);
    for (const yaw of [0, 1, Math.PI]) {
      root.rotation.set(.1, yaw, -.2);
      root.scaling.setAll(3);
      root.computeWorldMatrix(true);
      for (let i = 0; i < 2; i++) {
        const opening = scene.getMeshByName(`test_tube_opening_${i}`);
        const endMesh = scene.getMeshByName(remote ? `test_tube_${i}` : `test_tube_cap_${i}`);
        assert.equal(opening.parent, endMesh);
        endMesh.computeWorldMatrix(true);
        opening.computeWorldMatrix(true);
        const face = Vector3.TransformCoordinates(new Vector3(0, .006, 0), opening.getWorldMatrix());
        const endFace = Vector3.TransformCoordinates(new Vector3(0, remote ? .88 : .04, 0), endMesh.getWorldMatrix());
        assert.ok(Math.abs(Vector3.Distance(face, endFace) - .0006) < 1e-5, 'no visible gap at any ship heading');
      }
    }
  } finally { engine.dispose(); }
});
