import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createDepthChargeRacks } from '../src/depthChargeRacks.js';
import { createDepthChargeAnimator } from '../src/depthChargeAnimation.js';

for (const dt of [1 / 60, .23, 5]) test(`stern preview replenishes its visible reserve repeatedly without adding meshes, dt=${dt}`, () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const boat = new TransformNode('boat', scene);
    const model = createDepthChargeRacks(scene, boat, 'boat', () => .52, 'stern');
    const count = scene.meshes.length;
    let splashes = 0;
    const animation = createDepthChargeAnimator(model, { replenishMagazine: true, onSplash: () => splashes++ });
    for (let shot = 0; shot < 6; shot++) {
      assert.equal(animation.fire(0), true);
      for (let time = 0; time < 10; time += dt) animation.update(dt);
      assert.equal(animation.state()[0].remaining, 2);
      assert.equal(animation.state()[0].busy, false);
      assert.equal(scene.meshes.length, count);
      const charges = model.racks[0].charges;
      assert.ok(charges.every(charge => charge.root.isEnabled()));
      assert.deepEqual(charges.map(charge => Number(charge.root.position.z.toFixed(3))).sort(), [.047, .18]);
    }
    assert.equal(splashes, 6);
    animation.dispose();
  } finally { engine.dispose(); }
});

test('stern reserve remains visible ahead of the cover and rolls onto the rail', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const boat = new TransformNode('boat', scene);
    const model = createDepthChargeRacks(scene, boat, 'boat', () => .52, 'stern');
    const rack = model.racks[0];
    const spare = rack.charges[1].root;
    assert.equal(spare.isEnabled(), true);
    const animation = createDepthChargeAnimator(model);
    animation.fire(0);
    animation.update(1.5);
    assert.equal(spare.isEnabled(), true);
    assert.ok(spare.position.z < .18 && spare.position.z > .047, 'visible reserve rolls toward the gate');
    animation.update(.5);
    assert.ok(spare.position.z < .18 && spare.position.z > .047);
    animation.update(1);
    assert.ok(Vector3.Distance(spare.position, rack.charges[0].restPosition) < .000001);
    assert.equal(animation.reset(), true);
    assert.equal(spare.isEnabled(), true, 'restocking restores the visible reserve');
  } finally { engine.dispose(); }
});

for (const layout of ['stern', 'throwers']) for (const dt of [1 / 60, .23, 5]) {
  test(`${layout}: two throws, reload, empty and reset at dt=${dt}`, () => {
    const engine = new NullEngine();
    try {
      const scene = new Scene(engine);
      const boat = new TransformNode('boat', scene);
      boat.scaling.setAll(3);
      boat.rotation.y = Math.PI / 2;
      boat.position.set(100, 0, 200);
      const model = createDepthChargeRacks(scene, boat, 'boat', () => .52, layout);
      const meshCount = scene.meshes.length;
      const launches = [], splashes = [];
      const animation = createDepthChargeAnimator(model, {
        onLaunch: (position, direction) => launches.push({ position, direction }),
        onSplash: position => splashes.push(position)
      });
      const finish = () => { for (let t = 0; t < 10; t += dt) animation.update(dt); };
      assert.equal(animation.fire(0), true);
      assert.equal(animation.fire(0), false, 'no double firing');
      assert.equal(animation.reset(), false, 'cannot refill while firing');
      assert.equal(animation.fire(1), true, 'both sides can fire independently');
      finish();
      assert.deepEqual(animation.state(), [{ busy: false, remaining: 1 }, { busy: false, remaining: 1 }]);
      assert.equal(launches.length, 2);
      assert.equal(splashes.length, 2);
      assert.equal(scene.meshes.length, meshCount, 'flight meshes disposed');
      if (layout === 'throwers') {
        assert.ok(splashes[0].z > launches[0].position.z + 5, 'port throw follows rotated ship');
        assert.ok(splashes[1].z < launches[1].position.z - 5, 'starboard throw follows rotated ship');
      }
      for (const splash of splashes) assert.equal(splash.y, 0);
      assert.equal(animation.fire(0), true, 'reloaded charge fires too');
      finish();
      assert.equal(animation.fire(0), false, 'finite ammunition');
      assert.equal(splashes.length, 3);
      assert.equal(scene.meshes.length, meshCount);
      assert.equal(animation.reset(), true);
      assert.deepEqual(animation.state(), [{ busy: false, remaining: 2 }, { busy: false, remaining: 2 }]);
      assert.equal(animation.fire(0), true);
      animation.update(.5);
      animation.dispose();
      assert.equal(scene.meshes.length, meshCount, 'disposing mid-flight removes temporary geometry');
      assert.equal(animation.fire(1), false);
    } finally { engine.dispose(); }
  });
}

test('loading fork carries the spare continuously and launched charge no longer follows the boat', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const boat = new TransformNode('boat', scene);
    boat.scaling.setAll(3);
    const model = createDepthChargeRacks(scene, boat, 'boat', () => .52, 'throwers');
    const animation = createDepthChargeAnimator(model);
    animation.fire(0);
    animation.update(.1);
    const flight = scene.meshes.find(mesh => mesh.name.includes('_flight_'));
    const position = flight.position.clone();
    boat.position.x += 100;
    flight.computeWorldMatrix(true);
    assert.ok(Vector3.Distance(position, flight.getAbsolutePosition()) < .00001);
    animation.update(1.11);
    const rack = model.racks[0];
    assert.equal(rack.charges[1].root.parent, rack.loadingCradle);
    animation.update(1.59);
    const expected = rack.loadingCradle.getAbsolutePosition();
    rack.charges[1].root.computeWorldMatrix(true);
    rack.loadingCradle.computeWorldMatrix(true);
    assert.ok(Vector3.Distance(rack.charges[1].root.getAbsolutePosition(), expected) < .002, 'no jump when placing charge in cup');
    animation.dispose();
  } finally { engine.dispose(); }
});
