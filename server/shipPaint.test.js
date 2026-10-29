import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { applyShipPaint } from '../src/shipPaint.js';

test('both narrow periscopes have angular paint without changing triangles or their shape', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const root = new TransformNode('submarine', scene);
    root.scaling.setAll(3); root.position.set(80, -19.26, 40); root.rotation.y = .8;
    const paint = new StandardMaterial('paint', scene);
    paint.metadata = { angularFleetPaint: true };
    const masts = [.986, .816].map((height, i) => {
      const mast = MeshBuilder.CreateCylinder(`sub_periscope_${i}`, {
        height: height * .9 * 1.3, diameter: .038 * 1.3, tessellation: 8
      }, scene);
      mast.parent = root; mast.position.set(0, 1.224 + height * .9 * 1.3 / 2, [.022, .184][i]);
      mast.material = paint; return mast;
    });
    const triangles = masts.map(m => m.getTotalIndices() / 3);
    applyShipPaint(root);
    for (const [i, mast] of masts.entries()) {
      const colors = [...mast.getVerticesData('color')];
      assert.ok(new Set(colors.filter((_, index) => index % 4 === 0)).size >= 2);
      assert.equal(mast.getTotalVertices() / 3, triangles[i]);
      for (let offset = 0; offset < colors.length; offset += 12)
        assert.deepEqual(colors.slice(offset, offset + 4), colors.slice(offset + 8, offset + 12));
      const positions = [...mast.getVerticesData('position')];
      mast.position.y += .065;
      applyShipPaint(root);
      assert.deepEqual([...mast.getVerticesData('color')], colors);
      assert.deepEqual([...mast.getVerticesData('position')], positions);
      mast.position.y -= .065;
    }
    const original = masts.map(m => [...m.getVerticesData('color')]);
    root.rotation.y = 0; root.position.set(0, -.78, 0);
    for (const mast of masts) mast.metadata.angularFleetPaint = false;
    applyShipPaint(root);
    assert.deepEqual(masts.map(m => [...m.getVerticesData('color')]), original);
  } finally { engine.dispose(); }
});

test('unmarked materials and plain decks receive no camouflage', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine), root = new TransformNode('boat', scene);
    for (const [name, camo] of [['dark_hull', false], ['light_deck', true], ['light_torpedo_tube_0', true], ['light_tube_1', true], ['light_tube_cap_0', true], ['light_bow_bulwark_cap', true]]) {
      const mesh = MeshBuilder.CreateBox(name, {}, scene); mesh.parent = root;
      mesh.material = new StandardMaterial(name, scene);
      mesh.material.metadata = { angularFleetPaint: camo };
      applyShipPaint(root);
      assert.equal(mesh.getVerticesData('color'), null);
    }
  } finally { engine.dispose(); }
});

test('periscope is uniformly dark except for its small forward lens', async () => {
  const { periscopePaintFactor, getPeriscopePaintMaterial, submarineFlakMaterials } = await import('../src/shipPaint.js');
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine), source = new StandardMaterial('light_tower', scene);
    source.metadata = { angularFleetPaint: true };
    const material = getPeriscopePaintMaterial(scene, source);
    assert.equal(getPeriscopePaintMaterial(scene, source), material);
    assert.equal(material.metadata.angularFleetPaint, false);
    assert.equal(material.diffuseTexture.getSize().width, 128);
    assert.equal(material.diffuseTexture.getSize().height, 256);
    assert.equal(periscopePaintFactor(.75, .963), .025);
    assert.equal(periscopePaintFactor(.5, .963), .55);
    const vertical = Array.from({ length: 100 }, (_, i) => periscopePaintFactor(0, (i + .5) / 100));
    assert.equal(new Set(vertical).size, 1);
    assert.equal(periscopePaintFactor(0, 0), .55);
    assert.equal(periscopePaintFactor(0, 1), .55);
    assert.equal(vertical.slice(1).filter((value, index) => value !== vertical[index]).length, 0);
    for (let v = 0; v < 1; v += .01) assert.equal(periscopePaintFactor(0, v), periscopePaintFactor(1, v));
    const black = submarineFlakMaterials(scene, { hull: source });
    assert.ok(black.hull.diffuseColor.r < .1);
    assert.equal(black.hull.metadata?.angularFleetPaint, undefined);
    const dark = { hull: new StandardMaterial('dark', scene) };
    assert.equal(submarineFlakMaterials(scene, dark), dark);
    assert.equal(getPeriscopePaintMaterial(scene, dark.hull), dark.hull);
  } finally { engine.dispose(); }
});
