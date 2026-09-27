let nextFlashPriority = 1;

export function prioritizeMuzzleLight(light) {
  light.renderPriority = nextFlashPriority++;
  // Babylon sorts scene lights, but existing meshes keep their own light order.
  for (const mesh of light.getScene().meshes) {
    mesh.lightSources.sort((a, b) => b.renderPriority - a.renderPriority);
  }
}

export function preserveEnvironmentLight(light) {
  light.renderPriority = Number.MAX_SAFE_INTEGER;
}
