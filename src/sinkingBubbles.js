import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import '@babylonjs/core/Meshes/Builders/sphereBuilder.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';

// Shared fixed pool: one low-poly mesh for every leaking wreck, no per-bubble meshes.
export function createSinkingBubbles(scene, capacity = 192) {
  const mesh = MeshBuilder.CreateSphere('sinking_submarine_bubbles', { diameter: 1, segments: 6 }, scene);
  mesh.isPickable = false;
  mesh.setEnabled(false);
  const material = new StandardMaterial('sinking_submarine_bubble_material', scene);
  material.diffuseColor = new Color3(.5, .74, .76);
  material.emissiveColor = new Color3(.06, .12, .13);
  material.specularColor = new Color3(.65, .85, .86);
  material.alpha = .55;
  material.disableDepthWrite = true;
  material.opacityFresnelParameters = new FresnelParameters({
    leftColor: new Color3(.15, .15, .15), rightColor: Color3.White(), power: 1.3
  });
  mesh.material = material;
  const data = new Float32Array(capacity * 16);
  mesh.thinInstanceSetBuffer('matrix', data, 16, false);
  const bubbles = Array.from({ length: capacity }, () => ({ born: -Infinity }));
  let now = 0, cursor = 0, serial = 0, active = 0, untilRefresh = 0;
  let emitters = new WeakMap();
  const matrix = Matrix.Identity(), rotation = Quaternion.Identity();
  const position = Vector3.Zero(), size = Vector3.Zero();

  function follow(motion) {
    if (motion.state !== 'sinking' || motion.vehicleType !== 'submarine'
        || motion.root.position.y >= -.8 || now < (emitters.get(motion) ?? -Infinity)) return;
    const progress = Math.min(1, motion.sinkAge / (motion.sinkDuration ?? 19));
    emitters.set(motion, now + .3 + progress * .25);
    const scale = motion.root.scaling.x;
    const sin = Math.sin(motion.heading), cos = Math.cos(motion.heading);
    for (let i = 0; i < 3; i++) {
      const variation = ((serial++ * 37) % 101) / 100;
      const x = (variation - .5) * .22 * scale, z = [-1.8, .05, 1.25][i] * scale;
      const bubble = bubbles[cursor]; cursor = (cursor + 1) % capacity;
      Object.assign(bubble, { born: now, life: 4.5 + variation * 2,
        x: motion.root.position.x + cos * x + sin * z,
        y: motion.root.position.y + (i === 1 ? 1.15 : .52) * scale,
        z: motion.root.position.z - sin * x + cos * z,
        diameter: scale * (.022 + variation * .018) * (1 - progress * .35),
        rise: scale * (.7 + variation * .4), phase: variation * Math.PI * 2 });
    }
  }

  function update(dt) {
    now += Math.max(0, dt);
    untilRefresh -= dt;
    if (untilRefresh > 0) return;
    untilRefresh = 1 / 20;
    active = 0;
    const anchor = bubbles.find(b => now - b.born >= 0 && now - b.born < b.life
      && b.y + (now - b.born) * b.rise < -.1);
    for (let i = 0; i < capacity; i++) {
      const bubble = bubbles[i], age = now - bubble.born;
      const y = bubble.y + age * bubble.rise;
      if (age >= 0 && age < bubble.life && y < -.1) {
        const fade = Math.min(1, (bubble.life - age) / 1.2);
        const diameter = bubble.diameter * (1 + Math.min(age * .04, .2)) * fade;
        position.set(bubble.x + Math.sin(age * 2 + bubble.phase) * age * .07,
          y, bubble.z + Math.cos(age * 1.7 + bubble.phase) * age * .07);
        size.set(diameter, diameter * 1.15, diameter);
        active++;
      } else {
        position.set(anchor?.x ?? 0, anchor?.y ?? -100, anchor?.z ?? 0); size.setAll(0);
      }
      Matrix.ComposeToRef(size, rotation, position, matrix);
      matrix.copyToArray(data, i * 16);
    }
    mesh.setEnabled(active > 0);
    if (active) {
      mesh.thinInstanceBufferUpdated('matrix');
      mesh.thinInstanceRefreshBoundingInfo();
    }
  }
  return {
    follow, update,
    clear() {
      for (const bubble of bubbles) bubble.born = -Infinity;
      emitters = new WeakMap(); active = 0; mesh.setEnabled(false);
    },
    snapshot: () => ({ active, capacity, visible: mesh.isEnabled(),
      positions: bubbles.filter(b => now - b.born >= 0 && now - b.born < b.life && b.y + (now - b.born) * b.rise < -.1)
        .map(b => ({ x: b.x, y: b.y + (now - b.born) * b.rise, z: b.z })) }),
    dispose() { mesh.dispose(); material.dispose(); }
  };
}
