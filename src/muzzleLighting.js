import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

let nextFlashPriority = 1;
const dirtyScenes = new WeakSet();

export function prioritizeMuzzleLight(light) {
  light.renderPriority = nextFlashPriority++;
  dirtyScenes.add(light.getScene());
}

export function flushMuzzleLightPriorities(scene) {
  if (!dirtyScenes.delete(scene)) return;
  // Babylon sorts scene lights, but existing meshes keep their own light order.
  for (const mesh of scene.meshes) {
    mesh.lightSources.sort((a, b) => b.renderPriority - a.renderPriority);
  }
}

export function preserveEnvironmentLight(light) {
  light.renderPriority = Number.MAX_SAFE_INTEGER;
}

/** A fixed light rig: shots change uniforms, never scene-wide light membership. */
export function createMuzzleLightRig(scene, { water, ownShipMeshes = [], observerPosition, scale = 3, mode = 'crew' }) {
  const waterSlots = [], crewSlots = new Map();
  function slot(name, targets) {
    const light = new PointLight(`muzzle-${name}`, Vector3.Zero(), scene);
    light.intensity = 0;
    light.renderPriority = 1;
    light.includedOnlyMeshes = targets.slice();
    return { light, age: 1, lifetime: 0, strength: 0, role: name };
  }
  if (mode !== 'none' && water) {
    waterSlots.push(slot('water-0', [water]), slot('water-1', [water]));
  }
  if (mode === 'crew' && ownShipMeshes.length) {
    crewSlots.set('flak', slot('crew-flak', ownShipMeshes));
    crewSlots.set('cannon', slot('crew-cannon', ownShipMeshes));
  }
  const slots = [...waterSlots, ...crewSlots.values()];
  const distanceSquared = p => observerPosition ? Vector3.DistanceSquared(p, observerPosition) : 0;
  function illuminate(target, position, weapon) {
    const cannon = weapon === 'cannon';
    target.light.position.copyFrom(position);
    target.light.diffuse.set(1, cannon ? .84 : .76, cannon ? .54 : .42);
    target.light.specular.set(1, cannon ? .92 : .78, cannon ? .72 : .5);
    target.light.range = (cannon ? 66 : 28) * Math.sqrt(scale);
    target.age = 0;
    target.lifetime = cannon ? .22 : .16;
    target.strength = cannon ? 5.2 : 2;
    target.light.intensity = target.strength;
  }
  return {
    flash(position, weapon, ownShip = false) {
      const crew = ownShip && crewSlots.get(weapon);
      if (crew) illuminate(crew, position, weapon);
      // The luminous flash is always shown. Reflections only need a nearby,
      // bounded light budget; a distant gun never evicts a closer active one.
      const distance = distanceSquared(position);
      if (distance > 600 * 600) return;
      const target = waterSlots.find(s => s.age >= s.lifetime)
        ?? waterSlots.reduce((farthest, s) => !farthest || distanceSquared(s.light.position) > distanceSquared(farthest.light.position) ? s : farthest, null);
      if (target && (target.age >= target.lifetime || distance <= distanceSquared(target.light.position))) {
        illuminate(target, position, weapon);
      }
    },
    update(dt) {
      for (const target of slots) {
        target.age += dt;
        target.light.intensity = target.strength * Math.max(0, 1 - target.age / (target.lifetime || 1));
      }
    },
    snapshot() {
      return slots.map(s => ({ role: s.role, intensity: s.light.intensity, enabled: s.light.isEnabled(), targets: s.light.includedOnlyMeshes.length }));
    }
  };
}
