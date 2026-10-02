import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { readFileSync } from 'node:fs';
import { createDepthChargeRacks } from '../src/depthChargeRacks.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}
const deckY = new Function(`${extract('torpedoBoatHullSections')}\n${extract('getTorpedoBoatDeckY')}\nreturn getTorpedoBoatDeckY;`)();
const constants = ['playerSternFlakScale', 'flakBarrelLength', 'flakBarrelCenterZ', 'flakSightYOffsetFactor']
  .map(name => source.match(new RegExp(`const ${name} = [^;]+;`))[0]).join('\n');
const buildFlak = new Function('MeshBuilder', 'TransformNode', 'getTorpedoBoatDeckY', 'createOpenFlakTurretWall',
  `${constants}\nconst flakShieldVariant = 'open';\n${extract('createSternFlak')}\nreturn createSternFlak;`)(MeshBuilder, TransformNode, deckY, (name, scene) => new Mesh(name, scene));

for (const layout of ['stern', 'throwers', 'combined']) test(`${layout}: shared geometry, one loaded charge and one accessible reserve per side`, () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    for (const name of ['player', 'remote']) {
      const boat = new TransformNode(name, scene);
      const model = createDepthChargeRacks(scene, boat, name, deckY, layout);
      assert.equal(model.root.parent, boat);
      assert.equal(model.racks.length, layout === 'combined' ? 4 : 2);
      for (const rack of model.racks) {
        assert.equal(rack.charges.length, 2);
        assert.equal((rack.gate ?? rack.cup).parent, rack.root);
        const charge = rack.charges[0];
        assert.equal(charge.root.parent, rack.cup ?? rack.root);
        assert.equal(charge.mesh.subMeshes.length, 3);
        for (const mesh of rack.root.getChildMeshes()) {
          mesh.computeWorldMatrix(true);
          const bounds = mesh.getBoundingInfo().boundingBox;
          if (rack.gate) {
            assert.ok(bounds.maximumWorld.z < -3.8, 'magazine and rails remain behind the flak');
            assert.ok(bounds.maximumWorld.y < .675, 'less than half a metre above the deck at boat scale');
          } else {
            assert.ok(bounds.minimumWorld.z > 0 && bounds.maximumWorld.z < .2, 'forward of the funnel and behind torpedo tubes');
            assert.ok(Math.abs(bounds.minimumWorld.x) < .46 && Math.abs(bounds.maximumWorld.x) < .46, 'entire apparatus sits above the platform, leaving the side passage free');
            assert.ok(Math.abs(rack.root.position.y - .916) < 1e-8, 'mount rests exactly on the platform roof');
            assert.ok(bounds.minimumWorld.y >= .913, 'only the mounting pivot may inset slightly into the roof');
          }
          assert.equal(mesh.isPickable, false);
        }
        charge.root.position.z -= 1;
        assert.notEqual(charge.root.position.z, charge.restPosition.z);
      }
      const meshes = model.root.getChildMeshes();
      assert.ok(meshes.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0) < (layout === 'combined' ? 7200 : 3600));
      assert.ok(meshes.reduce((sum, mesh) => sum + mesh.subMeshes.length, 0) <= (layout === 'combined' ? 64 : 34));
    }
    assert.equal(scene.materials.filter(m => m.name.startsWith('depth_charge_')).length, 4);
  } finally { engine.dispose(); }
});

for (const layout of ['stern', 'throwers', 'combined']) test(`${layout}: actual flak firing rays clear the equipment throughout the aft hemisphere`, () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const boat = new TransformNode('boat', scene);
    const model = createDepthChargeRacks(scene, boat, 'boat', deckY, layout);
    const meshes = model.root.getChildMeshes();
    for (const mesh of meshes) mesh.computeWorldMatrix(true);
    for (const isPlayer of [true, false]) {
      const flak = buildFlak(scene, {}, boat, `flak_${isPlayer}`, {}, -2.92, isPlayer);
      for (const pitch of [-.12, -.06, 0, .2]) {
        flak.elevationRoot.rotation.x = -pitch;
        for (let degrees = 90; degrees <= 270; degrees++) {
          flak.mount.rotation.y = degrees * Math.PI / 180;
          const matrix = flak.elevationRoot.computeWorldMatrix(true);
          const origin = Vector3.TransformCoordinates(Vector3.Zero(), matrix);
          const direction = Vector3.TransformNormal(Vector3.Forward(), matrix).normalize();
          const ray = new Ray(origin, direction, 5);
          for (const mesh of meshes) assert.equal(ray.intersectsMesh(mesh).hit, false,
            `${mesh.name} blocks flak yaw=${degrees}, pitch=${pitch}, player=${isPlayer}`);
        }
      }
    }
  } finally { engine.dispose(); }
});
