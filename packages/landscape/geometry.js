// Extracted unchanged from the game renderer. No DOM or Babylon dependency.
export const authoredTerrainVisualScale = 1;
export const authoredSeaLevelMeters = 0;
export const authoredSnowLineMeters = 4500;
export const authoredDefaultHeightRadius = 160;
export const authoredDefaultTerrainSampleSpacing = 45;
export const authoredMaxInteriorTerrainSamples = 1800;
export const authoredLodTerrainSampleSpacing = 130;
export const authoredLodMaxInteriorTerrainSamples = 260;
export const authoredLodDistance = 1450;
export const authoredCoastlineSmoothingIterations = 2;
export const authoredLocalCoastlineCache = new WeakMap();
export const authoredWorldCoastlineCache = new WeakMap();

export function createAuthoredTerrainMeshData(land, options = {}) {
  const island = authoredLocalTerrainIsland(land);
  const boundaryVertices = createAuthoredRenderableCoastline(island.polygon)
    .map((point) => ({ x: point.x, z: point.z, h: authoredTerrainBaseMeters(island), boundary: true }));
  const heightVertices = (island.heightPoints ?? []).filter((point) => !point.plateauGroupId).map((point) => ({
    x: point.x,
    z: point.z,
    h: sanitizeAuthoredHeight(point.h),
    radius: sanitizeAuthoredHeightRadius(point.radius ?? authoredDefaultHeightRadius),
    falloff: sanitizeAuthoredHeightFalloff(point.falloff),
    plateauGroupId: point.plateauGroupId,
    basePlateauGroupId: point.basePlateauGroupId,
    plateauOrder: point.plateauOrder,
    boundary: false,
    basePointIndexes: sanitizeAuthoredBasePointIndexes(point.basePointIndexes, boundaryVertices.length)
  }));
  const plateaus = authoredPlateausForIsland(island);
  const plateauVertices = plateaus.flatMap((plateau) => [
    ...plateau.polygon.map((point) => ({
        x: point.x,
        z: point.z,
        h: plateau.height,
        plateauGroupId: plateau.id,
        boundary: false
      }))
  ]);

  const needsMaterialSamples = (island.materialZones ?? []).length > 0;
  const needsHeightBlendSamples = heightVertices.length > 1;
  const heightBlendSurfaces = needsHeightBlendSamples ? createAuthoredSingleHeightPointSurfaces(island) : [];
  const vertices = uniqueTerrainVertices([
    ...boundaryVertices,
    ...(needsMaterialSamples || needsHeightBlendSamples
      ? createAuthoredInteriorTerrainSamples(island, { ...options, heightBlend: needsHeightBlendSamples, heightBlendSurfaces })
      : []),
    ...heightVertices,
    ...plateauVertices
  ]);
  const terrainTriangles = triangulateAuthoredDelaunay(vertices)
    .filter((triangle) => pointInPolygon2d(triangleCentroid2d(triangle, vertices), island.polygon))
    .filter((triangle) => !plateaus.some((plateau) => pointInPolygon2d(triangleCentroid2d(triangle, vertices), plateau.polygon)))
    .map((triangle) => orientAuthoredTerrainTriangleForBabylon(triangle, vertices));
  const plateauTriangles = plateaus.flatMap((plateau) => triangulateAuthoredPlateau(plateau, vertices));
  const indices = [...terrainTriangles, ...plateauTriangles].flat();

  return { vertices, indices };
}

export function authoredLocalTerrainIsland(land) {
  return {
    polygon: authoredLocalPolygon(land),
    heightPoints: authoredLocalHeightPoints(land),
    seaFloorHeight: land.seaFloorHeight,
    baseHeight: land.baseHeight,
    baseLevel: land.baseLevel,
    baseLandmassId: land.baseLandmassId,
    basePlateauGroupId: land.basePlateauGroupId,
    material: land.material,
    materialZones: authoredLocalMaterialZones(land)
  };
}

export function authoredLocalPolygon(land) {
  return (land.polygon ?? []).map((point) => ({
    x: Number(point.x) - land.x,
    z: Number(point.z) - land.z
  }));
}

