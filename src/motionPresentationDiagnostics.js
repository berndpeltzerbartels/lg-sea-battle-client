function vector(value) {
  return value ? { x: value.x, y: value.y, z: value.z } : null;
}

export function captureMotionPresentation(root, camera) {
  // Read the matrices Babylon actually holds; forcing an update here could conceal a stale transform.
  const world = root.getWorldMatrix().m;
  const view = camera?.getViewMatrix();
  return {
    local: vector(root.position),
    world: { x: world[12], y: world[13], z: world[14] },
    parent: root.parent?.name ?? null,
    camera: camera ? {
      name: camera.name,
      local: vector(camera.position),
      world: vector(camera.globalPosition),
      parent: camera.parent?.name ?? null,
      view: Array.from(view.m),
      forward: vector(camera.getForwardRay().direction)
    } : null
  };
}

export function createMotionPresentationDiagnostics() {
  let latest = null;
  let sequence = 0;
  let pending = false;
  let lastRendered = null;
  return {
    begin(ship, root, camera) {
      latest = {
        sequence: ++sequence, ship: ship.id,
        server: { x: ship.x, z: ship.z, heading: ship.heading },
        at: performance.now(), before: captureMotionPresentation(root, camera)
      };
      pending = true;
    },
    applied(root, camera) {
      if (latest) latest.applied = captureMotionPresentation(root, camera);
    },
    rendered(root, camera) {
      if (!pending) return;
      latest.rendered = captureMotionPresentation(root, camera);
      latest.renderedAt = performance.now();
      lastRendered = latest;
      pending = false;
    },
    report() { return { latest, lastRendered: pending ? lastRendered : null }; }
  };
}
