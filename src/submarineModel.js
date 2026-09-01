import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";

const sailPositionY = 0.66;
const sailPositionZ = 0.04;
const sailScale = 0.9;
const sailFloorY = 0.64;
const rearSailRimY = 0.7;
const submarineHullSections = [
  { z: -5.02, rx: 0.04, topHalf: 0.04, bottomHalf: 0.018 },
  { z: -4.55, rx: 0.26, topHalf: 0.19, bottomHalf: 0.12 },
  { z: -3.55, rx: 0.46, topHalf: 0.36, bottomHalf: 0.22 },
  { z: -2.0, rx: 0.56, topHalf: 0.46, bottomHalf: 0.26 },
  { z: -0.25, rx: 0.62, topHalf: 0.51, bottomHalf: 0.3 },
  { z: 0.75, rx: 0.58, topHalf: 0.48, bottomHalf: 0.27 },
  { z: 1.75, rx: 0.46, topHalf: 0.38, bottomHalf: 0.22 },
  { z: 2.85, rx: 0.32, topHalf: 0.27, bottomHalf: 0.15 },
  { z: 3.8, rx: 0.21, topHalf: 0.18, bottomHalf: 0.08 },
  { z: 4.55, rx: 0.11, topHalf: 0.09, bottomHalf: 0.032 },
  { z: 5.02, rx: 0.028, topHalf: 0.025, bottomHalf: 0.01 }
];
const submarineHullRadialSegments = 8;

export function createSubmarineModel(scene, materials, {
  name = "submarine",
  teamMaterials = {},
  scale = 1,
  debugInterior = false
} = {}) {
  const root = new TransformNode(name, scene);
  root.scaling.setAll(scale);
  const submarineMaterials = createSubmarineMaterials(scene, materials, teamMaterials, name);
  const meshes = [];

  const hull = createSubmarineHullMesh(`${name}_pressure_hull`, scene);
  hull.parent = root;
  hull.material = submarineMaterials.hull;
  meshes.push(hull);

  if (debugInterior) {
    const hullInterior = createSubmarineInteriorDebugMesh(`${name}_pressure_hull_interior_debug`, scene);
    hullInterior.parent = root;
    hullInterior.material = submarineMaterials.interiorDebug;
    meshes.push(hullInterior);
  }

  const deckCasing = createDeckCasingMesh(`${name}_deck_casing`, scene);
  deckCasing.parent = root;
  deckCasing.material = submarineMaterials.deck;
  meshes.push(deckCasing);

  const sail = createRoundedSailMesh(`${name}_sail`, scene);
  sail.parent = root;
  sail.position.y = sailPositionY;
  sail.position.z = sailPositionZ;
  sail.scaling.setAll(sailScale);
  sail.material = submarineMaterials.tower;
  meshes.push(sail);

  if (debugInterior) {
    const sailInterior = createSailInteriorDebugMesh(`${name}_sail_interior_debug`, scene);
    sailInterior.parent = root;
    sailInterior.position.y = sailPositionY;
    sailInterior.position.z = sailPositionZ;
    sailInterior.scaling.setAll(sailScale);
    sailInterior.material = submarineMaterials.interiorDebug;
    meshes.push(sailInterior);
  }

  meshes.push(...createDeckDetails(scene, root, submarineMaterials, name));
  meshes.push(...createSternGear(scene, root, submarineMaterials, name));
  meshes.push(...createBowPlanes(scene, root, submarineMaterials, name));

  return {
    root,
    meshes,
    flakMount: {
      z: sailPositionZ + -0.74 * sailScale,
      deckY: sailPositionY + rearSailRimY * sailScale + 0.012,
      scale: 0.54
    },
    periscopeHiddenMeshes: meshes
  };
}

