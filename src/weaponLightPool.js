import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const pools = new WeakMap();
const leases = new WeakMap();

export function acquireWeaponLight(scene, kind, position) {
  let kinds = pools.get(scene);
  if (!kinds) {
    kinds = new Map();
    pools.set(scene, kinds);
  }
  let pool = kinds.get(kind);
  if (!pool) { pool = []; kinds.set(kind, pool); }
  let light = pool.find(candidate => !leases.get(candidate));
  if (!light) {
    light = new PointLight(`pooled-${kind}-${pool.length}`, Vector3.Zero(), scene);
    pool.push(light);
  }
  leases.set(light, true);
  light.position.copyFrom(position);
  light.intensity = 0;
  if (!light.isEnabled()) light.setEnabled(true);
  return light;
}

export function releaseWeaponLight(light) {
  if (!light || !leases.get(light)) return;
  leases.set(light, false);
  light.intensity = 0;
  if (light.isEnabled()) light.setEnabled(false);
}
