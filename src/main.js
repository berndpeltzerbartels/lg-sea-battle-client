import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import "@babylonjs/core/Meshes/Builders/boxBuilder";
import "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import "@babylonjs/core/Meshes/Builders/groundBuilder";
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/depthBoxBlur.fragment";
import "@babylonjs/core/Shaders/postprocess.vertex";
import "@babylonjs/core/Materials/Textures/dynamicTexture";
import "./styles.css";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: false,
  antialias: true
});

const scene = new Scene(engine);
document.body.dataset.appStarted = "true";
scene.clearColor = new Color4(0.64, 0.82, 0.95, 1);
scene.fogMode = Scene.FOGMODE_EXP2;
scene.fogColor = new Color3(0.68, 0.84, 0.94);
scene.fogDensity = 0.007;

const speedValue = document.getElementById("speedValue");
const depthValue = document.getElementById("depthValue");

const materials = createMaterials(scene);
const world = new TransformNode("world", scene);

const sun = new DirectionalLight("sun", new Vector3(-0.45, -0.9, 0.32), scene);
sun.position = new Vector3(35, 80, -45);
sun.intensity = 1.45;

const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
ambient.intensity = 0.58;
ambient.groundColor = new Color3(0.1, 0.18, 0.19);

const worldLimit = 5000;
const ocean = MeshBuilder.CreateGround("ocean", { width: 1050, height: 1050, subdivisions: 120 }, scene);
ocean.material = materials.water;
ocean.parent = world;

const blockedWaters = [];
createCoastline("western_coast", new Vector3(-126, 0, 58), 72, 66, scene, materials, world, blockedWaters);
createIsland("north_island", new Vector3(-32, 0, 54), 21, 1.1, scene, materials, world);
createIsland("east_island", new Vector3(58, 0, 10), 28, 0.9, scene, materials, world);
createIsland("south_island", new Vector3(18, 0, -76), 24, 1.25, scene, materials, world);
createIsland("far_island", new Vector3(-92, 0, -26), 16, 0.75, scene, materials, world);
blockedWaters.push(
  { x: -32, z: 54, rx: 28, rz: 22 },
  { x: 58, z: 10, rx: 36, rz: 27 },
  { x: 18, z: -76, rx: 32, rz: 25 },
  { x: -92, z: -26, rx: 22, rz: 17 }
);

const boat = createPlayerBow(scene, materials);
boat.root.position = new Vector3(0, 0.28, 0);
document.body.dataset.meshCount = String(scene.meshes.length);

const camera = new FreeCamera("follow_camera", new Vector3(0, 7, -13), scene);
camera.minZ = 0.2;
camera.maxZ = 800;
camera.fov = 0.78;
scene.activeCamera = camera;

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

window.addEventListener("keydown", (event) => {
  if (event.code === "ArrowUp") keys.forward = true;
  if (event.code === "ArrowDown") keys.backward = true;
  if (event.code === "ArrowLeft") keys.left = true;
  if (event.code === "ArrowRight") keys.right = true;
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowUp") keys.forward = false;
  if (event.code === "ArrowDown") keys.backward = false;
  if (event.code === "ArrowLeft") keys.left = false;
  if (event.code === "ArrowRight") keys.right = false;
});

