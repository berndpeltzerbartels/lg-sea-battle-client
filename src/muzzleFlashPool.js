const pools = new WeakMap();
const leases = new WeakMap();
const maxIdle = 32;

export function acquireMuzzleFlash(owner, weapon, create) {
  let kinds = pools.get(owner);
  if (!kinds) { kinds = new Map(); pools.set(owner, kinds); }
  let idle = kinds.get(weapon);
  if (!idle) { idle = []; kinds.set(weapon, idle); }
  const mesh = idle.pop() ?? create();
  leases.set(mesh, idle);
  mesh.setEnabled(true);
  mesh.visibility = 1;
  mesh.scaling.setAll(1);
  return mesh;
}

export function releaseMuzzleFlash(mesh) {
  const idle = leases.get(mesh);
  if (!idle) return;
  leases.delete(mesh);
  if (idle.length >= maxIdle) { mesh.dispose(); return; }
  mesh.setEnabled(false);
  idle.push(mesh);
}