function createSubmarineMaterials(scene, materials, teamMaterials, name) {
  const source = teamMaterials.hull ?? materials.hull;
  const hullColor = source?.diffuseColor?.clone?.() ?? new Color3(0.32, 0.38, 0.4);
  const specularColor = source?.specularColor?.clone?.() ?? new Color3(0.06, 0.085, 0.115);
  const makeBody = (suffix, factor, emissiveFactor = 0.09) => {
    const material = new StandardMaterial(`${name}_${suffix}_material`, scene);
    material.diffuseColor = hullColor.scale(factor);
    material.emissiveColor = hullColor.scale(emissiveFactor);
    material.specularColor = specularColor.scale(0.85);
    material.backFaceCulling = true;
    return material;
  };
  const hull = makeBody("hull", 0.82, 0.12);
  const deck = makeBody("deck", 0.72, 0.1);
  const tower = makeBody("tower", 0.86, 0.12);
  const darkDetail = new StandardMaterial(`${name}_dark_detail_material`, scene);
  darkDetail.diffuseColor = new Color3(0.035, 0.043, 0.048);
  darkDetail.specularColor = new Color3(0.03, 0.035, 0.04);
  darkDetail.zOffset = -4;
  const brass = new StandardMaterial(`${name}_brass_material`, scene);
  brass.diffuseColor = new Color3(0.54, 0.48, 0.34);
  brass.specularColor = new Color3(0.26, 0.22, 0.13);
  const glass = new StandardMaterial(`${name}_glass_material`, scene);
  glass.diffuseColor = new Color3(0.06, 0.12, 0.14);
  glass.emissiveColor = new Color3(0.01, 0.035, 0.04);
  glass.specularColor = new Color3(0.24, 0.38, 0.42);
  glass.zOffset = -4;
  const interiorDebug = new StandardMaterial(`${name}_interior_debug_material`, scene);
  interiorDebug.diffuseColor = new Color3(0, 0.95, 1);
  interiorDebug.emissiveColor = new Color3(0, 0.45, 0.55);
  interiorDebug.specularColor = Color3.Black();
  interiorDebug.backFaceCulling = false;
  return { hull, deck, tower, darkDetail, brass, glass, interiorDebug };
}

function createSubmarineHullMesh(name, scene) {
  const positions = [];
  const indices = [];

  const rings = createSubmarineHullRings(submarineHullSections, submarineHullRadialSegments);

  for (let section = 0; section < rings.length - 1; section += 1) {
    const current = rings[section];
    const nextSection = rings[section + 1];
    for (let i = 0; i < submarineHullRadialSegments; i += 1) {
      const next = (i + 1) % submarineHullRadialSegments;
      const p0 = current.points[i];
      const p1 = nextSection.points[i];
      const p2 = nextSection.points[next];
      const p3 = current.points[next];
      const centerY = (current.centerY + nextSection.centerY) * 0.5;
      const direction = {
        x: (p0.x + p1.x + p2.x + p3.x) * 0.25,
        y: (p0.y + p1.y + p2.y + p3.y) * 0.25 - centerY,
        z: 0
      };
      addQuadFacing(positions, indices, p0, p1, p2, p3, direction);
    }
  }

  const sternCenter = { x: 0, y: rings[0].centerY, z: rings[0].z };
  for (let i = 0; i < submarineHullRadialSegments; i += 1) {
    const next = (i + 1) % submarineHullRadialSegments;
    addTriangleFacing(positions, indices, sternCenter, rings[0].points[i], rings[0].points[next], { x: 0, y: 0, z: -1 });
  }

  const bow = rings[rings.length - 1];
  const bowCenter = { x: 0, y: bow.centerY, z: bow.z };
  for (let i = 0; i < submarineHullRadialSegments; i += 1) {
    const next = (i + 1) % submarineHullRadialSegments;
    addTriangleFacing(positions, indices, bowCenter, bow.points[i], bow.points[next], { x: 0, y: 0, z: 1 });
  }

  return createVertexMesh(name, scene, positions, indices);
}

