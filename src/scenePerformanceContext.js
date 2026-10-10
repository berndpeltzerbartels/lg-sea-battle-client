function round(n) { return Math.round(n * 1000) / 1000; }
function point(p) { return { x: round(p.x), y: round(p.y), z: round(p.z) }; }
export function meshPerformanceCategory(mesh) {
  const material = mesh.material?.name ?? '';
  if (/foam|wake/i.test(material)) return 'foam';
  if (/smoke|fire|explosion|spark|glow/i.test(material)) return 'effects';
  if (mesh.metadata?.performanceCategory) return mesh.metadata.performanceCategory;
  if (/tracer/i.test(material)) return 'projectiles';
  if (/water|sea_material/i.test(material)) return 'water';
  return 'other';
}

export function collectScenePerformanceContext(scene, shipPosition, shipHeading, station) {
  const camera = scene.activeCamera;
  const forward = camera.getForwardRay().direction;
  const active = scene.getActiveMeshes();
  const categories = {}, materials = {};
  for (let i = 0; i < active.length; i++) {
    const mesh = active.data[i];
    const category = meshPerformanceCategory(mesh);
    const tally = categories[category] ??= { meshes: 0, triangles: 0, subMeshes: 0 };
    tally.meshes++;
    tally.triangles += Math.floor((mesh.getTotalIndices?.() ?? 0) / 3);
    tally.subMeshes += mesh.subMeshes?.length ?? 0;
    const name = mesh.material?.name ?? '(none)';
    materials[name] = (materials[name] ?? 0) + 1;
  }
  return {
    ship: { position: point(shipPosition), headingDegrees: round((shipHeading * 180 / Math.PI + 360) % 360), station },
    camera: { name: camera.name, position: point(camera.globalPosition ?? camera.position), forward: point(forward),
      headingDegrees: round((Math.atan2(forward.x, forward.z) * 180 / Math.PI + 360) % 360),
      pitchDegrees: round(Math.asin(Math.max(-1, Math.min(1, forward.y))) * 180 / Math.PI), fov: round(camera.fov) },
    categories, materials
  };
}
