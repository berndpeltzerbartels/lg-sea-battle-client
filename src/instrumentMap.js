export function prepareInstrumentPaths(data, Path = globalThis.Path2D) {
  if (data?.version !== 1 || !Array.isArray(data.layers) || data.layers.length !== 3) {
    throw new Error("Prepared instrument map missing or outdated. Reimport the landscape.");
  }
  return data.layers.map((layer, index) => {
    if (layer.height !== [0, 50, 150][index] || !Array.isArray(layer.contours)) {
      throw new Error("Invalid instrument map layers");
    }
    const path = new Path();
    for (const ring of layer.contours) {
      if (!Array.isArray(ring) || ring.length < 3 || ring.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.z))) {
        throw new Error("Invalid instrument map contour");
      }
      path.moveTo(ring[0].x, ring[0].z);
      for (let i = 1; i < ring.length; i++) path.lineTo(ring[i].x, ring[i].z);
      path.closePath();
    }
    return path;
  });
}

export function radarTransform(origin, centerX, centerY, scale, heading) {
  const a = Math.cos(heading) * scale, b = -Math.sin(heading) * scale;
  const c = b, d = -a;
  return [a, b, c, d, centerX - a * origin.x - c * origin.z, centerY - b * origin.x - d * origin.z];
}
