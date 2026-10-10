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