function createSubmarineInteriorDebugMesh(name, scene) {
  const positions = [];
  const indices = [];
  const rings = createSubmarineHullRings(submarineHullSections, submarineHullRadialSegments, 0.84, 0.84);

  for (let section = 0; section < rings.length - 1; section += 1) {
    const current = rings[section];
    const nextSection = rings[section + 1];
    for (let i = 0; i < submarineHullRadialSegments; i += 1) {
      const next = (i + 1) % submarineHullRadialSegments;
      const p0 = current.points[i];
      const p1 = nextSection.points[i];
      const p2 = nextSection.points[next];
      const p3 = current.points[next];
      const centerY = (current.centerY + nextSection.centerY) * 0.5;
      const direction = {
        x: -((p0.x + p1.x + p2.x + p3.x) * 0.25),
        y: -(p0.y + p1.y + p2.y + p3.y) * 0.25 + centerY,
        z: 0
      };
      addQuadFacing(positions, indices, p0, p1, p2, p3, direction);
    }
  }

  return createVertexMesh(name, scene, positions, indices);
}

function createSubmarineHullRings(sections, radialSegments, widthScale = 1, heightScale = 1) {
  return sections.map((section) => {
    const topY = 0.62;
    const shoulderY = 0.4;
    const lowerY = -0.08;
    const bottomY = -0.27;
    const topHalf = section.topHalf * widthScale;
    const shoulderHalf = section.rx * widthScale;
    const lowerHalf = section.rx * 0.78 * widthScale;
    const bottomHalf = section.bottomHalf * widthScale;
    const centerY = (topY + bottomY) * 0.5;
    const scaleY = (value) => centerY + (value - centerY) * heightScale;
    const points = [
      { x: topHalf, y: scaleY(topY), z: section.z },
      { x: shoulderHalf, y: scaleY(shoulderY), z: section.z },
      { x: lowerHalf, y: scaleY(lowerY), z: section.z },
      { x: bottomHalf, y: scaleY(bottomY), z: section.z },
      { x: -bottomHalf, y: scaleY(bottomY), z: section.z },
      { x: -lowerHalf, y: scaleY(lowerY), z: section.z },
      { x: -shoulderHalf, y: scaleY(shoulderY), z: section.z },
      { x: -topHalf, y: scaleY(topY), z: section.z }
    ].slice(0, radialSegments);
    return {
      points,
      centerY,
      z: section.z
    };
  });
}

function lerp(start, end, ratio) {
  return start + (end - start) * ratio;
}

function createDeckCasingMesh(name, scene) {
  const sections = [
    { z: -4.9, hullHalf: 0.055, deckHalf: 0.02 },
    { z: -4.72, hullHalf: 0.12, deckHalf: 0.055 },
    { z: -4.55, hullHalf: 0.19, deckHalf: 0.135 },
    { z: -3.55, hullHalf: 0.36, deckHalf: 0.255 },
    { z: -2.0, hullHalf: 0.46, deckHalf: 0.33 },
    { z: -0.25, hullHalf: 0.51, deckHalf: 0.37 },
    { z: 0.75, hullHalf: 0.48, deckHalf: 0.345 },
    { z: 1.75, hullHalf: 0.38, deckHalf: 0.275 },
    { z: 2.85, hullHalf: 0.27, deckHalf: 0.195 },
    { z: 3.8, hullHalf: 0.18, deckHalf: 0.13 },
    { z: 4.55, hullHalf: 0.09, deckHalf: 0.065 },
    { z: 4.76, hullHalf: 0.055, deckHalf: 0.028 },
    { z: 4.92, hullHalf: 0.025, deckHalf: 0.012 }
  ];
  const positions = [];
  const indices = [];

  const sectionPoints = sections.map((section) => {
    const joinY = 0.625;
    const deckY = 0.675;
    return {
      leftJoin: { x: -section.hullHalf, y: joinY, z: section.z },
      rightJoin: { x: section.hullHalf, y: joinY, z: section.z },
      rightDeck: { x: section.deckHalf, y: deckY, z: section.z },
      leftDeck: { x: -section.deckHalf, y: deckY, z: section.z }
    };
  });

  for (let section = 0; section < sectionPoints.length - 1; section += 1) {
    const a = sectionPoints[section];
    const b = sectionPoints[section + 1];
    addQuadFacing(positions, indices, a.leftJoin, b.leftJoin, b.leftDeck, a.leftDeck, { x: -1, y: 0.35, z: 0 });
    addQuadFacing(positions, indices, a.leftDeck, b.leftDeck, b.rightDeck, a.rightDeck, { x: 0, y: 1, z: 0 });
    addQuadFacing(positions, indices, a.rightDeck, b.rightDeck, b.rightJoin, a.rightJoin, { x: 1, y: 0.35, z: 0 });
    addQuadFacing(positions, indices, a.leftJoin, a.rightJoin, b.rightJoin, b.leftJoin, { x: 0, y: -1, z: 0 });
  }

  const front = sectionPoints[sectionPoints.length - 1];
  const rear = sectionPoints[0];
  addQuadFacing(positions, indices, front.leftJoin, front.leftDeck, front.rightDeck, front.rightJoin, { x: 0, y: 0, z: 1 });
  addQuadFacing(positions, indices, rear.leftJoin, rear.rightJoin, rear.rightDeck, rear.leftDeck, { x: 0, y: 0, z: -1 });
  return createVertexMesh(name, scene, positions, indices);
}

