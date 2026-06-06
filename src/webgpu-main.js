import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import "@babylonjs/core/Engines/WebGPU/Extensions";
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
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import "@babylonjs/core/Meshes/Builders/boxBuilder";
import "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import "@babylonjs/core/Meshes/Builders/groundBuilder";
import "@babylonjs/core/Materials/Textures/dynamicTexture";
import "./styles.css";

const canvas = document.getElementById("renderCanvas");
const engineStatus = document.getElementById("engineStatus");

if (!navigator.gpu) {
  engineStatus.textContent = "WebGPU is not available on this browser/TV.";
  throw new Error("WebGPU is not available.");
}

engineStatus.textContent = "Starting WebGPU...";
const engine = await WebGPUEngine.CreateAsync(canvas, {
  antialias: true,
  preserveDrawingBuffer: false
});
engineStatus.textContent = "WebGPU active";

const scene = new Scene(engine);
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

const boat = createBoat(scene, materials);
boat.root.position = new Vector3(0, 0.28, 0);

const camera = new FreeCamera("follow_camera", new Vector3(0, 7, -13), scene);
camera.minZ = 0.2;
camera.maxZ = 800;
camera.fov = 0.78;
camera.rotationQuaternion = Quaternion.Identity();

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

  const cameraDistance = 14.5;
  const cameraHeight = 7.1;
  const desiredCameraPosition = boat.root.position
    .subtract(forward.scale(cameraDistance))
    .add(new Vector3(0, cameraHeight, 0));
  const desiredTarget = boat.root.position.add(forward.scale(7.0)).add(new Vector3(0, 1.8, 0));

  cameraPosition = Vector3.Lerp(cameraPosition, desiredCameraPosition, 1 - Math.pow(0.035, dt));
  cameraTarget = Vector3.Lerp(cameraTarget, desiredTarget, 1 - Math.pow(0.02, dt));
  camera.position.copyFrom(cameraPosition);
  camera.setTarget(cameraTarget);

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
  hull.diffuseColor = new Color3(0.55, 0.09, 0.06);
  hull.specularColor = new Color3(0.22, 0.11, 0.08);

  const deck = new StandardMaterial("deck_material", scene);
  deck.diffuseColor = new Color3(0.52, 0.34, 0.19);
  deck.specularColor = new Color3(0.08, 0.05, 0.03);

  const cabin = new StandardMaterial("cabin_material", scene);
  cabin.diffuseColor = new Color3(0.82, 0.88, 0.83);
  cabin.specularColor = new Color3(0.18, 0.2, 0.18);

  const glass = new StandardMaterial("glass_material", scene);
  glass.diffuseColor = new Color3(0.18, 0.42, 0.54);
  glass.emissiveColor = new Color3(0.02, 0.08, 0.1);
  glass.specularColor = new Color3(0.7, 0.9, 1);

  return { water, sand, grass, terrain, shallow, rock, hull, deck, cabin, glass };
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

function createBoat(scene, materials) {
  const root = new TransformNode("boat", scene);

  const hull = MeshBuilder.CreateBox("boat_hull", { width: 2.2, height: 0.75, depth: 4.1 }, scene);
  hull.parent = root;
  hull.position.y = 0.34;
  hull.scaling.x = 0.72;
  hull.material = materials.hull;

  const bow = MeshBuilder.CreateCylinder("boat_bow", { diameterTop: 0, diameterBottom: 1.56, height: 1.25, tessellation: 4 }, scene);
  bow.parent = root;
  bow.position.z = 2.38;
  bow.position.y = 0.34;
  bow.rotation.y = Math.PI / 4;
  bow.material = materials.hull;

  const deck = MeshBuilder.CreateBox("boat_deck", { width: 1.65, height: 0.16, depth: 3.05 }, scene);
  deck.parent = root;
  deck.position.y = 0.82;
  deck.position.z = -0.1;
  deck.material = materials.deck;

  const cabin = MeshBuilder.CreateBox("boat_cabin", { width: 1.22, height: 0.82, depth: 1.1 }, scene);
  cabin.parent = root;
  cabin.position.y = 1.34;
  cabin.position.z = -0.62;
  cabin.material = materials.cabin;

  const window = MeshBuilder.CreateBox("boat_window", { width: 1.25, height: 0.28, depth: 0.04 }, scene);
  window.parent = root;
  window.position.y = 1.43;
  window.position.z = -0.04;
  window.material = materials.glass;

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
