const pools = new WeakMap();
const leases = new WeakMap();
const maxIdle = 128;

export function acquireProjectileVisual(owner, key, create) {
  let kinds = pools.get(owner);
  if (!kinds) { kinds = new Map(); pools.set(owner, kinds); }
  let idle = kinds.get(key);
  if (!idle) { idle = []; kinds.set(key, idle); }
  const visual = idle.pop() ?? create();
  leases.set(visual, idle);
  visual.root.setEnabled(true);
  for (const mesh of [visual.core, ...visual.trail]) {
    mesh.setEnabled(true);
    mesh.scaling.setAll(1);
    mesh.visibility = 1;
  }
  return visual;
}

export function releaseProjectileVisual(visual) {
  const idle = leases.get(visual);
  if (!idle) return;
  leases.delete(visual);
  if (idle.length >= maxIdle) {
    visual.trail.forEach(mesh => mesh.dispose());
    visual.root.dispose();
    return;
  }
  visual.root.setEnabled(false);
  visual.trail.forEach(mesh => mesh.setEnabled(false));
  idle.push(visual);
}

export function advanceProjectileSamples(samples, position) {
  for (let i = samples.length - 1; i > 0; i--) samples[i].copyFrom(samples[i - 1]);
  samples[0].copyFrom(position);
}
