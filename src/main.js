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
import "@babylonjs/core/Meshes/Builders/torusBuilder";
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
const depthGauge = document.querySelector(".depth-gauge");
const engineValue = document.getElementById("engineValue");
const telegraphScale = document.getElementById("telegraphScale");
const compassPointer = document.getElementById("compassPointer");
const mapCanvas = document.getElementById("mapCanvas");
const mapZoom = document.getElementById("mapZoom");
const radarCanvas = document.getElementById("radarCanvas");
const radarStatus = document.getElementById("radarStatus");
const rudderIndicator = document.getElementById("rudderIndicator");
const rudderValue = document.getElementById("rudderValue");

// One source for visible land, collision, depth, map, and radar occlusion.
const worldLandmasses = [
  {
    kind: "coastline",
    name: "western_coast",
    x: -126,
    z: 58,
    rx: 72,
    rz: 66,
    heightScale: 1,
    coastRoughness: 0.22,
    fjords: [
      { angle: 1.95, width: 0.2, reach: 0.9 }
    ]
  },
  { kind: "island", name: "north_island", x: -32, z: 54, radius: 21, heightScale: 1.1, rx: 28, rz: 22 },
  { kind: "island", name: "east_island", x: 58, z: 10, radius: 28, heightScale: 0.9, rx: 36, rz: 27 },
  { kind: "island", name: "south_island", x: 18, z: -76, radius: 24, heightScale: 1.25, rx: 32, rz: 25 },
  { kind: "island", name: "far_island", x: -92, z: -26, radius: 16, heightScale: 0.75, rx: 22, rz: 17 },
  {
    kind: "coastline",
    name: "volcanic_highland",
    x: 312,
    z: -214,
    rx: 86,
    rz: 74,
    heightScale: 1.55,
    peakBoost: 34,
    coastRoughness: 0.22,
    caldera: { radius: 0.38, rim: 0.18, depth: 18 },
    fjords: [
      { angle: 2.72, width: 0.17, reach: 0.88 },
      { angle: -1.18, width: 0.14, reach: 0.76 }
    ]
  },
  {
    kind: "coastline",
    name: "fjord_coast",
    x: 194,
    z: -344,
    rx: 64,
    rz: 54,
    heightScale: 1.05,
    peakBoost: 10,
    coastRoughness: 0.24,
    fjords: [
      { angle: 0.42, width: 0.18, reach: 0.82 },
      { angle: -2.38, width: 0.13, reach: 0.7 }
    ]
  },
  { kind: "island", name: "outer_stack", x: 410, z: -315, radius: 22, heightScale: 1.0, rx: 30, rz: 23 },
  { kind: "island", name: "needle_rocks", x: 240, z: -112, radius: 17, heightScale: 1.35, rx: 24, rz: 18 },
  { kind: "island", name: "low_skerries", x: 118, z: -238, radius: 14, heightScale: 0.82, rx: 20, rz: 16 },
  {
    kind: "coastline",
    name: "storm_peak",
    x: -430,
    z: -405,
    rx: 78,
    rz: 62,
    heightScale: 2.05,
    peakBoost: 82,
    coastRoughness: 0.2,
    fjords: [
      { angle: 0.9, width: 0.13, reach: 0.72 }
    ]
  },
  { kind: "island", name: "storm_north_stack", x: -372, z: -312, radius: 16, heightScale: 1.15, rx: 22, rz: 17 },
  { kind: "island", name: "storm_west_rocks", x: -536, z: -390, radius: 18, heightScale: 1.0, rx: 25, rz: 18 },
  { kind: "island", name: "storm_south_skerries", x: -462, z: -512, radius: 14, heightScale: 0.9, rx: 20, rz: 16 },
  { kind: "island", name: "storm_outer_needle", x: -318, z: -482, radius: 12, heightScale: 1.45, rx: 18, rz: 14 },
  { kind: "island", name: "l_passage_west_arm", x: 486, z: -548, radius: 24, heightScale: 1.0, rx: 38, rz: 20 },
  { kind: "island", name: "l_passage_north_arm", x: 536, z: -502, radius: 22, heightScale: 0.95, rx: 22, rz: 38 },
  { kind: "island", name: "l_passage_outer_rock", x: 592, z: -555, radius: 15, heightScale: 1.2, rx: 20, rz: 16 },
  {
    kind: "coastline",
    name: "northern_ridge",
    x: 24,
    z: 760,
    rx: 220,
    rz: 96,
    heightScale: 1.28,
    peakBoost: 38,
    coastRoughness: 0.24,
    fjords: [
      { angle: 3.02, width: 0.12, reach: 0.8 },
      { angle: -2.52, width: 0.16, reach: 0.68 }
    ]
  },
  {
    kind: "coastline",
    name: "eastern_delta_coast",
    x: 835,
    z: 118,
    rx: 168,
    rz: 128,
    heightScale: 0.72,
    peakBoost: 4,
    coastRoughness: 0.28,
    fjords: [
      { angle: -1.78, width: 0.2, reach: 0.88 },
      { angle: -1.42, width: 0.15, reach: 0.72 },
      { angle: -2.05, width: 0.13, reach: 0.64 }
    ],
    waterways: [
      { from: { x: 86, z: 8 }, to: { x: 22, z: 0 }, width: 18 },
      { from: { x: 22, z: 0 }, to: { x: -52, z: -10 }, width: 30 },
      { from: { x: -52, z: -10 }, to: { x: -154, z: -80 }, width: 18 },
      { from: { x: -46, z: -3 }, to: { x: -164, z: 0 }, width: 20 },
      { from: { x: -38, z: 6 }, to: { x: -138, z: 72 }, width: 17 }
    ],
    lakes: [
      { x: -48, z: -5, rx: 32, rz: 21 }
    ]
  },
  { kind: "island", name: "delta_outer_bar", x: 632, z: 92, radius: 13, heightScale: 0.7, rx: 19, rz: 15 },
  { kind: "island", name: "delta_split_rocks", x: 672, z: 164, radius: 11, heightScale: 0.8, rx: 16, rz: 13 },
  { kind: "island", name: "delta_south_bar", x: 604, z: 18, radius: 12, heightScale: 0.65, rx: 17, rz: 14 },
  {
    kind: "coastline",
    name: "southern_cliffs",
    x: 148,
    z: -855,
    rx: 232,
    rz: 118,
    heightScale: 1.38,
    peakBoost: 24,
    coastRoughness: 0.24,
    fjords: [
      { angle: 0.12, width: 0.14, reach: 0.78 },
      { angle: -0.48, width: 0.11, reach: 0.66 }
    ]
  },
  { kind: "island", name: "southern_gate_rocks", x: -96, z: -706, radius: 18, heightScale: 1.15, rx: 25, rz: 18 },
  { kind: "island", name: "southern_outer_stack", x: 332, z: -698, radius: 20, heightScale: 1.05, rx: 28, rz: 21 },
  {
    kind: "coastline",
    name: "western_continent",
    x: -2350,
    z: 120,
    rx: 820,
    rz: 1750,
    heightScale: 1.18,
    peakBoost: 46,
    coastRoughness: 0.26,
    fjords: [
      { angle: 1.46, width: 0.1, reach: 0.78 },
      { angle: 1.18, width: 0.16, reach: 0.62 },
      { angle: 1.82, width: 0.13, reach: 0.68 },
      { angle: 2.22, width: 0.1, reach: 0.55 }
    ],
    waterways: [
      { from: { x: 760, z: 620 }, to: { x: 520, z: 470 }, width: 48 },
      { from: { x: 520, z: 470 }, to: { x: 310, z: 250 }, width: 44 },
      { from: { x: 310, z: 250 }, to: { x: 118, z: 76 }, width: 42 },
      { from: { x: 118, z: 76 }, to: { x: -96, z: -28 }, width: 46 },
      { from: { x: -96, z: -28 }, to: { x: -320, z: -168 }, width: 38 },
      { from: { x: -320, z: -168 }, to: { x: -610, z: -310 }, width: 34 }
    ],
    lakes: [
      { x: -96, z: -28, rx: 120, rz: 78 }
    ]
  },
  { kind: "island", name: "western_sound_stack", x: -1310, z: 520, radius: 28, heightScale: 1.2, rx: 38, rz: 28 },
  { kind: "island", name: "western_south_rocks", x: -1460, z: -630, radius: 22, heightScale: 1.05, rx: 30, rz: 24 }
];
const radarOcclusionScale = 0.72;
const mapTileSize = 1200;
const mapZoomScales = [0.5, 1, 2, 4, 8, 16];
const worldMetersPerUnit = 20;

const materials = createMaterials(scene);
const world = new TransformNode("world", scene);

const sun = new DirectionalLight("sun", new Vector3(-0.45, -0.9, 0.32), scene);
sun.position = new Vector3(35, 80, -45);
sun.intensity = 1.45;

const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
ambient.intensity = 0.58;
ambient.groundColor = new Color3(0.1, 0.18, 0.19);

const worldLimit = 5000;
const ocean = MeshBuilder.CreateGround("ocean", { width: 2300, height: 2300, subdivisions: 160 }, scene);
ocean.material = materials.water;
ocean.parent = world;
const foam = createFoamPatches(scene, materials, world);

const blockedWaters = worldLandmasses.map(getLandZone);
createWorldLandmasses(worldLandmasses, scene, materials, world);

const boat = createPlayerBow(scene, materials);
boat.root.position = new Vector3(-2446, 0.28, 92);

// Static inspection target until networked opponents supply position and heading.
const enemyBoat = createEnemyTorpedoBoat(scene, materials, "enemy_boat");
enemyBoat.root.position = new Vector3(16, 0.26, 34);
enemyBoat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, -0.55, 0);
document.body.dataset.meshCount = String(scene.meshes.length);

const camera = new FreeCamera("follow_camera", new Vector3(0, 7, -13), scene);
camera.minZ = 0.2;
camera.maxZ = 800;
camera.fov = 0.78;
scene.activeCamera = camera;

window.addEventListener("keydown", (event) => {
  document.body.dataset.lastKey = formatInputEvent(event);

  if (isInputKey(event, "up") && !event.repeat) {
    engineOrder = clamp(engineOrder + 1, 0, engineOrders.length - 1);
    event.preventDefault();
  }
  if (isInputKey(event, "down") && !event.repeat) {
    engineOrder = clamp(engineOrder - 1, 0, engineOrders.length - 1);
    event.preventDefault();
  }
  if (isInputKey(event, "left")) {
    heldRudderDirection = -1;
    if (!event.repeat) {
      rudderDegrees = clamp(rudderDegrees - rudderStepDegrees, -maxRudderDegrees, maxRudderDegrees);
    }
    event.preventDefault();
  }
  if (isInputKey(event, "right")) {
    heldRudderDirection = 1;
    if (!event.repeat) {
      rudderDegrees = clamp(rudderDegrees + rudderStepDegrees, -maxRudderDegrees, maxRudderDegrees);
    }
    event.preventDefault();
  }
  if (isTorpedoFireKey(event) && !event.repeat) {
    firePlayerTorpedo(torpedoSystem, boat.root, heading, turnVelocity, speed, time);
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (isInputKey(event, "left") && heldRudderDirection < 0) {
    heldRudderDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "right") && heldRudderDirection > 0) {
    heldRudderDirection = 0;
    event.preventDefault();
  }
});

