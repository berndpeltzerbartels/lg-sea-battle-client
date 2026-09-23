export const SURFACE_LAYER = 0x10000000;
export const UNDERWATER_LAYER = 0x20000000;

// Applied to static landscape meshes once, not to collision or navigation data.
export function prepareLandscapeVisibility(root) {
  for (const mesh of root.getChildMeshes()) partitionMesh(mesh);
}

function partitionMesh(mesh) {
  if (!mesh.getTotalVertices()) return;
  const positions = mesh.getVerticesData('position');
  const indices = mesh.getIndices();
  if (!positions || !indices?.length) return;
  const matrix = mesh.computeWorldMatrix(true).m;
  const heights = Array.from({ length: positions.length / 3 }, (_, i) =>
    positions[i * 3] * matrix[1] + positions[i * 3 + 1] * matrix[5]
      + positions[i * 3 + 2] * matrix[9] + matrix[13]);
  const hasAbove = heights.some(y => y > 0);
  const hasBelow = heights.some(y => y < 0);
  if (!hasAbove || !hasBelow) {
    mesh.layerMask = hasBelow ? UNDERWATER_LAYER : SURFACE_LAYER;
    return;
  }
  // Legacy rocks/landmarks can straddle sea level. Split their triangles at load
  // time so neither side needs the hidden half, preserving all vertex attributes.
  const attributes = Object.fromEntries(mesh.getVerticesDataKinds().map(kind => [kind, {
    size: mesh.getVertexBuffer(kind).getSize(), data: mesh.getVerticesData(kind)
  }]));
  const parts = splitAtWaterline(attributes, indices, heights);
  const below = mesh.clone(`${mesh.name}_below_water`, mesh.parent, true);
  below.makeGeometryUnique();
  mesh.makeGeometryUnique();
  applyPart(mesh, parts.above);
  applyPart(below, parts.below);
  mesh.layerMask = SURFACE_LAYER;
  below.layerMask = UNDERWATER_LAYER;
}

function applyPart(mesh, part) {
  for (const [kind, attribute] of Object.entries(part.attributes)) {
    mesh.setVerticesData(kind, attribute.data, false, attribute.size);
  }
  mesh.setIndices(part.indices);
  mesh.refreshBoundingInfo();
}

export function splitAtWaterline(attributes, indices, heights) {
  function part(above) {
    const result = { attributes: Object.fromEntries(Object.entries(attributes).map(([kind, a]) =>
      [kind, { size: a.size, data: [] }])), indices: [] };
    const used = new Map();
    const vertex = index => ({ key: `v${index}`, a: index, b: index, t: 0, h: heights[index] });
    function intersection(a, b) {
      if (a.h === 0) return a;
      if (b.h === 0) return b;
      const first = Math.min(a.a, b.a), second = Math.max(a.a, b.a);
      return { key: `e${first}:${second}`, a: first, b: second,
        t: heights[first] / (heights[first] - heights[second]), h: 0 };
    }
    function add(v) {
      if (used.has(v.key)) return used.get(v.key);
      const index = used.size;
      used.set(v.key, index);
      for (const [kind, a] of Object.entries(attributes)) {
        const values = Array.from({ length: a.size }, (_, j) =>
          a.data[v.a * a.size + j] * (1 - v.t) + a.data[v.b * a.size + j] * v.t);
        if (kind === 'normal') {
          const length = Math.hypot(...values) || 1;
          for (let j = 0; j < values.length; j++) values[j] /= length;
        }
        result.attributes[kind].data.push(...values);
      }
      return index;
    }
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = Array.from(indices.slice(i, i + 3), vertex);
      // Coplanar faces belong only to the surface side.
      if (!above && triangle.every(v => v.h === 0)) continue;
      const polygon = [];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j], b = triangle[(j + 1) % 3];
        const insideA = above ? a.h >= 0 : a.h <= 0;
        const insideB = above ? b.h >= 0 : b.h <= 0;
        if (insideA) polygon.push(a);
        if (insideA !== insideB) polygon.push(intersection(a, b));
      }
      const unique = [...new Map(polygon.map(v => [v.key, v])).values()];
      for (let j = 1; j + 1 < unique.length; j++) {
        result.indices.push(add(unique[0]), add(unique[j]), add(unique[j + 1]));
      }
    }
    return result;
  }
  return { above: part(true), below: part(false) };
}

export function updateLandscapeCameraLayers(camera) {
  const underwater = camera.position.y < 0;
  camera.layerMask = (camera.layerMask & ~(SURFACE_LAYER | UNDERWATER_LAYER))
    | (underwater ? UNDERWATER_LAYER : SURFACE_LAYER);
  return underwater;
}