function createDeckDetails(scene, root, materials, name) {
  const details = [];
  const mastBaseY = sailPositionY + sailFloorY * sailScale - 0.012;
  [0.02, 0.2].forEach((z, index) => {
    const height = (index === 0 ? 1.16 : 0.96) * sailScale;
    const mast = MeshBuilder.CreateCylinder(`${name}_periscope_${index}`, { diameter: 0.045, height, tessellation: 8 }, scene);
    mast.parent = root;
    mast.position.y = mastBaseY + height * 0.5;
    mast.position.z = sailPositionZ + (z - sailPositionZ) * sailScale;
    mast.material = materials.darkDetail;
    details.push(mast);
  });
  return details;
}

function createRoundedSailMesh(name, scene) {
  const sections = densifySections([
    { z: -1.0, width: 0.06 },
    { z: -0.98, width: 0.075 },
    { z: -0.955, width: 0.105 },
    { z: -0.92, width: 0.15 },
    { z: -0.875, width: 0.215 },
    { z: -0.82, width: 0.3 },
    { z: -0.75, width: 0.38 },
    { z: -0.66, width: 0.47 },
    { z: -0.56, width: 0.53 },
    { z: -0.45, width: 0.575 },
    { z: -0.32, width: 0.6 },
    { z: -0.14, width: 0.61 },
    { z: 0.05, width: 0.595 },
    { z: 0.18, width: 0.57 },
    { z: 0.29, width: 0.535 },
    { z: 0.39, width: 0.47 },
    { z: 0.48, width: 0.405 },
    { z: 0.56, width: 0.335 },
    { z: 0.63, width: 0.265 },
    { z: 0.69, width: 0.205 },
    { z: 0.74, width: 0.18 },
    { z: 0.785, width: 0.15 },
    { z: 0.82, width: 0.13 },
    { z: 0.845, width: 0.115 }
  ]);
  const baseY = -0.045;
  const floorY = 0.6;
  const wallThickness = 0.055;
  const frontRimY = 0.86;
  const rearRimY = rearSailRimY;
  const positions = [];
  const indices = [];

  const sectionPoints = sections.map((section, index) => {
    const rimY = getSailRimY(section.z, frontRimY, rearRimY);
    const outerHalf = section.width * 0.5;
    const footHalf = outerHalf + 0.028;
    const innerHalf = Math.max(0.018, outerHalf - wallThickness);
    const floorHalf = Math.max(0.012, innerHalf - wallThickness * 0.15);
    const frontThicknessStartZ = 0.73;
    const frontThicknessRatio = Math.max(0, Math.min(1, (section.z - frontThicknessStartZ) / (0.845 - frontThicknessStartZ)));
    const innerZ = section.z - wallThickness * 1.15 * frontThicknessRatio;
    return {
      outerBottomLeft: { x: -footHalf, y: baseY, z: section.z },
      outerBottomRight: { x: footHalf, y: baseY, z: section.z },
      outerRimLeft: { x: -outerHalf, y: rimY, z: section.z },
      outerRimRight: { x: outerHalf, y: rimY, z: section.z },
      innerRimLeft: { x: -innerHalf, y: rimY - 0.018, z: innerZ },
      innerRimRight: { x: innerHalf, y: rimY - 0.018, z: innerZ },
      floorLeft: { x: -floorHalf, y: floorY, z: innerZ },
      floorRight: { x: floorHalf, y: floorY, z: innerZ }
    };
  });

  for (let section = 0; section < sectionPoints.length - 1; section += 1) {
    const a = sectionPoints[section];
    const b = sectionPoints[section + 1];
    addQuadFacing(positions, indices, a.outerBottomLeft, b.outerBottomLeft, b.outerRimLeft, a.outerRimLeft, { x: -1, y: 0, z: 0 });
    addQuadFacing(positions, indices, a.outerRimLeft, b.outerRimLeft, b.innerRimLeft, a.innerRimLeft, { x: 0, y: 1, z: 0 });
    addQuadFacing(positions, indices, a.innerRimLeft, b.innerRimLeft, b.floorLeft, a.floorLeft, { x: 1, y: 0, z: 0 });
    addQuadFacing(positions, indices, a.floorLeft, b.floorLeft, b.floorRight, a.floorRight, { x: 0, y: 1, z: 0 });
    addQuadFacing(positions, indices, a.floorRight, b.floorRight, b.innerRimRight, a.innerRimRight, { x: -1, y: 0, z: 0 });
    addQuadFacing(positions, indices, a.innerRimRight, b.innerRimRight, b.outerRimRight, a.outerRimRight, { x: 0, y: 1, z: 0 });
    addQuadFacing(positions, indices, a.outerRimRight, b.outerRimRight, b.outerBottomRight, a.outerBottomRight, { x: 1, y: 0, z: 0 });
    addQuadFacing(positions, indices, a.outerBottomRight, b.outerBottomRight, b.outerBottomLeft, a.outerBottomLeft, { x: 0, y: -1, z: 0 });
  }

  addSailEndCap(positions, indices, sectionPoints[0], { x: 0, y: 0, z: -1 });
  addSailEndCap(positions, indices, sectionPoints[sectionPoints.length - 1], { x: 0, y: 0, z: 1 });
  addSailFrontEndThickness(positions, indices, sectionPoints);
  addSailFrontCoaming(positions, indices, sectionPoints);
  return createVertexMesh(name, scene, positions, indices);
}

