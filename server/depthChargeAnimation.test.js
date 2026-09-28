import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createDepthChargeRacks } from '../src/depthChargeRacks.js';
import { createDepthChargeAnimator } from '../src/depthChargeAnimation.js';

test('four-round alternating salvo reloads each rack before its next release', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const boat = new TransformNode('boat', scene);
    const model = createDepthChargeRacks(scene, boat, 'boat', () => .52, 'stern');
    const meshes = scene.meshes.length;
    let splashes = 0;
    const animation = createDepthChargeAnimator(model, { replenishMagazine: true, onSplash: () => splashes++ });
    for (let shot = 0; shot < 4; shot++) {
      assert.equal(animation.fire(shot % 2), true);
      for (let frame = 0; frame < 150; frame++) animation.update(1 / 60);
    }
    animation.update(3);
    assert.equal(splashes, 4);
    assert.equal(animation.active, false);
    assert.equal(scene.meshes.length, meshes);
    assert.ok(animation.state().every(lane => lane.remaining === 2));
    animation.dispose();
  } finally { engine.dispose(); }
});

test('combined salvos launch all four stations and replenish both throwers without accumulating geometry', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const boat = new TransformNode('boat', scene);
    boat.scaling.setAll(3);
    const model = createDepthChargeRacks(scene, boat, 'boat', () => .74);
    const count = scene.meshes.length;
    const splashes = [];
    const animation = createDepthChargeAnimator(model, { replenishMagazine: true, onSplash: p => splashes.push(p) });
    for (let salvo = 0; salvo < 3; salvo++) {
      for (const lanes of [[0], [2, 3], [1]]) {
        const targets = lanes.map(lane => new Vector3(lane >= 2 ? (lane === 2 ? -24 : 24) : 0, 0, lane >= 2 ? .3 : -13));
        lanes.forEach((lane, i) => assert.equal(animation.fire(lane, Vector3.Zero(), targets[i]), true));
        for (let frame = 0; frame < 150; frame++) animation.update(1 / 60);
        targets.forEach(target => assert.ok(splashes.slice(-lanes.length).some(p => Vector3.Distance(p, target) < 1e-7)));
      }
      animation.update(3);
      assert.equal(scene.meshes.length, count);
      assert.ok(animation.state().every(s => !s.busy && s.remaining === 2));
    }
    assert.equal(splashes.length, 12);
    animation.dispose();
  } finally { engine.dispose(); }
});

test('replicated release lands at the authoritative blast position', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const boat = new TransformNode('boat', scene);
    const model = createDepthChargeRacks(scene, boat, 'boat', () => .52, 'stern');
    const target = new Vector3(-.675, 0, -13);
    let landed;
    const animation = createDepthChargeAnimator(model, { onSplash: p => landed = p });
    animation.fire(0, new Vector3(0, 0, 5), target);
    animation.update(1);
    assert.ok(landed && Vector3.Distance(landed, target) < 1e-8);
    animation.dispose();
  } finally { engine.dispose(); }
});

test('a replicated follow-up arriving before the final reload frame is not lost', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const model = createDepthChargeRacks(scene, new TransformNode('boat', scene), 'boat', () => .74);
    let launches = 0;
    const animation = createDepthChargeAnimator(model, {
      replenishMagazine: true, queueWhileReloading: true, onLaunch: () => launches++
    });
    assert.equal(animation.fire(2), true);
    animation.update(4.7);
    assert.equal(animation.fire(2), true);
    assert.equal(animation.fire(2), false, 'only one waiting visual release');
    animation.update(.11);
    assert.equal(launches, 2);
    animation.update(5);
    assert.equal(animation.active, false);
    animation.dispose();
  } finally { engine.dispose(); }
});

test('raised throwers clear the side passage and rail on their way to the unchanged impact area', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const boat = new TransformNode('boat', scene);
    boat.scaling.setAll(3);
    const model = createDepthChargeRacks(scene, boat, 'boat', () => .74);
    const animation = createDepthChargeAnimator(model);
    for (const lane of [2, 3]) {
      animation.fire(lane);
      let crossed = false;
      for (let frame = 0; frame < 180; frame++) {
        animation.update(1 / 120);
        const flight = scene.meshes.find(mesh => mesh.name.includes(`depth_rack_${lane}_`) && mesh.name.includes('_flight_'));
        if (flight && Math.abs(flight.position.x) >= .8 * 3 && !crossed) {
          assert.ok(flight.position.y > 3.3, 'barrel is above the railing while crossing the deck edge');
          crossed = true;
        }
      }
      assert.ok(crossed);
    }
    animation.dispose();
  } finally { engine.dispose(); }
});

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
        assert.ok(Math.abs(splashes[0].z - 224) < 1e-7, 'preview uses the same 24 metre lateral spread');
        assert.ok(Math.abs(splashes[1].z - 176) < 1e-7);
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
