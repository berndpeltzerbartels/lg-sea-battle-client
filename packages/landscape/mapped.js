import {
  authoredPlateauGroupsForIsland, orderedAuthoredPlateauPoints,
  authoredTerrainBaseMeters, triangulateAuthoredSimplePolygon,
  authoredTriangleOrientation as cross, createAuthoredSingleHeightPointSurfaces,
  barycentricAuthoredWeightsForPoint
} from "./geometry.js";
import { signedArea as area, clip, subtract } from "./polygonClip.js";

const prepared = new WeakMap();

export function hasCompletePlateauMapping(island) {
  const groups = authoredPlateauGroupsForIsland(island);
  return groups.length > 0 && groups.every(group => group.every(p => p.plateauBoundaryPointId));
}

function trianglesForRing(ring) {
  const indices = triangulateAuthoredSimplePolygon(ring);
  if (!indices.length) throw new Error("Ungueltige zugeordnete Hangflaeche.");
  return indices.map(t => t.map(i => ring[i]));
}

export function mappedTerrainSurfaces(island) {
  const cached = prepared.get(island);
  if (cached) return cached;
  const floor = authoredTerrainBaseMeters(island);
  const boundary = island.polygon.map(p => ({ ...p, h: floor }));
  const ids = new Map(boundary.map((p, i) => [p.boundaryPointId, i]));
  const surfaces = authoredPlateauGroupsForIsland(island).map(group => {
    const height = group.reduce((sum, p) => sum + Number(p.h), 0) / group.length;
    const ring = orderedAuthoredPlateauPoints(group).map(p => ({ ...p, h: height }));
    const targets = ring.map(p => ids.get(p.plateauBoundaryPointId));
    if (targets.some(i => i === undefined) || new Set(targets).size !== targets.length) {
      throw new Error("Plateau-Zuordnung enthaelt fehlende oder doppelte Randpunkte.");
    }
    const direction = area(ring) * area(boundary) > 0 ? 1 : -1;
    let steps = 0;
    const triangles = trianglesForRing(ring);
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      const sector = [ring[i], boundary[targets[i]]];
      let cursor = targets[i];
      while (cursor !== targets[j]) {
        cursor = (cursor + direction + boundary.length) % boundary.length;
        sector.push(boundary[cursor]);
        steps++;
        if (steps > boundary.length) throw new Error("Plateau-Zuordnungen kreuzen sich.");
      }
      sector.push(ring[j]);
      triangles.push(...trianglesForRing(sector));
    }
    if (steps !== boundary.length) throw new Error("Unvollstaendiger Plateaurand.");
    const covered = triangles.reduce((sum, t) => sum + Math.abs(cross(...t)) / 2, 0);
    if (Math.abs(covered - Math.abs(area(boundary))) > Math.abs(area(boundary)) * 1e-7) {
      throw new Error("Zugeordnete Hangflaechen ueberlappen oder verlassen den Rand.");
    }
    return triangles;
  });
  for (const surface of createAuthoredSingleHeightPointSurfaces(island)) {
    surfaces.push(surface.triangles.map(t => t.map(i => surface.vertices[i])));
  }
  prepared.set(island, surfaces);
  return surfaces;
}

function planeHeight(t, p) {
  const [a, b, c] = t, determinant = cross(a, b, c);
  return (cross(p, b, c) * a.h + cross(a, p, c) * b.h + cross(a, b, p) * c.h) / determinant;
}

export function mappedTerrainHeight(island, point) {
  let height = authoredTerrainBaseMeters(island);
  for (const triangles of mappedTerrainSurfaces(island)) for (const t of triangles) {
    if (barycentricAuthoredWeightsForPoint(point, ...t)) height = Math.max(height, planeHeight(t, point));
  }
  return height;
}

// Exact upper envelope: remove only the portion covered by a higher triangle.
// All intersections are resolved once during mesh creation, never per frame.
export function mappedTerrainMesh(island) {
  const surfaces = mappedTerrainSurfaces(island);
  const vertices = [], indices = [], ids = new Map();
  for (let source = 0; source < surfaces.length; source++) for (const triangle of surfaces[source]) {
    let pieces = [triangle];
    for (let other = 0; other < surfaces.length && pieces.length; other++) {
      if (other === source) continue;
      for (const rival of surfaces[other]) {
        const differences = rival.map(p => p.h - planeHeight(triangle, p));
        const coplanar = differences.every(d => Math.abs(d) < 1e-8);
        if (coplanar && other > source) continue;
        if (!coplanar && Math.max(...differences) <= 1e-8) continue;
        const cutter = coplanar ? rival : clip(rival, p => p.h - planeHeight(triangle, p));
        if (cutter.length < 3 || Math.abs(area(cutter)) < 1e-8) continue;
        pieces = pieces.flatMap(p => subtract(p, cutter));
        if (pieces.length > 20000) throw new Error("Plateau-Geometrie ueberschreitet das Aufbaubudget.");
      }
    }
    for (const piece of pieces) {
      const polygon = piece.map(p => {
        const key = [p.x, p.z, p.h].map(n => Math.round(n * 1e7)).join(":");
        if (!ids.has(key)) { ids.set(key, vertices.length); vertices.push(p); }
        return ids.get(key);
      });
      for (let i = 1; i + 1 < polygon.length; i++) {
        const t = [polygon[0], polygon[i], polygon[i + 1]];
        const orientation = cross(...t.map(index => vertices[index]));
        if (Math.abs(orientation) > 1e-8) indices.push(...(orientation > 0 ? t : [t[0], t[2], t[1]]));
        if (indices.length > 60000) throw new Error("Plateau-Geometrie ueberschreitet 20000 Dreiecke pro Landmasse.");
      }
    }
  }
  return { vertices, indices };
}