function createSailInteriorDebugMesh(name, scene) {
  const sections = densifySections([
    { z: -0.86, width: 0.22 },
    { z: -0.76, width: 0.32 },
    { z: -0.64, width: 0.41 },
    { z: -0.5, width: 0.47 },
    { z: -0.32, width: 0.5 },
    { z: -0.12, width: 0.505 },
    { z: 0.08, width: 0.49 },
    { z: 0.26, width: 0.445 },
    { z: 0.42, width: 0.36 },
    { z: 0.55, width: 0.27 },
    { z: 0.64, width: 0.18 }
  ]);
  const baseY = 0.03;
  const topY = 0.55;
  const positions = [];
  const indices = [];
  const rings = sections.map((section) => {
    const half = section.width * 0.5;
    return {
      z: section.z,
      centerY: (baseY + topY) * 0.5,
      points: [
        { x: -half, y: baseY, z: section.z },
        { x: half, y: baseY, z: section.z },
        { x: half, y: topY, z: section.z },
        { x: -half, y: topY, z: section.z }
      ]
    };
  });

  for (let section = 0; section < rings.length - 1; section += 1) {
    const a = rings[section].points;
    const b = rings[section + 1].points;
    addQuadFacing(positions, indices, a[0], b[0], b[3], a[3], { x: -1, y: 0, z: 0 });
    addQuadFacing(positions, indices, a[1], a[2], b[2], b[1], { x: 1, y: 0, z: 0 });
    addQuadFacing(positions, indices, a[2], a[3], b[3], b[2], { x: 0, y: 1, z: 0 });
    addQuadFacing(positions, indices, a[0], a[1], b[1], b[0], { x: 0, y: -1, z: 0 });
  }

  addQuadFacing(positions, indices, rings[0].points[0], rings[0].points[3], rings[0].points[2], rings[0].points[1], { x: 0, y: 0, z: -1 });
  const last = rings[rings.length - 1].points;
  addQuadFacing(positions, indices, last[0], last[1], last[2], last[3], { x: 0, y: 0, z: 1 });
  return createVertexMesh(name, scene, positions, indices, null, false);
}