export function authoredLocalHeightPoints(land) {
  return (land.heightPoints ?? []).map((point) => ({
    x: Number(point.x) - land.x,
    z: Number(point.z) - land.z,
    h: point.h,
    radius: point.radius,
    falloff: point.falloff,
    basePointIndexes: point.basePointIndexes,
    plateauGroupId: point.plateauGroupId,
    basePlateauGroupId: point.basePlateauGroupId,
    plateauOrder: point.plateauOrder
  }));
}

export function authoredLocalMaterialZones(land) {
  return (land.materialZones ?? []).map((zone) => ({
    id: zone.id,
    material: zone.material,
    polygon: (zone.polygon ?? []).map((point) => ({
      x: Number(point.x) - land.x,
      z: Number(point.z) - land.z
    }))
  }));
}

export function createAuthoredRenderableCoastline(polygon) {
  return smoothAuthoredClosedPolygon(polygon, authoredCoastlineSmoothingIterations);
}

export function smoothAuthoredClosedPolygon(points, iterations) {
  if (!Array.isArray(points) || points.length < 3 || iterations <= 0) return points ?? [];
  let smoothed = points.map((point) => ({ x: point.x, z: point.z }));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = [];
    for (let index = 0; index < smoothed.length; index += 1) {
      const current = smoothed[index];
      const following = smoothed[(index + 1) % smoothed.length];
      next.push({
        x: current.x * 0.75 + following.x * 0.25,
        z: current.z * 0.75 + following.z * 0.25
      });
      next.push({
        x: current.x * 0.25 + following.x * 0.75,
        z: current.z * 0.25 + following.z * 0.75
      });
    }
    smoothed = next;
  }
  return smoothed;
}

export function authoredTerrainBaseMeters(land) {
  const numeric = Number(land.baseHeight ?? land.seaFloorHeight ?? -80);
  if (!Number.isFinite(numeric)) return authoredSeaFloorMeters(land);
  return Math.max(authoredSeaFloorMeters(land), Math.min(8000, numeric));
}

export function authoredSeaFloorMeters(land) {
  const seaFloorMeters = Number(land.seaFloorHeight ?? -80);
  if (!Number.isFinite(seaFloorMeters)) return -80;
  return Math.min(-1, Math.max(-2000, Math.round(seaFloorMeters)));
}

export function sanitizeAuthoredHeight(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(Math.max(-500, Math.min(8000, numeric)) * 10) / 10;
}

export function sanitizeAuthoredHeightRadius(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return authoredDefaultHeightRadius;
  return Math.round(Math.max(20, Math.min(5000, numeric)));
}

export function sanitizeAuthoredHeightFalloff(value) {
  return ["spike", "hill", "plateau"].includes(value) ? value : "spike";
}

export function sanitizeAuthoredBasePointIndexes(indexes, pointCount) {
  if (!Array.isArray(indexes)) return [];
  return [...new Set(indexes)]
    .map((index) => Number(index))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < pointCount)
    .sort((a, b) => a - b);
}

export function authoredPlateausForIsland(island) {
  return authoredPlateauGroupsForIsland(island).map((points) => {
    const polygon = smoothAuthoredClosedPolygon(orderedAuthoredPlateauPoints(points), 1);
    return {
      id: points[0].plateauGroupId,
      polygon,
      height: points.reduce((sum, point) => sum + sanitizeAuthoredHeight(point.h), 0) / points.length
    };
  });
}

export function authoredPlateauGroupsForIsland(island) {
  const groups = new Map();
  (island.heightPoints ?? []).forEach((point) => {
    if (!point.plateauGroupId) return;
    const group = groups.get(point.plateauGroupId) ?? [];
    group.push(point);
    groups.set(point.plateauGroupId, group);
  });
  return [...groups.values()].filter((points) => points.length >= 3);
}

export function orderedAuthoredPlateauPoints(points) {
  const ordered = [...points].sort((a, b) => Number(a.plateauOrder) - Number(b.plateauOrder));
  return ordered.every((point, index) => point.plateauOrder === index) && isSimpleAuthoredPolygon(ordered)
    ? ordered
    : sortAuthoredPointsAroundCenter(points);
}