const engineOrders = [
  { label: "Astern Full", shortLabel: "Full Ast", speed: -4.2 },
  { label: "Astern Half", shortLabel: "Half Ast", speed: -2.2 },
  { label: "Stop", speed: 0 },
  { label: "Ahead Slow", shortLabel: "Slow", speed: 1.6 },
  { label: "Ahead 1/3", shortLabel: "1/3", speed: 3.2 },
  { label: "Ahead Half", shortLabel: "Half", speed: 5.2 },
  { label: "Ahead 2/3", shortLabel: "2/3", speed: 7.2 },
  { label: "Ahead Full", shortLabel: "Full", speed: 9.6 },
  { label: "Flank", speed: 12.4 }
];

// Keep propulsion as discrete ship orders, not held-key throttle.
// Later multiplayer can send this order index plus heading/speed instead of raw input.
let heading = -2.12;
let speed = 0;
let engineOrder = 2;
let turnVelocity = 0;
let rudderDegrees = 0;
let heldRudderDirection = 0;
let cameraPosition = camera.position.clone();
let cameraTarget = boat.root.position.clone();
let time = 0;
let nextRamHitTime = 0;
let ramShake = 0;
const maxRudderDegrees = 35;
const rudderStepDegrees = 5;
const rudderHoldDegreesPerSecond = 18;
const torpedoLaunchDefaults = {
  tubeX: 0.6,
  startZ: 2.45,
  startY: 0.6
};
const torpedoSystem = createTorpedoSystem(scene, materials, world);