let heading = 0;
let speed = 0;
let turnVelocity = 0;
let cameraPosition = camera.position.clone();
let cameraTarget = boat.root.position.clone();
let time = 0;

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  time += dt;

  const throttle = Number(keys.forward) - Number(keys.backward);
  const steer = Number(keys.right) - Number(keys.left);

  const waterSafety = getWaterSafety(boat.root.position, blockedWaters);
  const maxForwardSpeed = waterSafety.isShallow ? 4.4 : 14.4;
  const maxReverseSpeed = -4.8;
  const acceleration = throttle >= 0 ? 7.2 : 4.2;
  const drag = throttle === 0 ? 2.4 : 1.0;
  const targetSpeed = throttle > 0 ? maxForwardSpeed : throttle < 0 ? maxReverseSpeed : 0;
  speed += (targetSpeed - speed) * Math.min(1, dt * (throttle === 0 ? drag : acceleration));

  const turnStrength = speed >= 0 ? 0.36 : -0.24;
  const rudderGrip = clamp(0.18 + Math.abs(speed) / 3.4, 0.18, 1);
  const targetTurnVelocity = steer * turnStrength * rudderGrip;
  turnVelocity += (targetTurnVelocity - turnVelocity) * Math.min(1, dt * 2.4);
  heading += turnVelocity * dt;

  const forward = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  const previousPosition = boat.root.position.clone();
  boat.root.position.addInPlace(forward.scale(speed * dt));
  boat.root.position.x = clamp(boat.root.position.x, -worldLimit, worldLimit);
  boat.root.position.z = clamp(boat.root.position.z, -worldLimit, worldLimit);

  const nextWaterSafety = getWaterSafety(boat.root.position, blockedWaters);
  if (nextWaterSafety.isBlocked) {
    boat.root.position.copyFrom(previousPosition);
    speed = Math.min(speed, 0) - 0.15;
  } else if (nextWaterSafety.isShallow) {
    speed *= 0.985;
  }

  const bob = Math.sin(time * 2.1) * 0.08 + Math.sin(time * 3.8 + 1.6) * 0.035;
  boat.root.position.y = 0.32 + bob;
  boat.root.rotationQuaternion = Quaternion.FromEulerAngles(
    Math.sin(time * 2.6) * 0.025,
    heading,
    -turnVelocity * 0.5 + Math.sin(time * 1.9) * 0.018
  );

  materials.water.diffuseTexture.uOffset += dt * 0.01;
  materials.water.diffuseTexture.vOffset += dt * 0.018;

  const cameraDistance = 0.65;
  const cameraHeight = 1.48;
  const desiredCameraPosition = boat.root.position
    .subtract(forward.scale(cameraDistance))
    .add(new Vector3(0, cameraHeight, 0));
  const desiredTarget = boat.root.position.add(forward.scale(24.0)).add(new Vector3(0, 0.95, 0));

  cameraPosition = Vector3.Lerp(cameraPosition, desiredCameraPosition, 1 - Math.pow(0.035, dt));
  cameraTarget = Vector3.Lerp(cameraTarget, desiredTarget, 1 - Math.pow(0.02, dt));
  camera.position.copyFrom(cameraPosition);
  camera.setTarget(cameraTarget);
  camera.rotation.x = -Math.abs(camera.rotation.x);
  document.body.dataset.camera = `${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}`;
  document.body.dataset.cameraRotation = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)},${camera.rotation.z.toFixed(2)}`;
  document.body.dataset.activeCamera = scene.activeCamera?.name ?? "none";
  document.body.dataset.boat = `${boat.root.position.x.toFixed(1)},${boat.root.position.y.toFixed(1)},${boat.root.position.z.toFixed(1)}`;

  speedValue.textContent = Math.abs(speed).toFixed(1);
  depthValue.textContent = nextWaterSafety.isBlocked
    ? "Ground"
    : nextWaterSafety.isShallow
      ? "Shallow"
      : "Deep";
});

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});

function createMaterials(scene) {
  const water = new StandardMaterial("water_material", scene);
  water.diffuseColor = new Color3(0.03, 0.33, 0.48);
  water.specularColor = new Color3(0.7, 0.92, 1);
  water.emissiveColor = new Color3(0.0, 0.04, 0.055);
  water.alpha = 1;
  water.diffuseTexture = createWaterTexture(scene);
  water.diffuseTexture.uScale = 34;
  water.diffuseTexture.vScale = 34;

  const sand = new StandardMaterial("sand_material", scene);
  sand.diffuseColor = new Color3(0.73, 0.66, 0.43);
  sand.specularColor = new Color3(0.05, 0.04, 0.025);

  const grass = new StandardMaterial("grass_material", scene);
  grass.diffuseColor = new Color3(0.18, 0.45, 0.25);
  grass.specularColor = new Color3(0.03, 0.05, 0.03);

  const terrain = new StandardMaterial("terrain_material", scene);
  terrain.diffuseColor = new Color3(0.25, 0.38, 0.29);
  terrain.specularColor = new Color3(0.04, 0.05, 0.04);

  const shallow = new StandardMaterial("shallow_water_material", scene);
  shallow.diffuseColor = new Color3(0.08, 0.55, 0.56);
  shallow.emissiveColor = new Color3(0.02, 0.07, 0.07);
  shallow.specularColor = new Color3(0.18, 0.46, 0.46);
  shallow.alpha = 1;

  const rock = new StandardMaterial("rock_material", scene);
  rock.diffuseColor = new Color3(0.32, 0.34, 0.31);
  rock.specularColor = new Color3(0.03, 0.03, 0.03);

  const hull = new StandardMaterial("hull_material", scene);
  hull.diffuseColor = new Color3(0.18, 0.21, 0.21);
  hull.specularColor = new Color3(0.07, 0.08, 0.08);

  const deck = new StandardMaterial("deck_material", scene);
  deck.diffuseColor = new Color3(0.15, 0.17, 0.17);
  deck.specularColor = new Color3(0.06, 0.07, 0.07);

  const cabin = new StandardMaterial("cabin_material", scene);
  cabin.diffuseColor = new Color3(0.22, 0.25, 0.25);
  cabin.specularColor = new Color3(0.1, 0.12, 0.12);

  const funnel = new StandardMaterial("funnel_material", scene);
  funnel.diffuseColor = new Color3(0.16, 0.18, 0.18);
  funnel.specularColor = new Color3(0.05, 0.05, 0.05);

  const glass = new StandardMaterial("glass_material", scene);
  glass.diffuseColor = new Color3(0.18, 0.42, 0.54);
  glass.emissiveColor = new Color3(0.02, 0.08, 0.1);
  glass.specularColor = new Color3(0.7, 0.9, 1);

  return { water, sand, grass, terrain, shallow, rock, hull, deck, cabin, funnel, glass };
}

function createWaterTexture(scene) {
  const texture = new DynamicTexture("water_texture", { width: 256, height: 256 }, scene);
  const context = texture.getContext();
  context.fillStyle = "#0a536c";
  context.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 34; i += 1) {
    const y = 8 + i * 8;
    context.beginPath();
    context.strokeStyle = i % 2 === 0 ? "rgba(155, 224, 236, 0.18)" : "rgba(5, 45, 64, 0.18)";
    context.lineWidth = i % 3 === 0 ? 2 : 1;

    for (let x = -20; x <= 276; x += 12) {
      const wave = Math.sin((x + i * 19) * 0.045) * 4;
      if (x === -20) {
        context.moveTo(x, y + wave);
      } else {
        context.lineTo(x, y + wave);
      }
    }

    context.stroke();
  }

  texture.update(false);
  return texture;
}

function createPlayerBow(scene, materials, name = "player_bow") {
  const root = new TransformNode(name, scene);

  const hull = createTaperedHull(`${name}_hull`, scene, [
    { z: -1.35, width: 1.7, top: 0.72, bottom: 0.12 },
    { z: 2.55, width: 1.18, top: 0.68, bottom: 0.02 },
    { z: 5.15, width: 0.16, top: 0.64, bottom: 0.0 }
  ]);
  hull.parent = root;
  hull.material = materials.hull;

  const deck = createTaperedDeck(`${name}_foredeck`, scene, [
    { z: -1.08, width: 1.35, y: 0.78 },
    { z: 2.55, width: 0.96, y: 0.76 },
    { z: 4.75, width: 0.24, y: 0.72 }
  ]);
  deck.parent = root;
  deck.material = materials.deck;

  const rearDeck = MeshBuilder.CreateBox(`${name}_rear_deck`, { width: 1.42, height: 0.12, depth: 0.72 }, scene);
  rearDeck.parent = root;
  rearDeck.position.y = 0.82;
  rearDeck.position.z = -1.02;
  rearDeck.material = materials.deck;

  for (let i = 0; i < 2; i += 1) {
    const tube = MeshBuilder.CreateCylinder(`${name}_torpedo_tube_${i}`, {
      diameter: 0.14,
      height: 2.65,
      tessellation: 12
    }, scene);
    tube.parent = root;
    tube.position.x = i === 0 ? -0.32 : 0.32;
    tube.position.y = 0.795;
    tube.position.z = 1.55;
    tube.rotation.x = Math.PI / 2;
    tube.material = materials.funnel;

    for (let j = 0; j < 3; j += 1) {
      const saddle = MeshBuilder.CreateBox(`${name}_torpedo_saddle_${i}_${j}`, { width: 0.2, height: 0.08, depth: 0.12 }, scene);
      saddle.parent = root;
      saddle.position.x = tube.position.x;
      saddle.position.y = 0.755;
      saddle.position.z = 0.52 + j * 0.86;
      saddle.material = materials.hull;
    }

    const cap = MeshBuilder.CreateCylinder(`${name}_tube_cap_${i}`, {
      diameter: 0.17,
      height: 0.08,
      tessellation: 12
    }, scene);
    cap.parent = root;
    cap.position.x = tube.position.x;
    cap.position.y = tube.position.y;
    cap.position.z = 2.9;
    cap.rotation.x = Math.PI / 2;
    cap.material = materials.funnel;
  }

  createRailSegment(`${name}_deck_edge_left`, scene, materials.hull, root, -0.58, -1.09, -0.58, 2.15, 0.76);
  createRailSegment(`${name}_deck_edge_right`, scene, materials.hull, root, 0.58, -1.09, 0.58, 2.15, 0.76);

  createRailSegment(`${name}_bow_rail_left_a`, scene, materials.hull, root, -0.58, 2.15, -0.46, 3.02, 0.76);
  createRailSegment(`${name}_bow_rail_left_b`, scene, materials.hull, root, -0.2, 3.9, 0, 4.58, 0.82, 0.17);
  createRailSegment(`${name}_bow_rail_right_a`, scene, materials.hull, root, 0.58, 2.15, 0.46, 3.02, 0.76);
  createRailSegment(`${name}_bow_rail_right_b`, scene, materials.hull, root, 0.2, 3.9, 0, 4.58, 0.82, 0.17);

  const hatch = MeshBuilder.CreateBox(`${name}_deck_hatch`, { width: 0.46, height: 0.11, depth: 0.52 }, scene);
  hatch.parent = root;
  hatch.position.y = 0.91;
  hatch.position.z = -0.36;
  hatch.material = materials.cabin;

  return { root };
}

function createRailSegment(name, scene, material, parent, x1, z1, x2, z2, y, height = 0.12) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const rail = MeshBuilder.CreateBox(name, { width: 0.07, height, depth: length }, scene);
  rail.parent = parent;
  rail.position.x = (x1 + x2) / 2;
  rail.position.y = y;
  rail.position.z = (z1 + z2) / 2;
  rail.rotation.y = Math.atan2(dx, dz);
  rail.material = material;
  return rail;
}

function createTaperedHull(name, scene, sections) {
  const positions = [];
  const indices = [];

  sections.forEach((section) => {
    const halfWidth = section.width / 2;
    positions.push(
      -halfWidth, section.top, section.z,
      halfWidth, section.top, section.z,
      -halfWidth, section.bottom, section.z,
      halfWidth, section.bottom, section.z
    );
  });

  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = i * 4;
    const b = (i + 1) * 4;
    pushQuad(indices, a, a + 1, b + 1, b);
    pushQuad(indices, a + 2, b + 2, b + 3, a + 3);
    pushQuad(indices, a, b, b + 2, a + 2);
    pushQuad(indices, a + 1, a + 3, b + 3, b + 1);
  }

  pushQuad(indices, 0, 2, 3, 1);
  const last = (sections.length - 1) * 4;
  pushQuad(indices, last, last + 1, last + 3, last + 2);

  return createMeshFromData(name, scene, positions, indices);
}

function createTaperedDeck(name, scene, sections) {
  const positions = [];
  const indices = [];

  sections.forEach((section) => {
    const halfWidth = section.width / 2;
    positions.push(
      -halfWidth, section.y, section.z,
      halfWidth, section.y, section.z
    );
  });

  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = i * 2;
    const b = (i + 1) * 2;
    pushQuad(indices, a, a + 1, b + 1, b);
  }

  return createMeshFromData(name, scene, positions, indices);
}

function pushQuad(indices, a, b, c, d) {
  indices.push(a, b, c, a, c, d);
}

function createMeshFromData(name, scene, positions, indices) {
  const mesh = new Mesh(name, scene);
  const normals = [];
  VertexData.ComputeNormals(positions, indices, normals);

  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.applyToMesh(mesh);

  return mesh;
}

function createBoat(scene, materials, name = "boat") {
  const root = new TransformNode(name, scene);

  const hull = MeshBuilder.CreateBox(`${name}_hull`, { width: 1.35, height: 0.56, depth: 7.2 }, scene);
  hull.parent = root;
  hull.position.y = 0.34;
  hull.material = materials.hull;

  const bow = MeshBuilder.CreateCylinder(`${name}_bow`, {
    diameterTop: 0.05,
    diameterBottom: 1.33,
    height: 1.55,
    tessellation: 4
  }, scene);
  bow.parent = root;
  bow.position.y = 0.34;
  bow.position.z = 3.88;
  bow.rotation.y = Math.PI / 4;
  bow.scaling.z = 0.78;
  bow.material = materials.hull;

  const deck = MeshBuilder.CreateBox(`${name}_deck`, { width: 1.08, height: 0.12, depth: 6.1 }, scene);
  deck.parent = root;
  deck.position.y = 0.71;
  deck.position.z = -0.18;
  deck.material = materials.deck;

  const cabin = MeshBuilder.CreateBox(`${name}_bridge`, { width: 0.92, height: 0.58, depth: 0.85 }, scene);
  cabin.parent = root;
  cabin.position.y = 1.14;
  cabin.position.z = 0.86;
  cabin.material = materials.cabin;

  const window = MeshBuilder.CreateBox(`${name}_window`, { width: 0.78, height: 0.16, depth: 0.04 }, scene);
  window.parent = root;
  window.position.y = 1.2;
  window.position.z = 1.31;
  window.material = materials.glass;

  const funnelA = MeshBuilder.CreateCylinder(`${name}_funnel_a`, {
    diameter: 0.34,
    height: 1.1,
    tessellation: 10
  }, scene);
  funnelA.parent = root;
  funnelA.position.y = 1.35;
  funnelA.position.z = -0.28;
  funnelA.material = materials.funnel;

  const funnelB = MeshBuilder.CreateCylinder(`${name}_funnel_b`, {
    diameter: 0.32,
    height: 1.0,
    tessellation: 10
  }, scene);
  funnelB.parent = root;
  funnelB.position.y = 1.3;
  funnelB.position.z = -1.28;
  funnelB.material = materials.funnel;

  const foreGun = MeshBuilder.CreateCylinder(`${name}_fore_gun`, {
    diameter: 0.13,
    height: 0.95,
    tessellation: 8
  }, scene);
  foreGun.parent = root;
  foreGun.position.y = 0.95;
  foreGun.position.z = 2.65;
  foreGun.rotation.x = Math.PI / 2;
  foreGun.material = materials.funnel;

  const aftGun = MeshBuilder.CreateCylinder(`${name}_aft_gun`, {
    diameter: 0.12,
    height: 0.8,
    tessellation: 8
  }, scene);
  aftGun.parent = root;
  aftGun.position.y = 0.92;
  aftGun.position.z = -3.0;
  aftGun.rotation.x = Math.PI / 2;
  aftGun.material = materials.funnel;

  for (let i = 0; i < 2; i += 1) {
    const tube = MeshBuilder.CreateCylinder(`${name}_torpedo_tube_${i}`, {
      diameter: 0.17,
      height: 1.7,
      tessellation: 10
    }, scene);
    tube.parent = root;
    tube.position.x = i === 0 ? -0.34 : 0.34;
    tube.position.y = 0.92;
    tube.position.z = -0.02;
    tube.rotation.x = Math.PI / 2;
    tube.material = materials.funnel;
  }

  const mast = MeshBuilder.CreateCylinder(`${name}_mast`, {
    diameter: 0.055,
    height: 1.65,
    tessellation: 6
  }, scene);
  mast.parent = root;
  mast.position.y = 1.9;
  mast.position.z = 0.52;
  mast.rotation.x = -0.18;
  mast.material = materials.funnel;

  return { root };
}

function createCoastline(name, position, rx, rz, scene, materials, parent, blockedWaters) {
  blockedWaters.push({ x: position.x, z: position.z, rx, rz });

  const shallow = MeshBuilder.CreateCylinder(`${name}_shallows`, {
    diameter: 2,
    height: 0.08,
    tessellation: 72
  }, scene);
  shallow.parent = parent;
  shallow.position = new Vector3(position.x, 0.08, position.z);
  shallow.scaling.x = rx * 1.18;
  shallow.scaling.z = rz * 1.18;
  shallow.material = materials.shallow;

  const beach = MeshBuilder.CreateCylinder(`${name}_beach`, {
    diameter: 2,
    height: 0.18,
    tessellation: 72
  }, scene);
  beach.parent = parent;
  beach.position = new Vector3(position.x, 0.28, position.z);
  beach.scaling.x = rx * 1.04;
  beach.scaling.z = rz * 1.04;
  beach.material = materials.sand;

  const terrain = MeshBuilder.CreateGround(`${name}_terrain`, {
    width: rx * 2.05,
    height: rz * 2.05,
    subdivisions: 54,
    updatable: true
  }, scene);
  terrain.parent = parent;
  terrain.position = position;
  terrain.material = materials.terrain;

  const positions = terrain.getVerticesData("position");
  const indices = terrain.getIndices();
  const normals = [];

  for (let i = 0; i < positions.length; i += 3) {
    const localX = positions[i];
    const localZ = positions[i + 2];
    const nx = localX / rx;
    const nz = localZ / rz;
    const distance = Math.sqrt(nx * nx + nz * nz);
    const coast = 1 - smoothstep(0.58, 0.96, distance);
    const inland = clamp(1 - distance, 0, 1);
    const ridgeA = Math.sin(localX * 0.065 + localZ * 0.035) * 0.5 + 0.5;
    const ridgeB = Math.sin(localX * -0.028 + localZ * 0.082 + 2.4) * 0.5 + 0.5;
    const roughness = terrainNoise(localX, localZ);
    const cliffLift = smoothstep(0.68, 0.9, distance) * smoothstep(1.04, 0.86, distance) * 5.5;
    const mountainLift = Math.pow(inland, 0.65) * (9 + ridgeA * 10 + ridgeB * 5);

    positions[i + 1] = distance > 0.98
      ? -14
      : 0.48 + coast * (cliffLift + mountainLift + roughness * 3.2);
  }

  VertexData.ComputeNormals(positions, indices, normals);
  terrain.updateVerticesData("position", positions);
  terrain.updateVerticesData("normal", normals);

  const ridgeCount = 9;
  for (let i = 0; i < ridgeCount; i += 1) {
    const angle = -0.8 + i * 0.26;
    const distance = 0.2 + (i % 4) * 0.12;
    const rock = MeshBuilder.CreateCylinder(`${name}_rock_${i}`, {
      diameterTop: 0,
      diameterBottom: 11 + i * 1.4,
      height: 16 + (i % 3) * 7,
      tessellation: 7
    }, scene);
    rock.parent = parent;
    rock.position.x = position.x + Math.cos(angle) * rx * distance;
    rock.position.z = position.z + Math.sin(angle) * rz * distance;
    rock.position.y = 8 + (i % 3) * 2.2;
    rock.rotation.y = angle * 1.7;
    rock.scaling.x = 0.55 + (i % 2) * 0.25;
    rock.scaling.z = 1.1;
    rock.material = materials.rock;
  }
}

function createIsland(name, position, radius, heightScale, scene, materials, parent) {
  const islandRoot = new TransformNode(name, scene);
  islandRoot.position = position;
  islandRoot.parent = parent;

  const sand = MeshBuilder.CreateCylinder(`${name}_sand`, {
    diameter: radius * 2,
    height: 0.55,
    tessellation: 28
  }, scene);
  sand.parent = islandRoot;
  sand.position.y = 0.02;
  sand.scaling.x = 1.15;
  sand.scaling.z = 0.78;
  sand.rotation.y = radius * 0.07;
  sand.material = materials.sand;
  sand.receiveShadows = true;

  const grass = MeshBuilder.CreateCylinder(`${name}_grass`, {
    diameter: radius * 1.5,
    height: 0.7,
    tessellation: 24
  }, scene);
  grass.parent = islandRoot;
  grass.position.y = 0.5;
  grass.scaling.x = 1.08;
  grass.scaling.z = 0.67;
  grass.rotation.y = radius * 0.13;
  grass.material = materials.grass;
  grass.receiveShadows = true;

  const peaks = Math.max(2, Math.round(radius / 8));
  for (let i = 0; i < peaks; i += 1) {
    const angle = (i / peaks) * Math.PI * 2 + radius * 0.11;
    const distance = radius * (0.11 + i * 0.04);
    const mountain = MeshBuilder.CreateCylinder(`${name}_mountain_${i}`, {
      diameterTop: 0.35,
      diameterBottom: radius * (0.58 - i * 0.08),
      height: radius * (0.52 + i * 0.18) * heightScale,
      tessellation: 6
    }, scene);
    mountain.parent = islandRoot;
    mountain.position.x = Math.cos(angle) * distance;
    mountain.position.z = Math.sin(angle) * distance * 0.68;
    mountain.position.y = radius * (0.26 + i * 0.09) * heightScale;
    mountain.rotation.y = angle * 0.5;
    mountain.material = materials.rock;
    mountain.receiveShadows = true;
  }

  return islandRoot;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function terrainNoise(x, z) {
  return (
    Math.sin(x * 0.17 + z * 0.08) * 0.45 +
    Math.sin(x * 0.07 - z * 0.19 + 1.7) * 0.35 +
    Math.sin(x * -0.13 + z * 0.12 + 4.1) * 0.2
  );
}

function getWaterSafety(position, zones) {
  let shallowAmount = 0;

  for (const zone of zones) {
    const nx = (position.x - zone.x) / zone.rx;
    const nz = (position.z - zone.z) / zone.rz;
    const distance = Math.sqrt(nx * nx + nz * nz);

    if (distance < 1) {
      return { isBlocked: true, isShallow: true };
    }

    if (distance < 1.18) {
      shallowAmount = Math.max(shallowAmount, 1 - (distance - 1) / 0.18);
    }
  }

  return { isBlocked: false, isShallow: shallowAmount > 0 };
}