export function isSimpleAuthoredPolygon(points) {
  if (points.length < 4) return points.length >= 3;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    for (let other = index + 1; other < points.length; other += 1) {
      if (other === index || other === (index + 1) % points.length || (other + 1) % points.length === index) continue;
      const c = points[other];
      const d = points[(other + 1) % points.length];
      if (authoredSegmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}

export function authoredSegmentsIntersect(a, b, c, d) {
  const o1 = authoredTriangleOrientation(a, b, c);
  const o2 = authoredTriangleOrientation(a, b, d);
  const o3 = authoredTriangleOrientation(c, d, a);
  const o4 = authoredTriangleOrientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function authoredTriangleOrientation(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

export function sortAuthoredPointsAroundCenter(points) {
  const center = polygonCentroid2d(points);
  return [...points].sort((a, b) => Math.atan2(a.z - center.z, a.x - center.x) - Math.atan2(b.z - center.z, b.x - center.x));
}

export function polygonCentroid2d(points) {
  if (!points.length) return null;
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, z: acc.z + point.z }), { x: 0, z: 0 });
  return { x: sum.x / points.length, z: sum.z / points.length };
}

export function createAuthoredSingleHeightPointSurfaces(island) {
  const renderBoundary = createAuthoredRenderableCoastline(island.polygon);
  return (island.heightPoints ?? []).filter((point) => !point.plateauGroupId).map((point) => {
    const base = authoredHeightPointBase(island, point, renderBoundary);
    const vertices = [
      ...base.polygon.map((boundaryPoint) => ({ ...boundaryPoint, h: base.floor })),
      { x: point.x, z: point.z, h: sanitizeAuthoredHeight(point.h) }
    ];
    const triangles = triangulateAuthoredDelaunay(vertices)
      .filter((triangle) => pointInPolygon2d(triangleCentroid2d(triangle, vertices), base.polygon));
    return { vertices, triangles };
  });
}

export function authoredHeightPointBase(island, point, defaultBoundary) {
  const basePointIndexes = sanitizeAuthoredBasePointIndexes(point.basePointIndexes, island.polygon.length);
  if (basePointIndexes.length >= 3) {
    return {
      polygon: basePointIndexes.map((index) => island.polygon[index]),
      floor: authoredTerrainBaseMeters(island)
    };
  }
  const plateau = point.basePlateauGroupId ? authoredPlateauById(island, point.basePlateauGroupId) : null;
  if (plateau) {
    return {
      polygon: plateau.polygon,
      floor: plateau.height
    };
  }
  return {
    polygon: defaultBoundary,
    floor: authoredTerrainBaseMeters(island)
  };
}

export function authoredPlateauById(island, plateauGroupId) {
  return authoredPlateausForIsland(island).find((plateau) => plateau.id === plateauGroupId) ?? null;
}

export function triangulateAuthoredDelaunay(points) {
  if (points.length < 3) return [];
  const bounds = boundsForPoints(points);
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 1);
  const midX = (bounds.minX + bounds.maxX) * 0.5;
  const midZ = (bounds.minZ + bounds.maxZ) * 0.5;
  const workPoints = [
    ...points,
    { x: midX - span * 8, z: midZ - span * 4 },
    { x: midX, z: midZ + span * 8 },
    { x: midX + span * 8, z: midZ - span * 4 }
  ];
  const superStart = points.length;
  let triangles = [[superStart, superStart + 1, superStart + 2]];

  points.forEach((point, pointIndex) => {
    const badTriangles = triangles.filter((triangle) => authoredCircumcircleContains(workPoints, triangle, point));
    const polygon = [];
    badTriangles.forEach((triangle) => {
      [[triangle[0], triangle[1]], [triangle[1], triangle[2]], [triangle[2], triangle[0]]].forEach((edge) => {
        const reverseIndex = polygon.findIndex((item) => item[0] === edge[1] && item[1] === edge[0]);
        if (reverseIndex >= 0) polygon.splice(reverseIndex, 1);
        else polygon.push(edge);
      });
    });
    triangles = triangles.filter((triangle) => !badTriangles.includes(triangle));
    polygon.forEach((edge) => triangles.push([edge[0], edge[1], pointIndex]));
  });

  return triangles.filter((triangle) => triangle.every((index) => index < points.length));
}

export function boundsForPoints(points) {
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minZ: Math.min(bounds.minZ, point.z),
    maxZ: Math.max(bounds.maxZ, point.z)
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
}

