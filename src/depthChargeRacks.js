import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';

export const depthChargeLanes = Object.freeze([-.225, .225]);
export const depthChargeExitHalfWidth = .065;
const sceneMaterials = new WeakMap();

function rackMaterials(scene) {
  if (sceneMaterials.has(scene)) return sceneMaterials.get(scene);
  const material = (name, color, specular) => {
    const result = new StandardMaterial(`depth_charge_${name}`, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor = new Color3(specular, specular, specular);
    return result;
  };
  const result = {
    frame: material('frame', '#65716d', .16),
    paint: material('paint', '#49594b', .12),
    steel: material('steel', '#89948f', .28),
    dark: material('recess', '#252e2d', .05)
  };
  sceneMaterials.set(scene, result);
  return result;
}

function mergeByMaterial(parts, parent, name) {
  const groups = new Map();
  for (const part of parts) {
    if (!groups.has(part.material)) groups.set(part.material, []);
    groups.get(part.material).push(part);
  }
  const meshes = [...groups.values()].map(group => Mesh.MergeMeshes(group, true, true));
  const mesh = meshes.length === 1 ? meshes[0] : Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
  mesh.name = name;
  mesh.parent = parent;
  mesh.isPickable = false;
  return mesh;
}

function box(scene, parts, material, size, position) {
  const mesh = MeshBuilder.CreateBox('depth_charge_part', {
    width: size[0], height: size[1], depth: size[2]
  }, scene);
  mesh.position.set(...position);
  mesh.material = material;
  parts.push(mesh);
  return mesh;
}

function cylinder(scene, parts, material, diameter, length, position, rotationZ = 0) {
  const mesh = MeshBuilder.CreateCylinder('depth_charge_part', {
    diameter, height: length, tessellation: 12
  }, scene);
  mesh.position.set(...position);
  mesh.rotation.z = rotationZ;
  mesh.material = material;
  parts.push(mesh);
  return mesh;
}

function createCharge(scene, parent, name, materials, position, yaw = 0) {
  const root = new TransformNode(name, scene);
  root.parent = parent;
  root.position.set(...position);
  root.rotation.y = yaw;
  const parts = [];
  const drum = (diameter, length, x, material) => cylinder(scene, parts, material, diameter, length, [x, 0, 0], Math.PI / 2);
  drum(.096, .102, 0, materials.paint);
  for (const side of [-1, 1]) {
    drum(.102, .007, side * .035, materials.steel);
    drum(.097, .006, side * .052, materials.paint);
    drum(.08, .002, side * .0555, materials.dark);
    drum(.071, .003, side * .057, materials.paint);
    drum(.019, .004, side * .0595, materials.steel);
  }
  const mesh = mergeByMaterial(parts, root, `${name}_body`);
  return { root, mesh, restPosition: root.position.clone() };
}

function createSternRack(scene, parent, name, x, deckY, materials) {
  const root = new TransformNode(name, scene);
  root.parent = parent;
  root.position.set(x, deckY(-4.2), -4.2);
  const parts = [];
  for (const side of [-1, 1]) {
    const rail = box(scene, parts, materials.frame, [.012, .014, .32], [side * .038, .014, .1]);
    rail.rotation.x = -.025;
    box(scene, parts, materials.frame, [.009, .027, .28], [side * .064, .022, .11]);
    for (const z of [.01, .23]) {
      box(scene, parts, materials.frame, [.03, .009, .036], [side * .04, .006 + z * .027, z]);
    }
  }
  // Small triangular feed cover behind the visible reserve, open toward the rail.
  box(scene, parts, materials.dark, [.137, .004, .1], [0, .007, .29]);
  const roof = box(scene, parts, materials.frame, [.151, .005, Math.hypot(.1, .112)], [0, .066, .29]);
  roof.rotation.x = Math.atan2(.112, .1);
  for (const side of [-1, 1]) {
    const panel = box(scene, parts, materials.frame, [.007, 1, .1], [side * .072, 0, .29]);
    const positions = panel.getVerticesData('position');
    for (let i = 0; i < positions.length; i += 3) positions[i + 1] = positions[i + 1] > 0 ? .065 - positions[i + 2] * 1.12 : .008;
    const normals = [];
    VertexData.ComputeNormals(positions, panel.getIndices(), normals);
    panel.setVerticesData('position', positions);
    panel.setVerticesData('normal', normals);
  }
  mergeByMaterial(parts, root, `${name}_frame`);
  const gate = new TransformNode(`${name}_release_gate`, scene);
  gate.parent = root;
  gate.position.set(0, .021, -.012);
  const gateParts = [];
  box(scene, gateParts, materials.steel, [.129, .012, .013], [0, .046, 0]);
  for (const side of [-1, 1]) box(scene, gateParts, materials.steel, [.009, .048, .013], [side * .06, .024, 0]);
  mergeByMaterial(gateParts, gate, `${name}_gate`);
  const charges = [
    createCharge(scene, root, `${name}_charge_0`, materials, [0, .064 + .047 * .027, .047]),
    createCharge(scene, root, `${name}_charge_1`, materials, [0, .064 + .18 * .027, .18])
  ];
  return { root, gate, charges };
}

function createSideThrower(scene, parent, name, side, deckY, materials) {
  const root = new TransformNode(name, scene);
  root.parent = parent;
  root.position.set(side * .48, deckY(-1.27), -1.27);
  const parts = [];
  box(scene, parts, materials.frame, [.23, .015, .19], [0, .009, 0]);
  cylinder(scene, parts, materials.frame, .1, .06, [0, .04, 0]);
  cylinder(scene, parts, materials.steel, .051, .13, [side * .025, .105, 0], -side * Math.PI / 4);
  cylinder(scene, parts, materials.dark, .037, .07, [side * .086, .166, 0], -side * Math.PI / 4);
  for (const z of [-.047, .047]) {
    const brace = box(scene, parts, materials.frame, [.015, .112, .014], [-side * .026, .074, z]);
    brace.rotation.z = side * .4;
  }
  // The spare sits inboard, with an unobstructed lift from its saddle to the launch cup.
  for (const z of [-.038, .038]) {
    box(scene, parts, materials.frame, [.116, .026, .014], [-side * .18, .019, z]);
    for (const end of [-1, 1]) box(scene, parts, materials.frame, [.012, .038, .014], [-side * .18 + end * .052, .029, z]);
  }
  mergeByMaterial(parts, root, `${name}_frame`);
  const cup = new TransformNode(`${name}_launch_cup`, scene);
  cup.parent = root;
  cup.position.set(side * .109, .192, 0);
  const cupParts = [];
  box(scene, cupParts, materials.steel, [.103, .012, .11], [0, 0, 0]);
  for (const end of [-1, 1]) box(scene, cupParts, materials.frame, [.012, .032, .114], [end * .05, .012, 0]);
  mergeByMaterial(cupParts, cup, `${name}_cup`);
  const loaded = createCharge(scene, cup, `${name}_charge_0`, materials, [0, .054, 0], Math.PI / 2);
  const spare = createCharge(scene, root, `${name}_charge_1`, materials, [-side * .18, .071, 0], Math.PI / 2);
  const loadingArm = new TransformNode(`${name}_loading_arm`, scene);
  loadingArm.parent = root;
  loadingArm.position.set(side * .052, .014, 0);
  const armLength = Math.hypot(.232, .057);
  const armRestAngle = side * Math.atan2(.232, .057);
  const armLoadAngle = -side * Math.atan2(.057, .232);
  loadingArm.rotation.z = armRestAngle;
  const armParts = [];
  box(scene, armParts, materials.frame, [.014, armLength, .018], [0, armLength / 2, .081]);
  cylinder(scene, armParts, materials.steel, .034, .027, [0, 0, .081], Math.PI / 2).rotation.x = Math.PI / 2;
  mergeByMaterial(armParts, loadingArm, `${name}_arm`);
  const loadingCradle = new TransformNode(`${name}_loading_cradle`, scene);
  loadingCradle.parent = loadingArm;
  loadingCradle.position.y = armLength;
  loadingCradle.rotation.z = -armRestAngle;
  const forkParts = [];
  box(scene, forkParts, materials.frame, [.09, .056, .015], [0, -.027, .08]);
  for (const x of [-.034, .034]) box(scene, forkParts, materials.steel, [.015, .009, .14], [x, -.055, .014]);
  mergeByMaterial(forkParts, loadingCradle, `${name}_loading_fork`);
  return { root, cup, loadingArm, loadingCradle, armRestAngle, armLoadAngle, charges: [loaded, spare] };
}

// Shared local/remote geometry; each charge remains independent for later replicated drops.
export function createDepthChargeRacks(scene, parent, name, deckY, layout = 'stern') {
  const materials = rackMaterials(scene);
  const root = new TransformNode(`${name}_depth_charges`, scene);
  root.parent = parent;
  const racks = depthChargeLanes.map((x, index) => layout === 'throwers'
    ? createSideThrower(scene, root, `${name}_depth_rack_${index}`, Math.sign(x), deckY, materials)
    : createSternRack(scene, root, `${name}_depth_rack_${index}`, x, deckY, materials));
  return { root, racks, layout };
}
