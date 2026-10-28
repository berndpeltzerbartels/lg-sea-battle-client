import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createSinkingBubbles } from '../src/sinkingBubbles.js';

function fixture() {
  const engine = new NullEngine(), scene = new Scene(engine);
  const bubbles = createSinkingBubbles(scene);
  const motion = { vehicleType: 'submarine', state: 'sinking', sinkAge: 1, sinkDuration: 19,
    heading: 0, root: { position: new Vector3(20, -20, 30), scaling: new Vector3(3, 3, 3) } };
  return { bubbles, motion, scene, dispose() { bubbles.dispose(); scene.dispose(); engine.dispose(); } };
}

test('submerged wrecks keep leaking after the initial impact; bubbles rise independently of the hull', () => {
  const f = fixture();
  try {
    f.bubbles.follow(f.motion); f.bubbles.update(.1);
    const first = f.bubbles.snapshot();
    assert.equal(first.active, 3);
    assert.ok(first.visible);
    f.motion.root.position.x = 100;
    f.motion.root.position.y = -40;
    f.bubbles.update(.5);
    const rising = f.bubbles.snapshot();
    assert.equal(rising.positions[0].x, first.positions[0].x);
    assert.ok(rising.positions[0].y > first.positions[0].y);
    f.motion.sinkAge = 10;
    f.bubbles.follow(f.motion); f.bubbles.update(.1);
    assert.equal(f.bubbles.snapshot().active, 6, 'a later sinking frame emits fresh bubbles');
    assert.ok(f.bubbles.snapshot().positions.some(b => b.x > 99 && b.y < -35));
    f.motion.state = 'sunk';
    f.bubbles.update(7); f.bubbles.follow(f.motion); f.bubbles.update(.1);
    assert.equal(f.bubbles.snapshot().active, 0);
    assert.equal(f.bubbles.snapshot().visible, false);
  } finally { f.dispose(); }
});

test('live submarines, surface wrecks and torpedo boats never emit sinking-submarine bubbles', () => {
  const f = fixture();
  try {
    for (const [vehicleType, state, y] of [['submarine', 'active', -20], ['submarine', 'sinking', 0],
      ['torpedo-boat', 'sinking', -20], ['submarine', 'sunk', -20]]) {
      Object.assign(f.motion, { vehicleType, state }); f.motion.root.position.y = y;
      f.bubbles.follow(f.motion); f.bubbles.update(.5);
      assert.equal(f.bubbles.snapshot().active, 0);
    }
  } finally { f.dispose(); }
});

test('emission is throttled, uses one mesh and a bounded pool, and clears or disposes cleanly', () => {
  const f = fixture();
  try {
    for (let frame = 0; frame < 600; frame++) {
      f.bubbles.follow(f.motion); f.bubbles.update(1 / 60);
    }
    assert.ok(f.bubbles.snapshot().active > 15 && f.bubbles.snapshot().active < 70);
    const meshCount = f.scene.meshes.length;
    for (let i = 0; i < 1000; i++) f.bubbles.follow({ ...f.motion });
    f.bubbles.update(.1);
    assert.equal(f.scene.meshes.length, meshCount);
    assert.equal(meshCount, 1);
    assert.ok(f.bubbles.snapshot().active <= 192);
    f.bubbles.clear();
    assert.equal(f.bubbles.snapshot().active, 0);
  } finally { f.dispose(); }
});

test('bubbles vanish on reaching the water surface instead of rising into the sky', () => {
  const f = fixture();
  try {
    f.motion.root.position.y = -5.58;
    f.bubbles.follow(f.motion); f.bubbles.update(.1);
    assert.ok(f.bubbles.snapshot().active > 0);
    f.bubbles.update(3);
    assert.equal(f.bubbles.snapshot().active, 0);
  } finally { f.dispose(); }
});