function getSailRimY(z, frontRimY, rearRimY) {
  if (z <= -0.36) return rearRimY;
  if (z >= -0.12) return frontRimY;
  const ratio = (z + 0.36) / 0.24;
  const easedRatio = ratio * ratio * (3 - 2 * ratio);
  return lerp(rearRimY, frontRimY, easedRatio);
}

function densifySections(sections) {
  const dense = [];
  for (let i = 0; i < sections.length - 1; i += 1) {
    const current = sections[i];
    const next = sections[i + 1];
    dense.push(current);
    dense.push({
      z: lerp(current.z, next.z, 0.5),
      width: lerp(current.width, next.width, 0.5)
    });
  }
  dense.push(sections[sections.length - 1]);
  return dense;
}

function addQuadFacing(positions, indices, p0, p1, p2, p3, direction) {
  const start = positions.length / 3;
  let points = [p0, p1, p2, p3];
  const normal = quadNormal(p0, p1, p2);
  const facing = normal.x * direction.x + normal.y * direction.y + normal.z * direction.z;
  if (facing < 0) {
    points = [p0, p3, p2, p1];
  }
  points.forEach((point) => {
    positions.push(point.x, point.y, point.z);
  });
  indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
}

function addTriangleFacing(positions, indices, p0, p1, p2, direction) {
  const start = positions.length / 3;
  let points = [p0, p1, p2];
  const normal = quadNormal(p0, p1, p2);
  const facing = normal.x * direction.x + normal.y * direction.y + normal.z * direction.z;
  if (facing < 0) {
    points = [p0, p2, p1];
  }
  points.forEach((point) => {
    positions.push(point.x, point.y, point.z);
  });
  indices.push(start, start + 1, start + 2);
}

function quadNormal(p0, p1, p2) {
  const ux = p1.x - p0.x;
  const uy = p1.y - p0.y;
  const uz = p1.z - p0.z;
  const vx = p2.x - p0.x;
  const vy = p2.y - p0.y;
  const vz = p2.z - p0.z;
  return {
    x: uy * vz - uz * vy,
    y: uz * vx - ux * vz,
    z: ux * vy - uy * vx
  };
}

function addSailEndCap(positions, indices, section, direction) {
  const innerDirection = { x: -direction.x, y: -direction.y, z: -direction.z };
  addQuadFacing(positions, indices, section.outerBottomLeft, section.outerBottomRight, section.outerRimRight, section.outerRimLeft, direction);
  addQuadFacing(positions, indices, section.outerRimLeft, section.outerRimRight, section.innerRimRight, section.innerRimLeft, { x: 0, y: 1, z: 0 });
  addQuadFacing(positions, indices, section.floorLeft, section.innerRimLeft, section.innerRimRight, section.floorRight, innerDirection);
  addQuadFacing(positions, indices, section.outerBottomLeft, section.floorLeft, section.floorRight, section.outerBottomRight, { x: 0, y: -1, z: 0 });
}