export function authoredCircumcircleContains(points, triangle, point) {
  const [a, b, c] = triangle.map((index) => points[index]);
  const ax = a.x - point.x;
  const az = a.z - point.z;
  const bx = b.x - point.x;
  const bz = b.z - point.z;
  const cx = c.x - point.x;
  const cz = c.z - point.z;
  const determinant = (ax * ax + az * az) * (bx * cz - cx * bz)
    - (bx * bx + bz * bz) * (ax * cz - cx * az)
    + (cx * cx + cz * cz) * (ax * bz - bx * az);
  return authoredTriangleOrientation(a, b, c) > 0 ? determinant > 0 : determinant < 0;
}

export function pointInPolygon2d(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = current.z > point.z !== previousPoint.z > point.z
      && point.x < ((previousPoint.x - current.x) * (point.z - current.z)) / (previousPoint.z - current.z) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function triangleCentroid2d(triangle, source) {
  const points = triangle.map((index) => Array.isArray(source) && source[index] && typeof source[index] === "object"
    ? { x: source[index].x, z: source[index].z }
    : vertexPosition2d(index, source));
  return {
    x: (points[0].x + points[1].x + points[2].x) / 3,
    z: (points[0].z + points[1].z + points[2].z) / 3
  };
}

export function vertexPosition2d(index, positions) {
  return { x: positions[index * 3], z: positions[index * 3 + 2] };
}

export function uniqueTerrainVertices(points) {
  const seen = new Set();
  return points.filter((point) => {
    const key = `${Math.round(point.x * 100)}:${Math.round(point.z * 100)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createAuthoredInteriorTerrainSamples(island, options = {}) {
  const polygon = island.polygon;
  if (polygon.length < 3) return [];
  const directHeightBases = directAuthoredHeightBasePolygons(island);
  const bounds = boundsForPoints(polygon);
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const lodSampling = options.sampleSpacing != null && options.sampleSpacing >= authoredLodTerrainSampleSpacing;
  const sampleSpacing = options.heightBlend
    ? Math.max(2, Math.min(width, depth) / (lodSampling ? 10 : 20))
    : (options.sampleSpacing ?? authoredDefaultTerrainSampleSpacing);
  const maxInteriorTerrainSamples = options.heightBlend
    ? Math.min(options.maxInteriorTerrainSamples ?? 520, lodSampling ? 140 : 520)
    : (options.maxInteriorTerrainSamples ?? authoredMaxInteriorTerrainSamples);
  const area = Math.max(
    sampleSpacing * sampleSpacing,
    width * depth
  );
  const spacing = Math.max(sampleSpacing, Math.sqrt(area / maxInteriorTerrainSamples));
  const vertices = [];
  sampling:
  for (let x = Math.ceil(bounds.minX / spacing) * spacing; x <= bounds.maxX; x += spacing) {
    for (let z = Math.ceil(bounds.minZ / spacing) * spacing; z <= bounds.maxZ; z += spacing) {
      if (!pointInPolygon2d({ x, z }, polygon)) continue;
      if (directHeightBases.some((basePolygon) => pointInPolygon2d({ x, z }, basePolygon))) continue;
      const sampledHeight = options.heightBlend
        ? authoredHeightFromSinglePointSurfaces(options.heightBlendSurfaces, { x, z }, authoredTerrainBaseMeters(island))
        : authoredTerrainHeightAt(island, x, z);
      vertices.push({ x, z, h: sampledHeight, boundary: false, sample: true });
      if (vertices.length >= maxInteriorTerrainSamples) break sampling;
    }
  }
  return vertices;
}

export function directAuthoredHeightBasePolygons(island) {
  return (island.heightPoints ?? [])
    .filter((point) => !point.plateauGroupId && (point.basePlateauGroupId || sanitizeAuthoredBasePointIndexes(point.basePointIndexes, island.polygon.length).length >= 3))
    .map((point) => authoredHeightPointBase(island, point, island.polygon).polygon)
    .filter((polygon) => polygon.length >= 3);
}

export function authoredHeightFromSinglePointSurfaces(surfaces, point, fallback) {
  let height = fallback;
  for (const surface of surfaces ?? []) {
    for (const triangle of surface.triangles) {
      const [a, b, c] = triangle.map((index) => surface.vertices[index]);
      const weights = barycentricAuthoredWeightsForPoint(point, a, b, c);
      if (!weights) continue;
      height = Math.max(height, a.h * weights.a + b.h * weights.b + c.h * weights.c);
      break;
    }
  }
  return height;
}

export function barycentricAuthoredWeightsForPoint(point, a, b, c) {
  const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  if (Math.abs(denominator) < 0.000001) return null;
  const weightA = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / denominator;
  const weightB = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / denominator;
  const weightC = 1 - weightA - weightB;
  const tolerance = -0.000001;
  return weightA >= tolerance && weightB >= tolerance && weightC >= tolerance
    ? { a: weightA, b: weightB, c: weightC }
    : null;
}

export function authoredTerrainHeightAt(island, x, z) {
  const heightPoints = island.heightPoints ?? [];
  const baseHeight = authoredTerrainBaseMeters(island);
  if (heightPoints.length === 0) return baseHeight;
  const plateau = authoredPlateauAt(island, x, z);
  if (plateau) return authoredStackedPlateauHeightAt(island, x, z, plateau);
  return interpolateAuthoredHeight(island, x, z);
}

export function authoredPlateauAt(island, x, z) {
  for (const plateau of authoredPlateausForIsland(island)) {
    if (pointInPolygon2d({ x, z }, plateau.polygon)) return plateau;
  }
  return null;
}

export function authoredStackedPlateauHeightAt(island, x, z, plateau) {
  let height = plateau.height;
  for (const point of island.heightPoints ?? []) {
    if (point.basePlateauGroupId !== plateau.id) continue;
    const base = authoredHeightPointBase(island, point, plateau.polygon);
    const contribution = authoredHeightFromBasePolygon(point, base.polygon, base.floor, x, z);
    if (contribution != null) height = Math.max(height, contribution);
  }
  return height;
}

export function authoredHeightFromBasePolygon(point, basePolygon, floor, x, z) {
  if (!basePolygon || basePolygon.length < 3 || !pointInPolygon2d({ x, z }, basePolygon)) return null;
  const peak = {
    x: point.x,
    z: point.z,
    h: sanitizeAuthoredHeight(point.h),
    falloff: sanitizeAuthoredHeightFalloff(point.falloff)
  };
  for (let index = 0; index < basePolygon.length; index += 1) {
    const a = basePolygon[index];
    const b = basePolygon[(index + 1) % basePolygon.length];
    const peakWeight = barycentricAuthoredWeightForPoint({ x, z }, a, b, peak);
    if (peakWeight != null) {
      const shapedWeight = authoredHeightProfileWeight(peakWeight, peak.falloff);
      return floor + (peak.h - floor) * shapedWeight;
    }
  }
  return floor;
}

export function barycentricAuthoredWeightForPoint(point, a, b, c) {
  return barycentricAuthoredWeightsForPoint(point, a, b, c)?.c ?? null;
}

export function authoredHeightProfileWeight(linearWeight, falloff) {
  const weight = Math.max(0, Math.min(1, linearWeight));
  if (falloff === "plateau") return smoothstep(0, 0.58, weight);
  if (falloff === "spike") return weight;
  return weight * weight * (3 - 2 * weight);
}

export function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function interpolateAuthoredHeight(island, x, z, defaultBoundary = island.polygon) {
  let height = authoredTerrainBaseMeters(island);
  for (const point of island.heightPoints ?? []) {
    if (point.plateauGroupId) continue;
    const base = authoredHeightPointBase(island, point, defaultBoundary);
    const contribution = authoredHeightFromBasePolygon(point, base.polygon, base.floor, x, z);
    if (contribution != null) height = Math.max(height, contribution);
  }
  return height;
}

export function orientAuthoredTerrainTriangleForBabylon(triangle, vertices) {
  const positions = vertices.flatMap((point) => [point.x, point.h, point.z]);
  return triangleNormalY(positions, triangle[0], triangle[1], triangle[2]) < 0
    ? triangle
    : [triangle[0], triangle[2], triangle[1]];
}

export function triangleNormalY(positions, a, b, c) {
  const ax = positions[a * 3];
  const ay = positions[a * 3 + 1];
  const az = positions[a * 3 + 2];
  const ux = positions[b * 3] - ax;
  const uy = positions[b * 3 + 1] - ay;
  const uz = positions[b * 3 + 2] - az;
  const vx = positions[c * 3] - ax;
  const vy = positions[c * 3 + 1] - ay;
  const vz = positions[c * 3 + 2] - az;
  return uz * vx - ux * vz;
}

export function triangulateAuthoredPlateau(plateau, vertices) {
  const indexes = plateau.polygon.map((point) => vertices.findIndex((vertex) => vertex.x === point.x && vertex.z === point.z));
  if (indexes.some((index) => index < 0)) return [];
  return triangulateAuthoredSimplePolygon(plateau.polygon)
    .map((triangle) => orientAuthoredTerrainTriangleForBabylon(triangle.map((index) => indexes[index]), vertices));
}

export function triangulateAuthoredSimplePolygon(points) {
  const remaining = points.map((_, index) => index);
  const triangles = [];
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.z - next.x * point.z;
  }, 0);
  const winding = area >= 0 ? 1 : -1;
  while (remaining.length > 3) {
    let clipped = false;
    for (let cursor = 0; cursor < remaining.length; cursor += 1) {
      const previous = remaining[(cursor - 1 + remaining.length) % remaining.length];
      const current = remaining[cursor];
      const next = remaining[(cursor + 1) % remaining.length];
      if (authoredTriangleOrientation(points[previous], points[current], points[next]) * winding <= 0) continue;
      if (remaining.some((index) => index !== previous && index !== current && index !== next
        && barycentricAuthoredWeightsForPoint(points[index], points[previous], points[current], points[next]) != null)) continue;
      triangles.push([previous, current, next]);
      remaining.splice(cursor, 1);
      clipped = true;
      break;
    }
    if (!clipped) return [];
  }
  if (remaining.length === 3) triangles.push([...remaining]);
  return triangles;
}

export function splitAuthoredTerrainSurfaces(terrain, land) {
  const surfaces = {
    land: createAuthoredSurfaceData(),
    sand: createAuthoredSurfaceData(),
    snow: createAuthoredSurfaceData(),
    seaFloor: createAuthoredSurfaceData()
  };

  for (let index = 0; index < terrain.indices.length; index += 3) {
    const triangle = [
      terrain.vertices[terrain.indices[index]],
      terrain.vertices[terrain.indices[index + 1]],
      terrain.vertices[terrain.indices[index + 2]]
    ];
    const aboveWater = clipAuthoredHeightPolygon(triangle, authoredSeaLevelMeters, true);
    const belowWater = clipAuthoredHeightPolygon(triangle, authoredSeaLevelMeters, false);
    appendAuthoredSurfacePolygon(surfaceForAuthoredLandPolygon(aboveWater, surfaces, land), aboveWater);
    appendAuthoredSurfacePolygon(surfaces.seaFloor, belowWater);
  }

  return surfaces;
}

export function createAuthoredSurfaceData() {
  return {
    positions: [],
    indices: [],
    vertexIndexes: new Map()
  };
}

export function clipAuthoredHeightPolygon(points, threshold, keepAbove) {
  if (points.length < 3) return [];
  const clipped = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const currentInside = keepAbove ? current.h >= threshold : current.h <= threshold;
    const nextInside = keepAbove ? next.h >= threshold : next.h <= threshold;

    if (currentInside && nextInside) {
      clipped.push(next);
    } else if (currentInside && !nextInside) {
      clipped.push(interpolateAuthoredHeightThresholdPoint(current, next, threshold));
    } else if (!currentInside && nextInside) {
      clipped.push(interpolateAuthoredHeightThresholdPoint(current, next, threshold));
      clipped.push(next);
    }
  }
  return clipped;
}

export function interpolateAuthoredHeightThresholdPoint(a, b, threshold) {
  const range = b.h - a.h;
  const t = Math.abs(range) < 0.000001 ? 0 : (threshold - a.h) / range;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    h: threshold
  };
}

export function appendAuthoredSurfacePolygon(surface, points) {
  if (!surface || points.length < 3) return;
  const pointIndexes = points.map((point) => authoredSurfaceVertexIndex(surface, point));
  for (let index = 1; index < points.length - 1; index += 1) {
    surface.indices.push(...orientAuthoredSurfaceTriangleForBabylon(surface.positions, pointIndexes[0], pointIndexes[index], pointIndexes[index + 1]));
  }
}

export function authoredSurfaceVertexIndex(surface, point) {
  const y = authoredTerrainVisualY(point.h);
  const key = `${Math.round(point.x * 1000)}:${Math.round(y * 1000)}:${Math.round(point.z * 1000)}`;
  const existingIndex = surface.vertexIndexes.get(key);
  if (existingIndex !== undefined) return existingIndex;
  const index = surface.positions.length / 3;
  surface.vertexIndexes.set(key, index);
  surface.positions.push(point.x, y, point.z);
  return index;
}

export function authoredTerrainVisualY(heightMeters) {
  const visualY = (Number(heightMeters) || 0) * authoredTerrainVisualScale;
  if (visualY > 0) return Math.max(0.18, visualY);
  return visualY;
}

export function orientAuthoredSurfaceTriangleForBabylon(positions, a, b, c) {
  return triangleNormalY(positions, a, b, c) < 0 ? [a, b, c] : [a, c, b];
}

export function surfaceForAuthoredLandPolygon(points, surfaces, land) {
  if (points.length >= 3 && points.every((point) => point.h >= authoredSnowLineMeters)) {
    return surfaces.snow;
  }
  if (points.length >= 3 && authoredSurfaceMaterialAt(land, polygonCentroid2d(points)) === "sand") {
    return surfaces.sand;
  }
  return surfaces.land;
}

export function authoredSurfaceMaterialAt(land, point) {
  if (!point) return normalizedAuthoredMaterial(land.material);
  const zones = land.materialZones ?? [];
  for (let index = zones.length - 1; index >= 0; index -= 1) {
    const zone = zones[index];
    if (normalizedAuthoredMaterial(zone.material) === "sand" && pointInPolygon2d(point, zone.polygon ?? [])) {
      return "sand";
    }
  }
  return normalizedAuthoredMaterial(land.material);
}

export function normalizedAuthoredMaterial(value) {
  const material = String(value ?? "grass").trim().toLowerCase();
  return material === "sand" ? "sand" : "grass";
}

export function compactIndexedVertexData(positions, indices) {
  const remap = new Map();
  const compactedPositions = [];
  const compactedIndices = [];

  indices.forEach((oldIndex) => {
    let newIndex = remap.get(oldIndex);
    if (newIndex === undefined) {
      newIndex = compactedPositions.length / 3;
      remap.set(oldIndex, newIndex);
      compactedPositions.push(
        positions[oldIndex * 3],
        positions[oldIndex * 3 + 1],
        positions[oldIndex * 3 + 2]
      );
    }
    compactedIndices.push(newIndex);
  });

  return {
    positions: compactedPositions,
    indices: compactedIndices
  };
}

export function authoredSeaFloorMaterial(land, materials) {
  return normalizedAuthoredMaterial(land.material) === "sand" ? materials.sand : materials.underwaterLand;
}

export function authoredLandMaterial(land, materials) {
  return normalizedAuthoredMaterial(land.material) === "sand" ? materials.sand : materials.grass;
}

export function authoredTerrainMetersAtLocal(land, localX, localZ) {
  return authoredTerrainHeightAt(authoredLocalTerrainIsland(land), localX, localZ);
}

export function authoredWorldCoastline(land) {
  const cached = authoredWorldCoastlineCache.get(land);
  if (cached) return cached;
  const coastline = smoothAuthoredClosedPolygon(authoredWorldPolygon(land), authoredCoastlineSmoothingIterations);
  authoredWorldCoastlineCache.set(land, coastline);
  return coastline;
}

export function authoredWorldPolygon(land) {
  return (land.polygon ?? []).map((point) => ({
    x: Number(point.x),
    z: Number(point.z)
  }));
}

export function authoredLocalCoastline(land) {
  const cached = authoredLocalCoastlineCache.get(land);
  if (cached) return cached;
  const coastline = smoothAuthoredClosedPolygon(authoredLocalPolygon(land), authoredCoastlineSmoothingIterations);
  authoredLocalCoastlineCache.set(land, coastline);
  return coastline;
}
