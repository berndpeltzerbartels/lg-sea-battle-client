// Keep subpixel glows until clearly below a pixel; separate thresholds avoid flicker.
export function shouldShowProjectile(pixels, wasVisible = true) {
  return !Number.isFinite(pixels) || pixels >= (wasVisible ? 0.45 : 0.75);
}

export function projectedDiameter(position, radius, view, projection, width, height) {
  const depth = position.x * view[2] + position.y * view[6] + position.z * view[10] + view[14];
  if (depth <= radius) return Infinity;
  return radius * Math.max(Math.abs(projection[0]) * width, Math.abs(projection[5]) * height) / (depth - radius);
}

export function updateProjectileScreenVisibility(projectile, camera, width, height, enabled) {
  let pixels = Infinity;
  if (enabled) {
    const view = camera.getViewMatrix().m;
    const projection = camera.getProjectionMatrix().m;
    const coreRadius = projectile.core.getBoundingInfo().boundingSphere.radius * projectile.core.scaling.x;
    pixels = projectedDiameter(projectile.position, coreRadius, view, projection, width, height);
    for (const mesh of projectile.trail) {
      const radius = mesh.getBoundingInfo().boundingSphere.radius * mesh.scaling.x;
      pixels = Math.max(pixels, projectedDiameter(mesh.position, radius, view, projection, width, height));
    }
  }
  const visible = shouldShowProjectile(pixels, !projectile.screenHidden);
  if (visible === !projectile.screenHidden) return;
  projectile.screenHidden = !visible;
  projectile.root.setEnabled(visible);
  for (const mesh of projectile.trail) mesh.setEnabled(visible);
}