const telegraphSteps = createTelegraphSteps(engineOrders, telegraphScale);
const enemyMotion = createEnemyMotion(enemyBoat.root, enemyBoat.bowWake, -0.55, 3);
startLocalEnemyEventSource(enemyMotion);

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  time += dt;

  if (heldRudderDirection !== 0) {
    rudderDegrees = clamp(
      rudderDegrees + heldRudderDirection * rudderHoldDegreesPerSecond * dt,
      -maxRudderDegrees,
      maxRudderDegrees
    );
  }

  // Heavy ship feel: the selected telegraph order is a target, and speed eases toward it.
  const waterSafety = getWaterSafety(boat.root.position, blockedWaters);
  const maxForwardSpeed = 14.4 - waterSafety.shallowAmount * 9.2;
  const engineTargetSpeed = engineOrders[engineOrder].speed;
  const targetSpeed = engineTargetSpeed > 0 ? Math.min(engineTargetSpeed, maxForwardSpeed) : engineTargetSpeed;
  const response = Math.abs(targetSpeed) > Math.abs(speed) ? 0.42 : 0.72;
  speed += (targetSpeed - speed) * Math.min(1, dt * response);

  const turnStrength = speed >= 0 ? 0.36 : -0.24;
  const rudderGrip = clamp(0.18 + Math.abs(speed) / 3.4, 0.18, 1);
  const steer = rudderDegrees / maxRudderDegrees;
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

    // Grounding stops the ship, but a tiny escape nudge prevents numeric edge-locking.
    if (getWaterSafety(boat.root.position, blockedWaters).isBlocked) {
      boat.root.position.addInPlace(getWaterEscapeVector(boat.root.position, blockedWaters).scale(0.18));
    }

    speed = 0;
    turnVelocity *= 0.4;
  } else if (nextWaterSafety.isShallow) {
    speed *= 1 - nextWaterSafety.shallowAmount * 0.004;
  }

  const bob = Math.sin(time * 2.1) * 0.08 + Math.sin(time * 3.8 + 1.6) * 0.035;
  boat.root.position.y = 0.32 + bob;
  boat.root.rotationQuaternion = Quaternion.FromEulerAngles(
    Math.sin(time * 2.6) * 0.025,
    heading,
    -turnVelocity * 0.5 + Math.sin(time * 1.9) * 0.018
  );
  ocean.position.x = boat.root.position.x;
  ocean.position.z = boat.root.position.z;

  materials.water.diffuseTexture.uOffset += dt * 0.01;
  materials.water.diffuseTexture.vOffset += dt * 0.018;
  updateFoamPatches(foam, boat.root.position, time);
  updateEnemyMotion(enemyMotion, dt, time);
  updateTorpedoSystem(torpedoSystem, dt, time, enemyMotion, blockedWaters);

  const ramHit = getPlayerRamHit(boat.root.position, heading, speed, enemyMotion, time);
  if (ramHit) {
    nextRamHitTime = time + 2.2;
    torpedoSystem.hits += 1;
    ramShake = 1;
    beginEnemySinking(enemyMotion, -ramHit.side, time);
    speed *= -0.18;
    turnVelocity *= 0.25;
  }

  // Fixed bridge camera: it follows the ship immediately so acceleration never reveals the rear model.
  const cameraDistance = 0.65;
  const cameraHeight = 1.48;
  const desiredCameraPosition = boat.root.position
    .subtract(forward.scale(cameraDistance))
    .add(new Vector3(0, cameraHeight, 0));
  const desiredTarget = boat.root.position.add(forward.scale(24.0)).add(new Vector3(0, 0.95, 0));
  const shakeOffset = getRamShakeOffset(heading, ramShake, time);
  ramShake = Math.max(0, ramShake - dt * 2.6);

  cameraPosition.copyFrom(desiredCameraPosition.add(shakeOffset));
  cameraTarget.copyFrom(desiredTarget);
  camera.position.copyFrom(cameraPosition);
  camera.setTarget(desiredTarget);
  camera.rotation.x = -Math.abs(camera.rotation.x);
  document.body.dataset.camera = `${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}`;
  document.body.dataset.cameraRotation = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)},${camera.rotation.z.toFixed(2)}`;
  document.body.dataset.activeCamera = scene.activeCamera?.name ?? "none";
  document.body.dataset.boat = `${boat.root.position.x.toFixed(1)},${boat.root.position.y.toFixed(1)},${boat.root.position.z.toFixed(1)}`;
  document.body.dataset.engineOrder = engineOrders[engineOrder].label;
  document.body.dataset.rudderDegrees = String(Math.round(rudderDegrees));
  document.body.dataset.torpedoes = String(torpedoSystem.active.length);
  document.body.dataset.torpedoHits = String(torpedoSystem.hits);
  document.body.dataset.ramReady = time >= nextRamHitTime ? "true" : "false";

  const displayedSpeed = Math.abs(speed) < 0.08 ? 0 : Math.abs(speed);
  const waterDepth = getWaterDepth(boat.root.position, blockedWaters);
  speedValue.textContent = displayedSpeed.toFixed(1);
  engineValue.textContent = engineOrders[engineOrder].label;
  updateTelegraphSteps(telegraphSteps, engineOrder);
  depthValue.textContent = nextWaterSafety.isBlocked ? "Ground" : `${waterDepth.meters.toFixed(0)} m`;
  depthGauge?.style.setProperty("--depth-ratio", String(waterDepth.ratio));
  compassPointer?.style.setProperty("transform", `translate(-50%, -50%) rotate(${heading}rad)`);
  updateRudderGauge(rudderIndicator, rudderValue, rudderDegrees);
  updateNavigationInstruments(mapCanvas, radarCanvas, radarStatus, boat.root.position, getRadarEnemyPosition(enemyMotion), blockedWaters, heading);
});

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});

function isInputKey(event, name) {
  const keyCode = event.keyCode ?? event.which;
  const code = event.code;

  return {
    up: code === "ArrowUp" || keyCode === 38,
    down: code === "ArrowDown" || keyCode === 40,
    left: code === "ArrowLeft" || keyCode === 37,
    right: code === "ArrowRight" || keyCode === 39
  }[name];
}

function isTorpedoFireKey(event) {
  const keyCode = event.keyCode ?? event.which;
  const code = event.code;
  const key = event.key;

  return (
    code === "Space" ||
    code === "KeyF" ||
    code === "Enter" ||
    code === "NumpadEnter" ||
    key === "Enter" ||
    keyCode === 13 ||
    keyCode === 398 ||
    keyCode === 399 ||
    keyCode === 400 ||
    keyCode === 401 ||
    keyCode === 403 ||
    keyCode === 404 ||
    keyCode === 405 ||
    keyCode === 406 ||
    keyCode === 415
  );
}

function formatInputEvent(event) {
  const keyCode = event.keyCode ?? event.which ?? "";
  const code = event.code ?? "";
  const key = event.key ?? "";
  return `${code || "-"} / ${key || "-"} / ${keyCode || "-"}`;
}

function createTelegraphSteps(orders, parent) {
  if (!parent) return [];

  return orders.map((order, index) => {
    const step = document.createElement("div");
    step.className = `telegraph-step${order.speed === 0 ? " is-stop" : ""}`;
    step.textContent = order.shortLabel ?? order.label;
    step.dataset.order = String(index);
    parent.prepend(step);
    return step;
  });
}

function updateTelegraphSteps(steps, activeOrder) {
  steps.forEach((step, index) => {
    step.classList.toggle("is-active", index === activeOrder);
  });
}

function updateRudderGauge(indicator, valueElement, degrees) {
  const ratio = (degrees + maxRudderDegrees) / (maxRudderDegrees * 2);
  indicator?.style.setProperty("--rudder-ratio", String(ratio));

  if (valueElement) {
    const roundedDegrees = Math.round(degrees);
    const side = roundedDegrees < 0 ? "P" : roundedDegrees > 0 ? "S" : "";
    valueElement.textContent = side ? `${Math.abs(roundedDegrees)}° ${side}` : "0°";
  }
}

function updateNavigationInstruments(mapCanvas, radarCanvas, radarStatus, playerPosition, enemyPosition, landZones, heading) {
  drawMapInstrument(mapCanvas, playerPosition, landZones, mapZoom);
  drawRadarInstrument(radarCanvas, radarStatus, playerPosition, enemyPosition, landZones, heading);
}

function drawMapInstrument(canvas, playerPosition, landZones, zoomControl) {
  if (!canvas) return;

  const ctx = prepareInstrumentCanvas(canvas);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const zoomIndex = clamp(Number(zoomControl?.value ?? 1), 0, mapZoomScales.length - 1);
  const zoomScale = mapZoomScales[zoomIndex];
  const tile = getMapTile(playerPosition, zoomScale);
  const bounds = getMapTileBounds(tile, zoomScale);
  const scale = Math.min(width / (bounds.maxX - bounds.minX), height / (bounds.maxZ - bounds.minZ));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(7, 31, 43, 0.78)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(247, 251, 255, 0.14)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  landZones.filter((zone) => zoneIntersectsBounds(zone, bounds)).forEach((zone) => {
    drawMapLandZone(ctx, zone, bounds, width, height, scale);
  });

  const playerPoint = clampInstrumentPoint(worldToMapPoint(playerPosition, bounds, width, height, scale), width, height, 6);
  drawInstrumentMarker(ctx, playerPoint.x, playerPoint.y, "#f7fbff", 4);

  ctx.fillStyle = "rgba(247, 251, 255, 0.78)";
  ctx.font = "700 10px Inter, sans-serif";
  ctx.fillText(`Tile ${tile.x},${tile.z} x${zoomScale}`, 9, height - 22);
  ctx.fillText(formatWorldCoordinate(playerPosition), 9, height - 9);
}

function drawRadarInstrument(canvas, statusElement, playerPosition, enemyPosition, landZones, heading) {
  if (!canvas) return;

  const ctx = prepareInstrumentCanvas(canvas);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radius = Math.min(width, height) * 0.5 - 7;
  const radarRange = 360;
  const scale = radius / radarRange;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(2, 22, 28, 0.86)";
  ctx.fillRect(0, 0, width, height);

  drawRadarRangeRings(ctx, centerX, centerY, radius);
  landZones.forEach((zone) => drawRadarShadow(ctx, zone, playerPosition, heading, centerX, centerY, radius, radarRange));

  landZones.forEach((zone) => {
    drawRadarLandZone(ctx, zone, playerPosition, centerX, centerY, scale, heading);
  });

  const enemyDistance = enemyPosition ? distance2D(playerPosition, enemyPosition) : Infinity;
  const enemyBlocked = enemyPosition ? isLineBlockedByLand(playerPosition, enemyPosition, landZones) : false;
  if (enemyPosition && enemyDistance <= radarRange && !enemyBlocked) {
    const enemyPoint = worldToRadarPoint(enemyPosition, playerPosition, centerX, centerY, scale, heading);
    drawInstrumentMarker(ctx, enemyPoint.x, enemyPoint.y, "#d84a3a", 4);
    if (statusElement) statusElement.textContent = `Contact ${formatWorldDistance(enemyDistance)}`;
  } else if (enemyPosition && enemyDistance <= radarRange) {
    if (statusElement) statusElement.textContent = `Shadow ${formatWorldDistance(enemyDistance)}`;
  } else {
    if (statusElement) statusElement.textContent = `Clear ${formatWorldDistance(radarRange)}`;
  }

  drawInstrumentMarker(ctx, centerX, centerY, "#9be5df", 3);
  ctx.restore();

  ctx.strokeStyle = "rgba(155, 229, 223, 0.62)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function prepareInstrumentCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function worldToInstrumentPoint(position, origin, centerX, centerY, scale) {
  return {
    x: centerX + (position.x - origin.x) * scale,
    y: centerY - (position.z - origin.z) * scale
  };
}

function worldToMapPoint(position, bounds, width, height, scale) {
  const mapWidth = (bounds.maxX - bounds.minX) * scale;
  const mapHeight = (bounds.maxZ - bounds.minZ) * scale;
  const insetX = (width - mapWidth) * 0.5;
  const insetY = (height - mapHeight) * 0.5;

  return {
    x: insetX + (position.x - bounds.minX) * scale,
    y: insetY + (bounds.maxZ - position.z) * scale
  };
}

function worldToRadarPoint(position, origin, centerX, centerY, scale, heading) {
  const dx = position.x - origin.x;
  const dz = position.z - origin.z;
  const right = dx * Math.cos(heading) - dz * Math.sin(heading);
  const forward = dx * Math.sin(heading) + dz * Math.cos(heading);

  return {
    x: centerX + right * scale,
    y: centerY - forward * scale
  };
}

function drawInstrumentEllipse(ctx, x, y, rx, rz, fill, stroke, rotation = 0) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, rz), rotation, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawMapLandZone(ctx, zone, bounds, width, height, scale) {
  if (zone.kind !== "coastline") {
    const point = worldToMapPoint(zone, bounds, width, height, scale);
    drawInstrumentEllipse(ctx, point.x, point.y, getZoneVisualRx(zone) * scale, getZoneVisualRz(zone) * scale, "rgba(98, 129, 89, 0.95)", "rgba(238, 218, 164, 0.74)");
    return;
  }

  const points = getCoastContourPoints(zone, 96).map((point) => worldToMapPoint(point, bounds, width, height, scale));
  drawInstrumentPolygon(ctx, points, "rgba(98, 129, 89, 0.95)", "rgba(238, 218, 164, 0.78)");
  drawMapLandWater(ctx, zone, bounds, width, height, scale);
}

function drawRadarLandZone(ctx, zone, playerPosition, centerX, centerY, scale, heading) {
  if (zone.kind !== "coastline") {
    const point = worldToRadarPoint(zone, playerPosition, centerX, centerY, scale, heading);
    drawInstrumentEllipse(ctx, point.x, point.y, getZoneVisualRx(zone) * scale, getZoneVisualRz(zone) * scale, "rgba(96, 124, 83, 0.92)", "rgba(232, 217, 159, 0.4)", -heading);
    return;
  }

  const points = getCoastContourPoints(zone, 80).map((point) => worldToRadarPoint(point, playerPosition, centerX, centerY, scale, heading));
  drawInstrumentPolygon(ctx, points, "rgba(96, 124, 83, 0.92)", "rgba(232, 217, 159, 0.46)");
  drawRadarLandWater(ctx, zone, playerPosition, centerX, centerY, scale, heading);
}

function drawInstrumentPolygon(ctx, points, fill, stroke) {
  if (points.length < 3) return;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function getCoastContourPoints(zone, samples) {
  const points = [];

  for (let i = 0; i < samples; i += 1) {
    const angle = (i / samples) * Math.PI * 2;
    const factor = getCoastRadiusFactor(angle, zone);
    points.push({
      x: zone.x + Math.cos(angle) * getZoneVisualRx(zone) * factor,
      z: zone.z + Math.sin(angle) * getZoneVisualRz(zone) * factor
    });
  }

  return points;
}

function drawInstrumentMarker(ctx, x, y, color, radius) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function clampInstrumentPoint(point, width, height, padding) {
  return {
    x: clamp(point.x, padding, width - padding),
    y: clamp(point.y, padding, height - padding)
  };
}

function drawRadarRangeRings(ctx, centerX, centerY, radius) {
  ctx.strokeStyle = "rgba(155, 229, 223, 0.22)";
  ctx.lineWidth = 1;

  [0.33, 0.66, 1].forEach((ring) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * ring, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, centerY + radius);
  ctx.moveTo(centerX - radius, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.stroke();
}

function drawRadarShadow(ctx, zone, playerPosition, heading, centerX, centerY, radius, radarRange) {
  const dx = zone.x - playerPosition.x;
  const dz = zone.z - playerPosition.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const landRadius = Math.max(getZoneVisualRx(zone), getZoneVisualRz(zone)) * radarOcclusionScale;

  if (distance < 1 || distance - landRadius > radarRange) return;

  const centerAngle = Math.atan2(dx, dz) - heading;
  const halfAngle = Math.asin(clamp(landRadius / Math.max(distance, landRadius), 0, 0.95));
  const near = clamp((distance - landRadius) / radarRange, 0, 1) * radius;
  const start = centerAngle - halfAngle;
  const end = centerAngle + halfAngle;

  ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
  ctx.beginPath();
  ctx.moveTo(centerX + Math.sin(start) * near, centerY - Math.cos(start) * near);
  ctx.lineTo(centerX + Math.sin(start) * radius, centerY - Math.cos(start) * radius);
  ctx.arc(centerX, centerY, radius, start - Math.PI / 2, end - Math.PI / 2);
  ctx.lineTo(centerX + Math.sin(end) * near, centerY - Math.cos(end) * near);
  ctx.arc(centerX, centerY, near, end - Math.PI / 2, start - Math.PI / 2, true);
  ctx.closePath();
  ctx.fill();
}

function isLineBlockedByLand(from, to, landZones) {
  return landZones.some((zone) => lineIntersectsEllipse(from, to, zone));
}

function lineIntersectsEllipse(from, to, zone) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const ox = from.x - zone.x;
  const oz = from.z - zone.z;
  const rx = getZoneVisualRx(zone) * radarOcclusionScale;
  const rz = getZoneVisualRz(zone) * radarOcclusionScale;
  const a = (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz);
  const b = 2 * ((ox * dx) / (rx * rx) + (oz * dz) / (rz * rz));
  const c = (ox * ox) / (rx * rx) + (oz * oz) / (rz * rz) - 1;
  const discriminant = b * b - 4 * a * c;

  if (discriminant <= 0) return false;

  const root = Math.sqrt(discriminant);
  const t1 = (-b - root) / (2 * a);
  const t2 = (-b + root) / (2 * a);
  return (t1 > 0.02 && t1 < 0.98) || (t2 > 0.02 && t2 < 0.98);
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function formatWorldDistance(worldUnits) {
  const meters = worldUnits * worldMetersPerUnit;

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

function getMapTile(position, zoomScale = 1) {
  const size = mapTileSize * zoomScale;

  return {
    x: Math.floor((position.x + size * 0.5) / size),
    z: Math.floor((position.z + size * 0.5) / size)
  };
}

function getMapTileBounds(tile, zoomScale = 1) {
  const size = mapTileSize * zoomScale;
  const centerX = tile.x * size;
  const centerZ = tile.z * size;

  return {
    minX: centerX - size * 0.5,
    maxX: centerX + size * 0.5,
    minZ: centerZ - size * 0.5,
    maxZ: centerZ + size * 0.5
  };
}

function zoneIntersectsBounds(zone, bounds) {
  return (
    zone.x + getZoneVisualRx(zone) >= bounds.minX &&
    zone.x - getZoneVisualRx(zone) <= bounds.maxX &&
    zone.z + getZoneVisualRz(zone) >= bounds.minZ &&
    zone.z - getZoneVisualRz(zone) <= bounds.maxZ
  );
}

function formatWorldCoordinate(position) {
  const north = Math.round(position.z);
  const east = Math.round(position.x);
  const northLabel = north >= 0 ? `N ${String(north).padStart(4, "0")}` : `S ${String(Math.abs(north)).padStart(4, "0")}`;
  const eastLabel = east >= 0 ? `E ${String(east).padStart(4, "0")}` : `W ${String(Math.abs(east)).padStart(4, "0")}`;

  return `${northLabel} / ${eastLabel}`;
}

function getZoneVisualRx(zone) {
  return zone.visualRx ?? zone.rx;
}

function getZoneVisualRz(zone) {
  return zone.visualRz ?? zone.rz;
}

function getZoneShallowRx(zone) {
  return zone.shallowRx ?? zone.rx * 1.08;
}

function getZoneShallowRz(zone) {
  return zone.shallowRz ?? zone.rz * 1.08;
}

function createEnemyMotion(root, bowWake, heading, engineOrder) {
  return {
    root,
    bowWake,
    heading,
    speed: 0,
    turnVelocity: 0,
    rollImpulse: 0,
    engineOrder,
    rudder: 0,
    state: "active",
    sinkAge: 0,
    sinkSide: -1,
    sinkStartY: root.position.y,
    timers: []
  };
}

function startLocalEnemyEventSource(motion) {
  const events = [
    { delay: 1000, engineOrder: 3, rudder: 0.1 },
    { delay: 3600, engineOrder: 7, rudder: -0.2 },
    { delay: 7600, engineOrder: 3, rudder: -0.08 },
    { delay: 11600, engineOrder: 5, rudder: 0.22 },
    { delay: 15400, engineOrder: 2, rudder: 0 },
    { delay: 19000, engineOrder: 8, rudder: -0.18 },
    { delay: 22400, engineOrder: 3, rudder: -0.25 },
    { delay: 28600, engineOrder: 4, rudder: 0.16 },
    { delay: 34000, engineOrder: 3, rudder: 0 }
  ];

  events.forEach((event) => {
    const timer = window.setTimeout(() => {
      applyEnemyMotionEvent(motion, event);
    }, event.delay);
    motion.timers.push(timer);
  });
}

function applyEnemyMotionEvent(motion, event) {
  if (motion.state !== "active") return;

  if (Number.isInteger(event.engineOrder)) {
    motion.engineOrder = clamp(event.engineOrder, 0, engineOrders.length - 1);
  }

  if (Number.isFinite(event.rudder)) {
    motion.rudder = clamp(event.rudder, -1, 1);
  }
}

function updateEnemyMotion(motion, dt, time) {
  if (motion.state === "sunk") return;

  if (motion.state === "sinking") {
    updateEnemySinking(motion, dt, time);
    return;
  }

  const targetSpeed = engineOrders[motion.engineOrder].speed;
  const speedResponse = Math.abs(targetSpeed) > Math.abs(motion.speed) ? 0.58 : 0.78;
  motion.speed += (targetSpeed - motion.speed) * Math.min(1, dt * speedResponse);

  const turnStrength = motion.speed >= 0 ? 0.22 : -0.16;
  const targetTurnVelocity = motion.rudder * turnStrength * clamp(Math.abs(motion.speed) / 5.2, 0.12, 1);
  motion.turnVelocity += (targetTurnVelocity - motion.turnVelocity) * Math.min(1, dt * 1.5);
  motion.heading += motion.turnVelocity * dt;
  motion.rollImpulse += (0 - motion.rollImpulse) * Math.min(1, dt * 1.8);

  const forward = new Vector3(Math.sin(motion.heading), 0, Math.cos(motion.heading));
  motion.root.position.addInPlace(forward.scale(motion.speed * dt));
  motion.root.position.y = 0.28 + Math.sin(time * 1.6 + 1.9) * 0.04;
  motion.root.rotationQuaternion = Quaternion.FromEulerAngles(
    Math.sin(time * 1.9 + 0.8) * 0.015,
    motion.heading,
    -motion.turnVelocity * 0.42 + motion.rollImpulse + Math.sin(time * 1.4) * 0.01
  );
  updateEnemyBowWake(motion.bowWake, motion.speed, time);

  document.body.dataset.enemy = `${motion.root.position.x.toFixed(1)},${motion.root.position.z.toFixed(1)}`;
  document.body.dataset.enemyEngineOrder = engineOrders[motion.engineOrder].label;
  document.body.dataset.enemySpeed = motion.speed.toFixed(1);
}

function beginEnemySinking(motion, side, time) {
  if (motion.state !== "active") return;

  motion.state = "sinking";
  motion.sinkAge = 0;
  motion.sinkSide = side || -1;
  motion.sinkStartY = motion.root.position.y;
  motion.engineOrder = 0;
  motion.rudder = 0;
  motion.rollImpulse = motion.sinkSide * 0.5;
  motion.timers.forEach((timer) => window.clearTimeout(timer));
  motion.timers = [];
  updateEnemyBowWake(motion.bowWake, 0, time);
}

function updateEnemySinking(motion, dt, time) {
  motion.sinkAge += dt;
  motion.speed *= Math.max(0, 1 - dt * 1.55);
  motion.rollImpulse += (0 - motion.rollImpulse) * Math.min(1, dt * 1.2);

  const forward = new Vector3(Math.sin(motion.heading), 0, Math.cos(motion.heading));
  motion.root.position.addInPlace(forward.scale(motion.speed * dt));

  const t = clamp(motion.sinkAge / 5.2, 0, 1);
  const ease = easeInOutCubic(t);
  const roll = motion.sinkSide * (0.12 + ease * 1.45) + motion.rollImpulse;
  const pitch = -ease * 0.28 + Math.sin(time * 1.7) * (1 - t) * 0.025;
  motion.root.position.y = motion.sinkStartY - ease * 2.35 + Math.sin(time * 3.1) * (1 - t) * 0.035;
  motion.root.rotationQuaternion = Quaternion.FromEulerAngles(pitch, motion.heading, roll);
  updateEnemyBowWake(motion.bowWake, 0, time);

  if (t >= 1) {
    motion.state = "sunk";
    motion.root.setEnabled(false);
  }

  document.body.dataset.enemy = `${motion.root.position.x.toFixed(1)},${motion.root.position.z.toFixed(1)}`;
  document.body.dataset.enemyEngineOrder = "SUNK";
  document.body.dataset.enemySpeed = "0.0";
}

function getRadarEnemyPosition(enemyMotion) {
  return enemyMotion.state === "active" ? enemyMotion.root.position : null;
}

function updateEnemyBowWake(wake, speed, time) {
  if (!wake) return;

  const strength = clamp(Math.abs(speed) / 8, 0, 1);
  wake.root.setEnabled(strength > 0.08);

  wake.segments.forEach((segment, index) => {
    const pulse = 0.88 + Math.sin(time * 3.2 + index * 0.7) * 0.08;
    const visible = segment.metadata.row <= getVisibleWakeRows(strength);
    segment.setEnabled(visible);
    segment.scaling.x = 1.35 + strength * 1.85 + segment.metadata.row * 0.12;
    segment.scaling.z = (0.82 + strength * 0.62) * pulse;
    segment.position.y = -0.05 + Math.sin(time * 2.8 + index) * 0.005;
  });

  wake.churn.forEach((patch, index) => {
    const pulse = 0.75 + Math.sin(time * 4.1 + index * 1.7) * 0.16;
    patch.scaling.x = (0.65 + strength * 1.05) * pulse;
    patch.scaling.z = 0.55 + strength * 1.2;
    patch.position.y = -0.045 + Math.sin(time * 3.6 + index) * 0.006;
  });
}

function getVisibleWakeRows(strength) {
  if (strength >= 0.52) return 5;
  if (strength >= 0.38) return 4;
  if (strength >= 0.24) return 3;
  if (strength >= 0.12) return 2;
  return 1;
}

function createTorpedoSystem(scene, materials, parent) {
  const root = new TransformNode("torpedoes", scene);
  root.parent = parent;

  return {
    root,
    scene,
    materials,
    active: [],
    puffs: [],
    muzzleEffects: [],
    hitEffects: [],
    nextTube: 0,
    nextFireTime: 0,
    nextId: 1,
    hits: 0
  };
}

// A fired torpedo starts as a visible tube ejection, then becomes a simple straight-running weapon.
function firePlayerTorpedo(system, shipRoot, heading, turnVelocity, shipSpeed, now) {
  if (now < system.nextFireTime) return false;

  const tubeSide = system.nextTube === 0 ? -1 : 1;
  system.nextTube = 1 - system.nextTube;
  system.nextFireTime = now + 1.15;

  // Firing while turning is the normal attack maneuver. Aim very slightly into the current turn
  // so the shot feels tied to the tube direction, without making torpedoes steer after launch.
  const launchHeading = heading + clamp(turnVelocity, -0.42, 0.42) * 0.2;
  const forward = getForwardVector(launchHeading);
  const right = getRightVector(launchHeading);
  const tuning = torpedoLaunchDefaults;
  const tubeX = tubeSide * tuning.tubeX;
  const muzzleEffectX = tubeSide * 0.32;
  const tubeStartZ = tuning.startZ;
  const muzzleZ = 3.05;
  const launchStart = shipRoot.position
    .add(right.scale(tubeX))
    .add(forward.scale(tubeStartZ))
    .add(new Vector3(0, tuning.startY, 0));
  const muzzleEffectStart = shipRoot.position
    .add(right.scale(muzzleEffectX))
    .add(forward.scale(tubeStartZ))
    .add(new Vector3(0, tuning.startY, 0));
  const launchEnd = shipRoot.position
    .add(right.scale(tubeX))
    .add(forward.scale(muzzleZ + 0.32))
    .add(new Vector3(0, -0.04, 0));
  const muzzlePuffPoint = shipRoot.position
    .add(right.scale(muzzleEffectX))
    .add(forward.scale(muzzleZ + 0.4))
    .add(new Vector3(0, -0.04, 0));
  const runStart = shipRoot.position
    .add(right.scale(tubeX))
    .add(forward.scale(muzzleZ + 0.52))
    .add(new Vector3(0, 0.06, 0));

  const root = new TransformNode(`torpedo_${system.nextId}`, system.scene);
  root.parent = system.root;
  root.position.copyFrom(launchStart);
  root.rotationQuaternion = Quaternion.FromEulerAngles(0, launchHeading, 0);

  const body = MeshBuilder.CreateCylinder(`${root.name}_body`, {
    diameter: 0.2,
    height: 3.84,
    tessellation: 12
  }, system.scene);
  body.parent = root;
  body.rotation.x = Math.PI / 2;
  body.material = system.materials.funnel;

  const nose = MeshBuilder.CreateCylinder(`${root.name}_nose`, {
    diameterTop: 0.035,
    diameterBottom: 0.2,
    height: 0.36,
    tessellation: 12
  }, system.scene);
  nose.parent = root;
  nose.position.z = 2.1;
  nose.rotation.x = Math.PI / 2;
  nose.material = system.materials.funnel;

  const wake = createTorpedoWake(system.scene, system.materials, root.name);
  const torpedo = {
    id: system.nextId,
    root,
    body,
    wake,
    heading: launchHeading,
    forward,
    launchStart,
    launchEnd,
    runStart,
    age: 0,
    runDistance: 0,
    speed: 24 + Math.max(0, shipSpeed) * 0.35,
    // Keep launch nearly immediate so turning fire does not drag behind the player's aim.
    launchDuration: 0.2,
    maxRange: 620,
    hit: false
  };
  system.nextId += 1;
  system.active.push(torpedo);
  createLaunchPuff(system, muzzlePuffPoint, launchHeading, tubeSide);
  createMuzzleEffect(system, muzzleEffectStart, launchHeading, tubeSide);
  return true;
}

function createTorpedoWake(scene, materials, name) {
  const wake = [];

  for (let i = 0; i < 9; i += 1) {
    const segment = MeshBuilder.CreateBox(`${name}_wake_${i}`, {
      width: 0.08 + i * 0.018,
      height: 0.012,
      depth: 0.58 + i * 0.08
    }, scene);
    segment.material = materials.foam;
    segment.setEnabled(false);
    wake.push(segment);
  }

  return wake;
}

function createLaunchPuff(system, position, heading, tubeSide) {
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);

  for (let i = 0; i < 9; i += 1) {
    const patch = MeshBuilder.CreateBox(`torpedo_puff_${system.nextId}_${i}`, {
      width: 0.2 + i * 0.034,
      height: 0.018,
      depth: 0.28 + i * 0.05
    }, system.scene);
    patch.parent = system.root;
    patch.material = system.materials.foam;
    patch.position.copyFrom(
      position
        .add(forward.scale(i * 0.08))
        .add(right.scale(tubeSide * (0.01 + i * 0.012)))
        .add(new Vector3(0, -0.02, 0))
    );
    patch.rotation.y = heading;
    system.puffs.push({ mesh: patch, age: 0, lifetime: 0.52 + i * 0.035, seed: i });
  }
}

function createMuzzleEffect(system, position, heading, tubeSide) {
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);

  const ring = MeshBuilder.CreateTorus(`torpedo_muzzle_ring_${system.nextId}`, {
    diameter: 0.42,
    thickness: 0.045,
    tessellation: 16
  }, system.scene);
  ring.parent = system.root;
  ring.material = system.materials.foam;
  ring.position.copyFrom(position.add(forward.scale(0.28)).add(new Vector3(0, 0.02, 0)));
  ring.rotation.x = Math.PI / 2;
  ring.rotation.y = heading;
  system.muzzleEffects.push({ mesh: ring, age: 0, lifetime: 0.32, seed: 0, kind: "ring" });

  for (let i = 0; i < 4; i += 1) {
    const jet = MeshBuilder.CreateBox(`torpedo_muzzle_jet_${system.nextId}_${i}`, {
      width: 0.09 + i * 0.02,
      height: 0.018,
      depth: 0.34 + i * 0.08
    }, system.scene);
    jet.parent = system.root;
    jet.material = system.materials.foam;
    jet.position.copyFrom(
      position
        .add(forward.scale(0.18 + i * 0.16))
        .add(right.scale(tubeSide * (0.006 + i * 0.008)))
        .add(new Vector3(0, 0.0, 0))
    );
    jet.rotation.y = heading;
    system.muzzleEffects.push({ mesh: jet, age: 0, lifetime: 0.22 + i * 0.05, seed: i + 1, kind: "jet" });
  }
}

function updateTorpedoSystem(system, dt, time, enemyMotion, landZones) {
  system.hitEffects = system.hitEffects.filter((effect) => {
    effect.age += dt;
    const t = effect.age / effect.lifetime;
    if (t >= 1) {
      effect.mesh.dispose();
      return false;
    }

    const eased = easeOutCubic(t);
    effect.mesh.position.x = effect.origin.x + effect.velocity.x * t;
    effect.mesh.position.z = effect.origin.z + effect.velocity.z * t;
    effect.mesh.position.y = effect.origin.y + effect.velocity.y * t - effect.gravity * t * t + Math.sin(time * 9 + effect.seed) * 0.01;
    effect.mesh.scaling.x = effect.baseScale.x * (1 + eased * effect.grow.x);
    effect.mesh.scaling.y = effect.baseScale.y * (1 + eased * effect.grow.y);
    effect.mesh.scaling.z = effect.baseScale.z * (1 + eased * effect.grow.z);
    effect.mesh.setEnabled(t < 0.96);
    return true;
  });

  system.muzzleEffects = system.muzzleEffects.filter((effect) => {
    effect.age += dt;
    const t = effect.age / effect.lifetime;
    if (t >= 1) {
      effect.mesh.dispose();
      return false;
    }
    const scale = effect.kind === "ring" ? 1 + t * 1.7 : 1 + t * 0.8;
    effect.mesh.scaling.x = scale;
    effect.mesh.scaling.y = scale;
    effect.mesh.scaling.z = scale;
    effect.mesh.position.y += dt * (effect.kind === "ring" ? 0.04 : -0.02);
    effect.mesh.setEnabled(t < 0.92);
    return true;
  });

  system.puffs = system.puffs.filter((puff) => {
    puff.age += dt;
    const t = puff.age / puff.lifetime;
    if (t >= 1) {
      puff.mesh.dispose();
      return false;
    }
    const pulse = 1 + t * 2.6;
    puff.mesh.scaling.x = pulse;
    puff.mesh.scaling.z = pulse * (1.1 + puff.seed * 0.04);
    puff.mesh.position.y = 0.06 + Math.sin(time * 10 + puff.seed) * 0.006;
    puff.mesh.setEnabled(t < 0.94);
    return true;
  });

  system.active = system.active.filter((torpedo) => {
    torpedo.age += dt;

    // Keep the first frames close to the launcher so the shot reads as coming out of the tube.
    if (torpedo.age < torpedo.launchDuration) {
      const t = easeOutCubic(torpedo.age / torpedo.launchDuration);
      torpedo.root.position.copyFrom(Vector3.Lerp(torpedo.launchStart, torpedo.launchEnd, t));
      updateTorpedoWake(torpedo, false, time);
      return true;
    }

    if (torpedo.runDistance === 0) {
      torpedo.root.position.copyFrom(torpedo.runStart);
    }

    const step = torpedo.speed * dt;
    torpedo.root.position.addInPlace(torpedo.forward.scale(step));
    torpedo.root.position.y = 0.05 + Math.sin(time * 7.5 + torpedo.id) * 0.012;
    torpedo.runDistance += step;
    updateTorpedoWake(torpedo, true, time);

    if (!torpedo.hit && torpedoHitsEnemy(torpedo.root.position, enemyMotion)) {
      torpedo.hit = true;
      system.hits += 1;
      beginEnemySinking(enemyMotion, getEnemySinkSide(torpedo.root.position, enemyMotion), time);
      createHitChurn(system, torpedo.root.position, torpedo.heading);
      disposeTorpedo(torpedo);
      return false;
    }

    if (!torpedo.hit && torpedoHitsLand(torpedo.root.position, landZones)) {
      torpedo.hit = true;
      system.hits += 1;
      createHitChurn(system, torpedo.root.position, torpedo.heading);
      disposeTorpedo(torpedo);
      return false;
    }

    if (torpedo.runDistance > torpedo.maxRange) {
      disposeTorpedo(torpedo);
      return false;
    }

    return true;
  });
}

function torpedoHitsLand(torpedoPosition, landZones) {
  return landZones.some((zone) => {
    if (isInLandWater(torpedoPosition, zone)) return false;

    const rx = getZoneVisualRx(zone) + 0.35;
    const rz = getZoneVisualRz(zone) + 0.35;
    const nx = (torpedoPosition.x - zone.x) / rx;
    const nz = (torpedoPosition.z - zone.z) / rz;
    return nx * nx + nz * nz <= 1;
  });
}

function getPlayerRamHit(playerPosition, playerHeading, playerSpeed, enemyMotion, time) {
  if (time < nextRamHitTime || playerSpeed < 2.2) return null;

  const forward = getForwardVector(playerHeading);
  const right = getRightVector(playerHeading);
  const bowCenter = playerPosition.add(forward.scale(4.45));
  const bowProbePoints = [
    bowCenter,
    bowCenter.add(right.scale(0.34)),
    bowCenter.add(right.scale(-0.34))
  ];

  const hitPoint = bowProbePoints.find((point) => pointHitsEnemyHull(point, enemyMotion, 0.16));
  if (!hitPoint) return null;

  const enemyLocalHit = getEnemyHitLocalPoint(hitPoint, enemyMotion.root.position, enemyMotion.heading);
  return {
    position: hitPoint,
    side: enemyLocalHit.right >= 0 ? -1 : 1
  };
}

function getRamShakeOffset(heading, strength, time) {
  if (strength <= 0.001) return Vector3.Zero();

  const right = getRightVector(heading);
  const pulse = Math.sin(time * 42) * strength;
  return right.scale(pulse * 0.08).add(new Vector3(0, strength * 0.035, 0));
}

function torpedoHitsEnemy(torpedoPosition, enemyMotion) {
  return pointHitsEnemyHull(torpedoPosition, enemyMotion, 0.22);
}

function pointHitsEnemyHull(point, enemyMotion, radius) {
  if (enemyMotion.state !== "active") return false;

  const hit = getEnemyHitLocalPoint(point, enemyMotion.root.position, enemyMotion.heading);
  const stern = -4.05;
  const bow = 4.45;
  const lengthPadding = 0.18;

  if (hit.forward < stern - lengthPadding || hit.forward > bow + lengthPadding) {
    return false;
  }

  const halfWidth = getEnemyHullHalfWidthAt(hit.forward) + radius;
  return Math.abs(hit.right) <= halfWidth;
}

function getEnemySinkSide(point, enemyMotion) {
  const hit = getEnemyHitLocalPoint(point, enemyMotion.root.position, enemyMotion.heading);
  return hit.right >= 0 ? -1 : 1;
}

function getEnemyHitLocalPoint(point, enemyPosition, enemyHeading) {
  const dx = point.x - enemyPosition.x;
  const dz = point.z - enemyPosition.z;

  return {
    right: dx * Math.cos(enemyHeading) - dz * Math.sin(enemyHeading),
    forward: dx * Math.sin(enemyHeading) + dz * Math.cos(enemyHeading)
  };
}

function getEnemyHullHalfWidthAt(forward) {
  const sections = [
    { z: -4.05, halfWidth: 0.39 },
    { z: -2.3, halfWidth: 0.61 },
    { z: 1.55, halfWidth: 0.66 },
    { z: 3.25, halfWidth: 0.31 },
    { z: 4.45, halfWidth: 0.04 }
  ];

  if (forward <= sections[0].z) return sections[0].halfWidth;

  for (let i = 0; i < sections.length - 1; i += 1) {
    const current = sections[i];
    const next = sections[i + 1];
    if (forward <= next.z) {
      const t = (forward - current.z) / (next.z - current.z);
      return current.halfWidth + (next.halfWidth - current.halfWidth) * t;
    }
  }

  return sections[sections.length - 1].halfWidth;
}

function updateTorpedoWake(torpedo, visible, time) {
  torpedo.wake.forEach((segment, index) => {
    segment.setEnabled(visible && index * 0.8 < torpedo.runDistance);
    if (!visible) return;

    const distanceBehind = 0.72 + index * 0.58;
    segment.position.copyFrom(
      torpedo.root.position
        .subtract(torpedo.forward.scale(distanceBehind))
        .add(new Vector3(0, -0.035, 0))
    );
    segment.rotation.y = torpedo.heading + Math.sin(time * 3.2 + index) * 0.035;
    segment.scaling.x = 1 + index * 0.16;
    segment.scaling.z = 1 + Math.sin(time * 4.5 + index) * 0.08;
  });
}

function createHitChurn(system, position, heading) {
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);

  for (let i = 0; i < 4; i += 1) {
    const wall = createJaggedHitWall(`torpedo_hit_wall_${system.hits}_${i}`, system.scene, 1.0 + i * 0.28, 1.35 + i * 0.32, i);
    wall.parent = system.root;
    wall.material = system.materials.foam;
    wall.position.copyFrom(position.add(forward.scale(i * 0.06)).add(new Vector3(0, 0.45 + i * 0.12, 0)));
    wall.rotation.y = heading + i * 0.74;
    system.hitEffects.push({
      mesh: wall,
      age: 0,
      lifetime: 0.72 + i * 0.08,
      origin: wall.position.clone(),
      velocity: new Vector3(0, 0.42 + i * 0.12, 0),
      gravity: 0.28 + i * 0.05,
      baseScale: wall.scaling.clone(),
      grow: new Vector3(0.55 + i * 0.1, 0.28 + i * 0.05, 0.55 + i * 0.1),
      seed: i
    });
  }

  for (let i = 0; i < 6; i += 1) {
    const surface = createJaggedSurfacePatch(`torpedo_hit_surface_${system.hits}_${i}`, system.scene, 0.85 + i * 0.28, 0.62 + i * 0.18, i);
    surface.parent = system.root;
    surface.material = system.materials.foam;
    surface.position.copyFrom(position.add(forward.scale((i - 2) * 0.08)).add(right.scale(((i % 3) - 1) * 0.12)).add(new Vector3(0, 0.055 + i * 0.002, 0)));
    surface.rotation.y = heading + i * 0.43;
    system.hitEffects.push({
      mesh: surface,
      age: 0,
      lifetime: 1.18 + i * 0.06,
      origin: surface.position.clone(),
      velocity: forward.scale(-0.04 * i).add(right.scale(((i % 2) * 2 - 1) * 0.08)).add(new Vector3(0, 0.02, 0)),
      gravity: 0.03,
      baseScale: surface.scaling.clone(),
      grow: new Vector3(2.1 + i * 0.25, 0.12, 1.5 + i * 0.18),
      seed: i + 20
    });
  }

  for (let i = 0; i < 18; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    const spray = createJaggedHitWall(`torpedo_hit_spray_${system.hits}_${i}`, system.scene, 0.24 + row * 0.03, 0.46 + row * 0.06, i + 10);
    spray.parent = system.root;
    spray.material = system.materials.foam;
    spray.position.copyFrom(position.add(right.scale(side * (0.2 + row * 0.13))).subtract(forward.scale(row * 0.07)).add(new Vector3(0, 0.18 + row * 0.035, 0)));
    spray.rotation.y = heading + side * (0.82 + row * 0.06);
    system.hitEffects.push({
      mesh: spray,
      age: 0,
      lifetime: 0.92 + row * 0.04,
      origin: spray.position.clone(),
      velocity: right.scale(side * (0.62 + row * 0.12)).add(forward.scale(-0.14 - row * 0.035)).add(new Vector3(0, 0.46 + row * 0.045, 0)),
      gravity: 0.52,
      baseScale: spray.scaling.clone(),
      grow: new Vector3(0.9 + row * 0.08, 0.38, 0.65 + row * 0.06),
      seed: i + 10
    });
  }
}

function createJaggedHitWall(name, scene, width, height, seed) {
  const positions = [0, 0, 0];
  const indices = [];
  const points = 14;

  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const jag = 0.74 + pseudoRandom(seed + i, 151) * 0.48;
    const x = Math.cos(angle) * width * 0.5 * jag;
    const y = Math.sin(angle) * height * 0.5 * (0.82 + pseudoRandom(seed + i, 163) * 0.36);
    positions.push(x, y, 0);
  }

  for (let i = 1; i <= points; i += 1) {
    indices.push(0, i, i === points ? 1 : i + 1);
  }

  return createMeshFromData(name, scene, positions, indices);
}

function createJaggedSurfacePatch(name, scene, width, depth, seed) {
  const positions = [0, 0, 0];
  const indices = [];
  const points = 18;

  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const jag = 0.62 + pseudoRandom(seed + i, 181) * 0.68;
    const x = Math.cos(angle) * width * 0.5 * jag;
    const z = Math.sin(angle) * depth * 0.5 * (0.7 + pseudoRandom(seed + i, 193) * 0.6);
    positions.push(x, 0, z);
  }

  for (let i = 1; i <= points; i += 1) {
    indices.push(0, i, i === points ? 1 : i + 1);
  }

  return createMeshFromData(name, scene, positions, indices);
}

function disposeTorpedo(torpedo) {
  torpedo.wake.forEach((segment) => segment.dispose());
  torpedo.root.getChildMeshes().forEach((mesh) => mesh.dispose());
  torpedo.root.dispose();
}

function getForwardVector(heading) {
  return new Vector3(Math.sin(heading), 0, Math.cos(heading));
}

function getRightVector(heading) {
  return new Vector3(Math.cos(heading), 0, -Math.sin(heading));
}

function easeOutCubic(value) {
  const t = clamp(value, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(value) {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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

  const foam = new StandardMaterial("foam_material", scene);
  foam.diffuseColor = new Color3(0.9, 0.97, 0.96);
  foam.emissiveColor = new Color3(0.18, 0.22, 0.22);
  foam.specularColor = new Color3(0.05, 0.06, 0.06);

  return { water, sand, grass, terrain, shallow, rock, hull, deck, cabin, funnel, glass, foam };
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

// Cheap open-sea orientation markers: opaque low-poly streaks recycled around the player.
// Avoid transparency and particles here because both can be fragile on TV WebGL implementations.
function createFoamPatches(scene, materials, parent) {
  const root = new TransformNode("foam_patches", scene);
  root.parent = parent;

  const patches = [];
  const area = 180;
  const count = 128;
  const windAngle = Math.PI * 0.56;

  for (let i = 0; i < count; i += 1) {
    const seed = seededFoam(i);
    const patch = MeshBuilder.CreateBox(`foam_patch_${i}`, {
      width: 0.025 + seed.width * 0.018,
      height: 0.012,
      depth: 0.42 + seed.length * 0.85
    }, scene);
    patch.parent = root;
    patch.material = materials.foam;
    patch.position.y = 0.13 + seed.lift * 0.025;
    patch.rotation.y = windAngle;
    patch.scaling.x = 1 + seed.width * 0.55;
    patches.push({
      mesh: patch,
      x: (seed.x - 0.5) * area,
      z: (seed.z - 0.5) * area,
      driftX: Math.sin(windAngle) * (0.12 + seed.driftX * 0.08),
      driftZ: Math.cos(windAngle) * (0.12 + seed.driftZ * 0.08),
      baseAngle: windAngle
    });
  }

  return { area, patches };
}

function updateFoamPatches(foam, center, time) {
  const halfArea = foam.area / 2;

  foam.patches.forEach((patch) => {
    patch.mesh.position.x = center.x + wrapCentered(patch.x + time * patch.driftX - center.x, foam.area);
    patch.mesh.position.z = center.z + wrapCentered(patch.z + time * patch.driftZ - center.z, foam.area);
    patch.mesh.position.y = 0.13 + Math.sin(time * 0.9 + patch.x * 0.07 + patch.z * 0.03) * 0.012;
    patch.mesh.rotation.y = patch.baseAngle;

    const distanceFromCenter = Math.max(
      Math.abs(patch.mesh.position.x - center.x),
      Math.abs(patch.mesh.position.z - center.z)
    );
    patch.mesh.setEnabled(distanceFromCenter < halfArea - 8);
  });
}

function seededFoam(index) {
  return {
    x: pseudoRandom(index, 11),
    z: pseudoRandom(index, 23),
    width: pseudoRandom(index, 37),
    length: pseudoRandom(index, 41),
    lift: pseudoRandom(index, 53),
    angle: pseudoRandom(index, 61) * Math.PI,
    driftX: pseudoRandom(index, 71),
    driftZ: pseudoRandom(index, 83),
    spin: pseudoRandom(index, 97)
  };
}

function pseudoRandom(index, salt) {
  return fract(Math.sin(index * 91.17 + salt * 13.91) * 43758.5453);
}

function fract(value) {
  return value - Math.floor(value);
}

function wrapCentered(value, size) {
  return ((((value + size / 2) % size) + size) % size) - size / 2;
}

// Player ship is only the visible foredeck. Enemy ships should get their own full model later.
// A shared Ship base class would be premature until network interpolation and combat state exist.
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
  createRailSegment(`${name}_bow_rail_left_b`, scene, materials.hull, root, -0.2, 3.9, 0, 4.58, 0.76);
  createRailSegment(`${name}_bow_rail_right_a`, scene, materials.hull, root, 0.58, 2.15, 0.46, 3.02, 0.76);
  createRailSegment(`${name}_bow_rail_right_b`, scene, materials.hull, root, 0.2, 3.9, 0, 4.58, 0.76);

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

// Low-poly external ship model for opponents. Keep it cheap: enemies may appear in groups later.
function createEnemyTorpedoBoat(scene, materials, name = "enemy_boat") {
  const root = new TransformNode(name, scene);

  const body = createEnemyBoatBody(`${name}_body`, scene);
  body.parent = root;
  body.material = materials.hull;

  const bridgeBase = MeshBuilder.CreateBox(`${name}_bridge_base`, { width: 0.96, height: 0.28, depth: 1.05 }, scene);
  bridgeBase.parent = root;
  bridgeBase.position.y = 0.75;
  bridgeBase.position.z = 0.55;
  bridgeBase.material = materials.cabin;

  const bridge = MeshBuilder.CreateBox(`${name}_bridge`, { width: 0.74, height: 0.48, depth: 0.72 }, scene);
  bridge.parent = root;
  bridge.position.y = 1.06;
  bridge.position.z = 0.76;
  bridge.material = materials.cabin;

  const window = MeshBuilder.CreateBox(`${name}_window`, { width: 0.58, height: 0.11, depth: 0.035 }, scene);
  window.parent = root;
  window.position.y = 1.17;
  window.position.z = 1.13;
  window.material = materials.glass;

  const funnelBase = MeshBuilder.CreateBox(`${name}_funnel_base`, { width: 0.72, height: 0.22, depth: 0.58 }, scene);
  funnelBase.parent = root;
  funnelBase.position.y = 0.76;
  funnelBase.position.z = 0.0;
  funnelBase.material = materials.cabin;

  const funnel = MeshBuilder.CreateCylinder(`${name}_funnel`, {
    diameter: 0.36,
    height: 0.98,
    tessellation: 10
  }, scene);
  funnel.parent = root;
  funnel.position.y = 1.33;
  funnel.position.z = 0.0;
  funnel.material = materials.funnel;

  for (let i = 0; i < 2; i += 1) {
    const tube = MeshBuilder.CreateCylinder(`${name}_tube_${i}`, {
      diameter: 0.15,
      height: 1.75,
      tessellation: 10
    }, scene);
    tube.parent = root;
    tube.position.x = i === 0 ? -0.31 : 0.31;
    tube.position.y = 0.76;
    tube.position.z = 1.65;
    tube.rotation.x = Math.PI / 2;
    tube.material = materials.funnel;
  }

  const mast = MeshBuilder.CreateCylinder(`${name}_mast`, {
    diameter: 0.045,
    height: 1.35,
    tessellation: 6
  }, scene);
  mast.parent = root;
  mast.position.y = 1.66;
  mast.position.z = 0.32;
  mast.rotation.x = -0.16;
  mast.material = materials.funnel;

  const bowWake = createEnemyBowWake(scene, materials, root, name);

  return { root, bowWake };
}

function createEnemyBowWake(scene, materials, parent, name) {
  const root = new TransformNode(`${name}_bow_wake`, scene);
  root.parent = parent;

  const segments = [];
  const churn = [];

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 5; i += 1) {
      const startX = side * (0.22 + i * 0.1);
      const startZ = 4.48 - i * 0.12;
      const endX = side * (1.1 + i * 0.5);
      const endZ = 3.76 - i * 0.38;
      const segment = createWakeRibbon(`${name}_bow_wake_${side}_${i}`, scene, materials.foam, root, startX, startZ, endX, endZ);
      segment.metadata = { row: i + 1 };
      segments.push(segment);
    }
  }

  for (let i = 0; i < 4; i += 1) {
    const patch = MeshBuilder.CreateBox(`${name}_bow_churn_${i}`, {
      width: 0.32 + (i % 2) * 0.14,
      height: 0.014,
      depth: 0.34 + i * 0.08
    }, scene);
    patch.parent = root;
    patch.material = materials.foam;
    patch.position.x = (i - 1.5) * 0.12;
    patch.position.y = -0.045;
    patch.position.z = 4.54 + i * 0.05;
    patch.rotation.y = -0.28 + i * 0.18;
    churn.push(patch);
  }

  root.setEnabled(false);
  return { root, segments, churn };
}

function createWakeRibbon(name, scene, material, parent, startX, startZ, endX, endZ) {
  const dx = endX - startX;
  const dz = endZ - startZ;
  const length = Math.sqrt(dx * dx + dz * dz);
  const ribbon = MeshBuilder.CreateBox(name, {
    width: 0.07,
    height: 0.012,
    depth: length
  }, scene);
  ribbon.parent = parent;
  ribbon.material = material;
  ribbon.position.x = (startX + endX) / 2;
  ribbon.position.y = -0.05;
  ribbon.position.z = (startZ + endZ) / 2;
  ribbon.rotation.y = Math.atan2(dx, dz);
  return ribbon;
}

function createEnemyBoatBody(name, scene) {
  const sections = [
    { z: -4.05, topWidth: 0.78, chineWidth: 0.62, top: 0.52, chine: 0.24, keel: 0.02 },
    { z: -2.3, topWidth: 1.22, chineWidth: 1.02, top: 0.66, chine: 0.2, keel: -0.03 },
    { z: 1.55, topWidth: 1.32, chineWidth: 1.05, top: 0.68, chine: 0.18, keel: -0.04 },
    { z: 3.25, topWidth: 0.62, chineWidth: 0.42, top: 0.56, chine: 0.14, keel: -0.02 },
    { z: 4.45, topWidth: 0.08, chineWidth: 0.04, top: 0.43, chine: 0.11, keel: 0.02 }
  ];
  const positions = [];
  const indices = [];

  sections.forEach((section) => {
    const top = section.topWidth / 2;
    const chine = section.chineWidth / 2;
    positions.push(
      -top, section.top, section.z,
      top, section.top, section.z,
      -chine, section.chine, section.z,
      chine, section.chine, section.z,
      0, section.keel, section.z
    );
  });

  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = i * 5;
    const b = (i + 1) * 5;
    pushQuad(indices, a, b, b + 1, a + 1); // deck
    pushQuad(indices, a, a + 2, b + 2, b); // port side
    pushQuad(indices, a + 1, b + 1, b + 3, a + 3); // starboard side
    pushQuad(indices, a + 2, a + 4, b + 4, b + 2); // port bottom
    pushQuad(indices, a + 3, b + 3, b + 4, a + 4); // starboard bottom
  }

  indices.push(0, 2, 4, 0, 4, 3, 0, 3, 1);
  const last = (sections.length - 1) * 5;
  indices.push(last, last + 4, last + 2, last, last + 3, last + 4, last, last + 1, last + 3);

  return createMeshFromData(name, scene, positions, indices);
}

// Legacy full-ship prototype kept only for comparison while the enemy model evolves.
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

function createWorldLandmasses(landmasses, scene, materials, parent) {
  landmasses.forEach((land) => {
    const position = new Vector3(land.x, 0, land.z);

    if (land.kind === "coastline") {
      createCoastline(land, position, scene, materials, parent);
      createWaterways(land, position, scene, materials, parent);
    } else {
      createIsland(land.name, position, land.radius, land.heightScale, scene, materials, parent);
    }
  });
}

function getLandZone(land) {
  const navigationScale = land.kind === "island" ? 0.58 : 1;
  const shallowScale = land.kind === "island" ? 0.9 : 1.12;
  const coastPadding = land.kind === "coastline" ? 1 + (land.coastRoughness ?? 0.09) * 1.05 : 1;

  return {
    x: land.x,
    z: land.z,
    rx: land.rx * navigationScale * coastPadding,
    rz: land.rz * navigationScale * coastPadding,
    visualRx: land.rx * coastPadding,
    visualRz: land.rz * coastPadding,
    shallowRx: land.rx * shallowScale * coastPadding,
    shallowRz: land.rz * shallowScale * coastPadding,
    name: land.name,
    kind: land.kind,
    coastRoughness: land.coastRoughness ?? 0.09,
    fjords: land.fjords ?? [],
    waterways: land.waterways ?? [],
    lakes: land.lakes ?? []
  };
}

function createCoastline(land, position, scene, materials, parent) {
  const { name, rx, rz } = land;
  const heightScale = land.heightScale ?? 1;
  const peakBoost = land.peakBoost ?? 0;

  const beach = createCoastlineBeachMesh(`${name}_beach`, land, rx, rz, scene);
  beach.parent = parent;
  beach.position = position;
  beach.material = materials.sand;

  const terrain = createCoastlineTerrainMesh(`${name}_terrain`, land, rx, rz, heightScale, peakBoost, scene);
  terrain.parent = parent;
  terrain.position = position;
  terrain.material = materials.terrain;
}

function createWaterways(land, position, scene, materials, parent) {
  (land.waterways ?? []).forEach((waterway, index) => {
    const segment = createWaterwaySegment(`${land.name}_waterway_${index}`, waterway, scene);
    segment.parent = parent;
    segment.position.x += position.x;
    segment.position.z += position.z;
    segment.material = materials.shallow;
  });

  (land.lakes ?? []).forEach((lake, index) => {
    const mesh = MeshBuilder.CreateCylinder(`${land.name}_lake_${index}`, {
      diameter: 2,
      height: 0.018,
      tessellation: 36
    }, scene);
    mesh.parent = parent;
    mesh.position = new Vector3(position.x + lake.x, 0.585, position.z + lake.z);
    mesh.scaling.x = lake.rx;
    mesh.scaling.z = lake.rz;
    mesh.material = materials.shallow;
  });
}

function createWaterwaySegment(name, waterway, scene) {
  const dx = waterway.to.x - waterway.from.x;
  const dz = waterway.to.z - waterway.from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const segment = MeshBuilder.CreateBox(name, {
    width: waterway.width,
    height: 0.018,
    depth: length
  }, scene);

  segment.position.x = (waterway.from.x + waterway.to.x) * 0.5;
  segment.position.y = 0.58;
  segment.position.z = (waterway.from.z + waterway.to.z) * 0.5;
  segment.rotation.y = Math.atan2(dx, dz);
  return segment;
}

function createCoastlineTerrainMesh(name, land, rx, rz, heightScale, peakBoost, scene) {
  const mesh = new Mesh(name, scene);
  const positions = [];
  const indices = [];
  const normals = [];
  const rings = [0, 0.22, 0.42, 0.6, 0.74, 0.86, 0.98];
  const samples = 112;
  const mask = [];

  rings.forEach((ring) => {
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      const radiusFactor = getCoastRadiusFactor(angle, land);
      const localX = Math.cos(angle) * rx * ring * radiusFactor;
      const localZ = Math.sin(angle) * rz * ring * radiusFactor;
      const fjord = getFjordCarve(localX, localZ, rx, rz, land.fjords ?? []);
      const terrainFjord = fjord * smoothstep(0.62, 0.95, ring);
      const inlandWater = isInLocalLandWater(localX, localZ, land);
      const coast = 1 - smoothstep(0.58, 0.96, ring);
      const inland = clamp(1 - ring, 0, 1);
      const nx = localX / rx;
      const nz = localZ / rz;
      const ridgeA = Math.sin(localX * 0.065 + localZ * 0.035) * 0.5 + 0.5;
      const ridgeB = Math.sin(localX * -0.028 + localZ * 0.082 + 2.4) * 0.5 + 0.5;
      const roughness = terrainNoise(localX, localZ);
      const cliffLift = smoothstep(0.68, 0.9, ring) * smoothstep(1.04, 0.86, ring) * 5.5;
      const mountainLift = Math.pow(inland, 0.65) * (9 + ridgeA * 10 + ridgeB * 5) * heightScale;
      const peakLift = getPeakLift(nx, nz, ring, peakBoost, land);
      const isLand = ring <= 0.98 && terrainFjord <= 0.58;
      const shoreBlend = 1 - smoothstep(0.9, 0.98, ring);
      const terrainHeight = 0.28 + shoreBlend * (
        0.2 + coast * (cliffLift + mountainLift + peakLift + roughness * 3.2) * (1 - terrainFjord * 0.25)
      );

      positions.push(
        localX,
        isLand ? (inlandWater ? 0.24 : terrainHeight) : 0.18,
        localZ
      );
      mask.push(isLand);
    }
  });

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let i = 0; i < samples; i += 1) {
      const next = (i + 1) % samples;
      const a = ring * samples + i;
      const b = ring * samples + next;
      const c = (ring + 1) * samples + i;
      const d = (ring + 1) * samples + next;

      if (mask[a] && mask[c] && mask[b]) indices.push(a, c, b);
      if (mask[b] && mask[c] && mask[d]) indices.push(b, c, d);
    }
  }

  VertexData.ComputeNormals(positions, indices, normals);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.applyToMesh(mesh);
  return mesh;
}

function createCoastlineBeachMesh(name, land, rx, rz, scene) {
  const mesh = new Mesh(name, scene);
  const positions = [];
  const indices = [];
  const normals = [];
  const rings = [0.86, 0.96, 1.06];
  const samples = 112;
  const mask = [];

  rings.forEach((ring) => {
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      const radiusFactor = getCoastRadiusFactor(angle, land);
      const localX = Math.cos(angle) * rx * ring * radiusFactor;
      const localZ = Math.sin(angle) * rz * ring * radiusFactor;
      const fjord = getFjordCarve(localX, localZ, rx, rz, land.fjords ?? []);
      const sandBand = 1 - smoothstep(0.78, 1.08, ring);
      const isSand = fjord <= 0.58;

      positions.push(localX, isSand ? 0.24 + sandBand * 0.08 : 0.16, localZ);
      mask.push(isSand);
    }
  });

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let i = 0; i < samples; i += 1) {
      const next = (i + 1) % samples;
      const a = ring * samples + i;
      const b = ring * samples + next;
      const c = (ring + 1) * samples + i;
      const d = (ring + 1) * samples + next;

      if (mask[a] && mask[c] && mask[b]) indices.push(a, c, b);
      if (mask[b] && mask[c] && mask[d]) indices.push(b, c, d);
    }
  }

  VertexData.ComputeNormals(positions, indices, normals);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.applyToMesh(mesh);
  return mesh;
}

function createIsland(name, position, radius, heightScale, scene, materials, parent) {
  const islandRoot = new TransformNode(name, scene);
  islandRoot.position = position;
  islandRoot.parent = parent;

  createRockFoamRing(`${name}_foam`, radius, scene, materials, islandRoot);

  const stackCount = Math.max(3, Math.min(4, Math.round(radius / 7)));
  for (let i = 0; i < stackCount; i += 1) {
    const angle = radius * 0.18 + i * 1.85;
    const distance = i === 0 ? 0 : radius * (0.12 + i * 0.045);
    const height = radius * (0.62 + i * 0.11) * heightScale;
    const baseDiameter = radius * (0.44 - i * 0.045);
    const stack = MeshBuilder.CreateCylinder(`${name}_rock_stack_${i}`, {
      diameterTop: baseDiameter * 0.18,
      diameterBottom: baseDiameter,
      height,
      tessellation: 7
    }, scene);
    stack.parent = islandRoot;
    stack.position.x = Math.cos(angle) * distance;
    stack.position.z = Math.sin(angle) * distance * 0.68;
    stack.position.y = height * 0.5 - radius * 0.14;
    stack.rotation.x = Math.sin(angle) * 0.09;
    stack.rotation.z = Math.cos(angle) * 0.08;
    stack.rotation.y = angle * 0.65;
    stack.scaling.x = 0.78 + (i % 2) * 0.16;
    stack.scaling.z = 1.05 - (i % 2) * 0.18;
    stack.material = materials.rock;
    stack.receiveShadows = true;
  }

  return islandRoot;
}

function createRockFoamRing(name, radius, scene, materials, parent) {
  const ringCount = 8;

  for (let i = 0; i < ringCount; i += 1) {
    const angle = (i / ringCount) * Math.PI * 2 + radius * 0.09;
    const foam = MeshBuilder.CreateBox(`${name}_${i}`, {
      width: radius * (0.24 + (i % 3) * 0.035),
      height: 0.012,
      depth: radius * 0.035
    }, scene);
    foam.parent = parent;
    foam.position.x = Math.cos(angle) * radius * (0.34 + (i % 2) * 0.05);
    foam.position.y = 0.035;
    foam.position.z = Math.sin(angle) * radius * (0.24 + (i % 2) * 0.04);
    foam.rotation.y = -angle + Math.PI / 2;
    foam.material = materials.foam;
  }
}

function getFjordCarve(localX, localZ, rx, rz, fjords) {
  let carve = 0;

  fjords.forEach((fjord) => {
    const dirX = Math.sin(fjord.angle);
    const dirZ = Math.cos(fjord.angle);
    const along = (localX * dirX) / rx + (localZ * dirZ) / rz;
    const across = Math.abs((localX * dirZ) / rx - (localZ * dirX) / rz);
    const reach = fjord.reach ?? 0.78;
    const width = fjord.width ?? 0.14;
    const mouthToCenter = smoothstep(1.03, 0.12, along);
    const fromCoast = smoothstep(-1.02, -0.1, along);
    const channel = 1 - smoothstep(width * 0.45, width, across);

    carve = Math.max(carve, channel * mouthToCenter * fromCoast * smoothstep(reach, 0.08, Math.abs(along)));
  });

  return carve;
}

function getCoastShape(localX, localZ, rx, rz, land) {
  const nx = localX / rx;
  const nz = localZ / rz;
  const baseDistance = Math.sqrt(nx * nx + nz * nz);
  const angle = Math.atan2(nz, nx);
  const radiusFactor = getCoastRadiusFactor(angle, land);

  return {
    nx,
    nz,
    distance: baseDistance / radiusFactor
  };
}

function getPeakLift(nx, nz, ring, peakBoost, land) {
  if (!land.caldera) {
    return peakBoost * Math.pow(clamp(1 - Math.sqrt((nx * 1.35) ** 2 + (nz * 1.15) ** 2), 0, 1), 2.4);
  }

  const radius = land.caldera.radius ?? 0.38;
  const rim = land.caldera.rim ?? 0.16;
  const depth = land.caldera.depth ?? peakBoost * 0.45;
  const craterDistance = Math.sqrt((nx * 1.18) ** 2 + (nz * 1.05) ** 2);
  const outerCone = peakBoost * Math.pow(clamp(1 - ring * 0.72, 0, 1), 2.1);
  const rimLift = peakBoost * 0.48 * Math.exp(-((craterDistance - radius) ** 2) / (rim * rim));
  const bowlDrop = depth * (1 - smoothstep(radius * 0.45, radius, craterDistance));

  return Math.max(0, outerCone + rimLift - bowlDrop);
}

function getCoastRadiusFactor(angle, land) {
  const roughness = land.coastRoughness ?? 0.16;
  const seed = getNameSeed(land.name) * 0.013;
  const broad = Math.sin(angle * 2 + seed) * 0.62;
  const bays = Math.sin(angle * 4 - seed * 0.7) * 0.42;
  const small = Math.sin(angle * 7 + seed * 1.4) * 0.2;
  let fjordBite = 0;

  (land.fjords ?? []).forEach((fjord) => {
    const width = Math.max(0.08, fjord.width ?? 0.14);
    const angleDistance = getAngularDistance(angle, fjord.angle);
    const mouth = 1 - smoothstep(width * 0.45, width * 1.9, angleDistance);
    fjordBite = Math.max(fjordBite, mouth * (0.18 + width * 0.9));
  });

  return clamp(1 + (broad + bays + small) * roughness - fjordBite, 0.56, 1.42);
}

function drawMapLandWater(ctx, zone, bounds, width, height, scale) {
  drawInstrumentWaterways(ctx, zone, (point) => worldToMapPoint(point, bounds, width, height, scale), scale);

  (zone.lakes ?? []).forEach((lake) => {
    const point = worldToMapPoint({ x: zone.x + lake.x, z: zone.z + lake.z }, bounds, width, height, scale);
    drawInstrumentEllipse(ctx, point.x, point.y, lake.rx * scale, lake.rz * scale, "rgba(54, 143, 157, 0.86)", "rgba(180, 236, 231, 0.72)");
  });
}

function drawRadarLandWater(ctx, zone, playerPosition, centerX, centerY, scale, heading) {
  drawInstrumentWaterways(ctx, zone, (point) => worldToRadarPoint(point, playerPosition, centerX, centerY, scale, heading), scale);

  (zone.lakes ?? []).forEach((lake) => {
    const point = worldToRadarPoint({ x: zone.x + lake.x, z: zone.z + lake.z }, playerPosition, centerX, centerY, scale, heading);
    drawInstrumentEllipse(ctx, point.x, point.y, lake.rx * scale, lake.rz * scale, "rgba(54, 143, 157, 0.75)", "rgba(180, 236, 231, 0.48)", -heading);
  });
}

function drawInstrumentWaterways(ctx, zone, project, scale) {
  ctx.strokeStyle = "rgba(84, 180, 190, 0.86)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  (zone.waterways ?? []).forEach((waterway) => {
    const from = project({ x: zone.x + waterway.from.x, z: zone.z + waterway.from.z });
    const to = project({ x: zone.x + waterway.to.x, z: zone.z + waterway.to.z });
    ctx.lineWidth = Math.max(2, waterway.width * scale);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  });

  ctx.lineCap = "butt";
}

function getAngularDistance(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function getNameSeed(name) {
  let seed = 0;

  for (let i = 0; i < name.length; i += 1) {
    seed = (seed * 31 + name.charCodeAt(i)) % 9973;
  }

  return seed;
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

// Elliptical land/shallow zones are intentionally simple: one check feeds collision and slowdown.
function getWaterSafety(position, zones) {
  let shallowAmount = 0;

  for (const zone of zones) {
    const nx = (position.x - zone.x) / zone.rx;
    const nz = (position.z - zone.z) / zone.rz;
    const distance = Math.sqrt(nx * nx + nz * nz);
    const landWater = isInLandWater(position, zone);
    const shallowNx = (position.x - zone.x) / getZoneShallowRx(zone);
    const shallowNz = (position.z - zone.z) / getZoneShallowRz(zone);
    const shallowDistance = Math.sqrt(shallowNx * shallowNx + shallowNz * shallowNz);

    if (distance < 1 && !landWater) {
      return { isBlocked: true, isShallow: true, shallowAmount: 1 };
    }

    if (shallowDistance < 1 || landWater) {
      shallowAmount = Math.max(shallowAmount, landWater ? 0.48 : 1 - shallowDistance);
    }
  }

  return { isBlocked: false, isShallow: shallowAmount > 0, shallowAmount };
}

function getWaterDepth(position, zones) {
  const maxDepth = 110;
  let nearestCoastDistance = Number.POSITIVE_INFINITY;

  for (const zone of zones) {
    const nx = (position.x - zone.x) / zone.rx;
    const nz = (position.z - zone.z) / zone.rz;
    const distance = Math.sqrt(nx * nx + nz * nz);
    const coastDistance = isInLandWater(position, zone)
      ? Math.max(0.08, Math.abs(distance - 0.72))
      : distance - 1;
    nearestCoastDistance = Math.min(nearestCoastDistance, coastDistance);
  }

  if (nearestCoastDistance <= 0) {
    return { meters: 0, ratio: 0 };
  }

  const ratio = clamp(1 - Math.exp(-nearestCoastDistance / 1.25), 0, 1);
  return {
    meters: 2 + ratio * (maxDepth - 2),
    ratio
  };
}

function getWaterEscapeVector(position, zones) {
  let escape = new Vector3(0, 0, 0);

  for (const zone of zones) {
    const nx = (position.x - zone.x) / zone.rx;
    const nz = (position.z - zone.z) / zone.rz;
    const distance = Math.sqrt(nx * nx + nz * nz);

    if (distance < 1 && !isInLandWater(position, zone)) {
      if (distance < 0.001) {
        escape.x += 1;
      } else {
        escape.x += nx / distance;
        escape.z += nz / distance;
      }
    }
  }

  if (escape.lengthSquared() === 0) {
    return Vector3.Zero();
  }

  return escape.normalize();
}

function isInFjordWater(position, zone) {
  if (!zone.fjords?.length) return false;

  const localX = position.x - zone.x;
  const localZ = position.z - zone.z;
  return getFjordCarve(localX, localZ, zone.rx, zone.rz, zone.fjords) > 0.58;
}

function isInLandWater(position, zone) {
  if (isInFjordWater(position, zone)) return true;

  const localX = position.x - zone.x;
  const localZ = position.z - zone.z;
  return isInLocalLandWater(localX, localZ, zone);
}

function isInLocalLandWater(localX, localZ, zone) {
  return isInWaterway(localX, localZ, zone.waterways ?? []) || isInLake(localX, localZ, zone.lakes ?? []);
}

function isInWaterway(localX, localZ, waterways) {
  return waterways.some((waterway) => {
    const distance = distanceToSegment2D(localX, localZ, waterway.from.x, waterway.from.z, waterway.to.x, waterway.to.z);
    return distance <= waterway.width * 0.58;
  });
}

function isInLake(localX, localZ, lakes) {
  return lakes.some((lake) => {
    const nx = (localX - lake.x) / lake.rx;
    const nz = (localZ - lake.z) / lake.rz;
    return nx * nx + nz * nz <= 1;
  });
}

function distanceToSegment2D(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0
    ? 0
    : clamp(((px - ax) * dx + (pz - az) * dz) / lengthSquared, 0, 1);
  const nearestX = ax + dx * t;
  const nearestZ = az + dz * t;
  const ox = px - nearestX;
  const oz = pz - nearestZ;
  return Math.sqrt(ox * ox + oz * oz);
}