function addSailFrontEndThickness(positions, indices, sectionPoints) {
  const front = sectionPoints[sectionPoints.length - 1];
  const back = sectionPoints[sectionPoints.length - 7] ?? sectionPoints[sectionPoints.length - 2];
  const frontInnerHalf = Math.max(Math.abs(front.innerRimLeft.x), 0.052);
  const frontOuterHalf = Math.max(Math.abs(front.outerRimLeft.x), frontInnerHalf + 0.055);
  const backInnerHalf = Math.max(Math.abs(back.innerRimLeft.x), frontInnerHalf + 0.03);
  const backOuterHalf = Math.max(Math.abs(back.outerRimLeft.x), backInnerHalf + 0.055);
  const wallDepth = 0.09;
  const innerZ = front.z - wallDepth;
  const rimY = front.innerRimLeft.y + 0.002;
  const floorY = front.floorLeft.y + 0.006;
  const baseY = front.outerBottomLeft.y + 0.018;

  const frontInnerLeft = { x: -frontInnerHalf, y: floorY, z: innerZ };
  const frontInnerRight = { x: frontInnerHalf, y: floorY, z: innerZ };
  const backInnerLeft = { x: -backInnerHalf, y: floorY, z: back.z };
  const backInnerRight = { x: backInnerHalf, y: floorY, z: back.z };
  const frontRimLeft = { x: -frontOuterHalf, y: rimY, z: front.z };
  const frontRimRight = { x: frontOuterHalf, y: rimY, z: front.z };
  const frontInnerRimLeft = { x: -frontInnerHalf, y: rimY, z: innerZ };
  const frontInnerRimRight = { x: frontInnerHalf, y: rimY, z: innerZ };
  const backRimLeft = { x: -backOuterHalf, y: rimY, z: back.z };
  const backRimRight = { x: backOuterHalf, y: rimY, z: back.z };
  const frontBaseLeft = { x: -frontOuterHalf, y: baseY, z: front.z };
  const frontBaseRight = { x: frontOuterHalf, y: baseY, z: front.z };
  const backBaseLeft = { x: -backOuterHalf, y: baseY, z: back.z };
  const backBaseRight = { x: backOuterHalf, y: baseY, z: back.z };

  addQuadFacing(positions, indices, frontInnerLeft, backInnerLeft, backRimLeft, frontInnerRimLeft, { x: -0.45, y: 0.1, z: -0.6 });
  addQuadFacing(positions, indices, frontInnerRight, frontInnerRimRight, backRimRight, backInnerRight, { x: 0.45, y: 0.1, z: -0.6 });
  addQuadFacing(positions, indices, frontRimLeft, frontInnerRimLeft, frontInnerRimRight, frontRimRight, { x: 0, y: 1, z: 0 });
  addQuadFacing(positions, indices, frontInnerRimLeft, backRimLeft, backRimRight, frontInnerRimRight, { x: 0, y: 1, z: 0 });
  addQuadFacing(positions, indices, frontBaseLeft, frontRimLeft, backRimLeft, backBaseLeft, { x: -0.45, y: 0, z: -0.6 });
  addQuadFacing(positions, indices, frontBaseRight, backBaseRight, backRimRight, frontRimRight, { x: 0.45, y: 0, z: -0.6 });
  addQuadFacing(positions, indices, frontBaseLeft, frontBaseRight, frontRimRight, frontRimLeft, { x: 0, y: 0, z: 1 });
}

function addSailFrontCoaming(positions, indices, sectionPoints) {
  const front = sectionPoints[sectionPoints.length - 1];
  const previous = sectionPoints[sectionPoints.length - 8] ?? sectionPoints[sectionPoints.length - 2];
  const bottomY = front.floorLeft.y + 0.012;
  const topY = front.innerRimLeft.y - 0.006;
  const backZ = previous.z;
  const frontZ = front.z;
  const frontHalf = Math.max(Math.abs(front.outerRimLeft.x), Math.abs(front.innerRimLeft.x) + 0.055);
  const backHalf = Math.max(Math.abs(previous.innerRimLeft.x) + 0.022, frontHalf + 0.026);
  const leftBack = { x: -backHalf, y: bottomY, z: backZ };
  const rightBack = { x: backHalf, y: bottomY, z: backZ };
  const leftFront = { x: -frontHalf, y: bottomY, z: frontZ };
  const rightFront = { x: frontHalf, y: bottomY, z: frontZ };
  const leftBackTop = { ...leftBack, y: topY };
  const rightBackTop = { ...rightBack, y: topY };
  const leftFrontTop = { ...leftFront, y: topY };
  const rightFrontTop = { ...rightFront, y: topY };

  addQuadFacing(positions, indices, leftBack, leftFront, leftFrontTop, leftBackTop, { x: -0.4, y: 0, z: 1 });
  addQuadFacing(positions, indices, rightBack, rightBackTop, rightFrontTop, rightFront, { x: 0.4, y: 0, z: 1 });
  addQuadFacing(positions, indices, leftBackTop, leftFrontTop, rightFrontTop, rightBackTop, { x: 0, y: 1, z: 0 });
  addQuadFacing(positions, indices, leftFront, rightFront, rightFrontTop, leftFrontTop, { x: 0, y: 0, z: 1 });
  addQuadFacing(positions, indices, leftBack, leftBackTop, rightBackTop, rightBack, { x: 0, y: 0, z: -1 });
}

