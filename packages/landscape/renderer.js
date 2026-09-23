import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import {
  createAuthoredTerrainMeshData,
  authoredLocalTerrainIsland,
  splitAuthoredTerrainSurfaces,
  compactIndexedVertexData,
  authoredSeaFloorMaterial,
  authoredLandMaterial,
  authoredLodTerrainSampleSpacing,
  authoredLodMaxInteriorTerrainSamples,
  authoredLodDistance
} from "./geometry.js";

export function createAuthoredIslandSurface(land, scene, materials, parent) {
  const terrain = createAuthoredTerrainMeshData(land);
  const renderLand = authoredLocalTerrainIsland(land);
  const surfaces = splitAuthoredTerrainSurfaces(terrain, renderLand);
  const lodTerrain = createAuthoredTerrainMeshData(land, {
    sampleSpacing: authoredLodTerrainSampleSpacing,
    maxInteriorTerrainSamples: authoredLodMaxInteriorTerrainSamples,
    heightProfileRings: 3,
    heightProfileRingSteps: 6,
    heightFalloffSteps: 6,
    maxSeaLevelSteps: 28
  });
  const lodSurfaces = splitAuthoredTerrainSurfaces(lodTerrain, renderLand);

  return [
    createAuthoredTerrainMeshWithLod(`${land.name}_authored_seafloor`, surfaces.seaFloor, lodSurfaces.seaFloor, authoredSeaFloorMaterial(land, materials), scene, parent),
    createAuthoredTerrainMeshWithLod(`${land.name}_authored_terrain`, surfaces.land, lodSurfaces.land, authoredLandMaterial(land, materials), scene, parent),
    createAuthoredTerrainMeshWithLod(`${land.name}_authored_sand`, surfaces.sand, lodSurfaces.sand, materials.sand, scene, parent),
    createAuthoredTerrainMeshWithLod(`${land.name}_authored_snow`, surfaces.snow, lodSurfaces.snow, materials.snow, scene, parent)
  ].filter(Boolean);
}

export function createAuthoredTerrainMeshWithLod(name, surface, lodSurface, material, scene, parent) {
  const mesh = createAuthoredTerrainMesh(name, surface.positions, surface.indices, material, scene, parent);
  if (!mesh) return null;

  const lodMesh = createAuthoredTerrainMesh(`${name}_lod`, lodSurface.positions, lodSurface.indices, material, scene, parent);
  if (lodMesh) {
    mesh.addLODLevel(authoredLodDistance, lodMesh);
    // LOD meshes are siblings, so disposing the surface does not dispose them automatically.
    mesh.onDisposeObservable.addOnce(() => lodMesh.dispose());
  }
  return mesh;
}

export function createAuthoredTerrainMesh(name, positions, indices, material, scene, parent) {
  if (!indices.length) return null;
  const compacted = compactIndexedVertexData(positions, indices);
  const normals = [];
  VertexData.ComputeNormals(compacted.positions, compacted.indices, normals);
  const vertexData = new VertexData();
  vertexData.positions = compacted.positions;
  vertexData.indices = compacted.indices;
  vertexData.normals = normals;
  const mesh = new Mesh(name, scene);
  vertexData.applyToMesh(mesh);
  mesh.parent = parent;
  mesh.material = material;
  mesh.receiveShadows = true;
  return prepareStaticLandscapeMesh(mesh);
}

export function prepareStaticLandscapeMesh(mesh) {
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = false;
  mesh.freezeWorldMatrix();
  return mesh;
}