function createTaperedSailMesh(name, scene, sections, height) {
  const positions = [];
  const indices = [];

  sections.forEach((section) => {
    const bottom = section.bottomWidth * 0.5;
    const top = section.topWidth * 0.5;
    const topY = section.height ?? height;
    positions.push(
      -bottom, 0, section.z,
      bottom, 0, section.z,
      -top, topY, section.z,
      top, topY, section.z
    );
  });

  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = i * 4;
    const b = a + 4;
    indices.push(a, b, b + 2, a, b + 2, a + 2);
    indices.push(a + 1, a + 3, b + 3, a + 1, b + 3, b + 1);
  }

  indices.push(0, 2, 3, 0, 3, 1);
  const last = (sections.length - 1) * 4;
  indices.push(last, last + 1, last + 3, last, last + 3, last + 2);
  return createVertexMesh(name, scene, positions, indices);
}

function createSternGear(scene, root, materials, name) {
  const parts = [];
  const verticalFin = MeshBuilder.CreateBox(`${name}_stern_vertical_fin`, { width: 0.05, height: 0.72, depth: 0.52 }, scene);
  verticalFin.parent = root;
  verticalFin.position.set(0, 0.12, -4.66);
  verticalFin.material = materials.hull;
  parts.push(verticalFin);
  const horizontalFin = MeshBuilder.CreateBox(`${name}_stern_horizontal_fin`, { width: 1.05, height: 0.05, depth: 0.44 }, scene);
  horizontalFin.parent = root;
  horizontalFin.position.set(0, 0.04, -4.7);
  horizontalFin.material = materials.hull;
  parts.push(horizontalFin);
  return parts;
}

function createBowPlanes(scene, root, materials, name) {
  const parts = [];
  [-1, 1].forEach((side) => {
    const plane = MeshBuilder.CreateBox(`${name}_bow_plane_${side}`, { width: 0.36, height: 0.03, depth: 0.15 }, scene);
    plane.parent = root;
    plane.position.set(side * 0.25, -0.03, 3.18);
    plane.rotation.z = side * 0.06;
    plane.material = materials.hull;
    parts.push(plane);

    const fairing = MeshBuilder.CreateBox(`${name}_bow_plane_fairing_${side}`, { width: 0.16, height: 0.05, depth: 0.18 }, scene);
    fairing.parent = root;
    fairing.position.set(side * 0.14, -0.03, 3.18);
    fairing.rotation.z = side * 0.04;
    fairing.material = materials.hull;
    parts.push(fairing);
  });
  return parts;
}

function createVertexMesh(name, scene, positions, indices, normals = null, flipWinding = true) {
  const meshIndices = flipWinding ? [] : indices;
  if (flipWinding) {
    for (let i = 0; i < indices.length; i += 3) {
      meshIndices.push(indices[i], indices[i + 2], indices[i + 1]);
    }
  }
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = meshIndices;
  if (normals) {
    vertexData.normals = normals;
  } else {
    const computedNormals = [];
    VertexData.ComputeNormals(positions, meshIndices, computedNormals);
    vertexData.normals = computedNormals;
  }
  const customMesh = new Mesh(name, scene);
  vertexData.applyToMesh(customMesh);
  return customMesh;
}
