import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
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
scene.clearColor = new Color4(0.42, 0.58, 0.72, 1);
scene.fogMode = Scene.FOGMODE_LINEAR;
scene.fogColor = new Color3(0.34, 0.45, 0.54);
scene.fogStart = 65;
scene.fogEnd = 560;

const speedValue = document.getElementById("speedValue");
const depthValue = document.getElementById("depthValue");
const depthGauge = document.querySelector(".depth-gauge");
const engineValue = document.getElementById("engineValue");
const telegraphScale = document.getElementById("telegraphScale");
const compassPointer = document.getElementById("compassPointer");
const compassHeading = document.getElementById("compassHeading");
const mapCanvas = document.getElementById("mapCanvas");
const mapZoom = document.getElementById("mapZoom");
const mapRowLabels = document.getElementById("mapRowLabels");
const mapColumnLabels = document.getElementById("mapColumnLabels");
const mapSectorValue = document.getElementById("mapSectorValue");
const mapCoordinateValue = document.getElementById("mapCoordinateValue");
const radarCanvas = document.getElementById("radarCanvas");
const radarStatus = document.getElementById("radarStatus");
const rudderIndicator = document.getElementById("rudderIndicator");
const rudderValue = document.getElementById("rudderValue");
const sinkingWaterOverlay = document.getElementById("sinkingWaterOverlay");
const fleetStatusRows = document.getElementById("fleetStatusRows");
const torpedoStockValue = document.getElementById("torpedoStockValue");
const playerListRows = document.getElementById("playerListRows");
const resetGameButton = document.getElementById("resetGameButton");

const radarOcclusionScale = 0.72;
const mapTileSize = 1200;
const mapSectorSize = 600;
const mapSectorOrigin = 5400;
const mapZoomScales = [0.5, 1, 2, 4, 8, 16];
const maxPlayerInitialsLength = 5;
const teamDefinitions = [
  { id: "light", label: "Light", className: "light", shipBase: 50 },
  { id: "dark", label: "Dark", className: "dark", shipBase: 80 },
  { id: "green", label: "Green", className: "green", shipBase: 110 },
  { id: "sand", label: "Sand", className: "sand", shipBase: 140 }
];
const legacyTeamAliases = new Map([
  ["blue", "light"],
  ["red", "dark"],
  ["khaki", "sand"],
  ["kaki", "sand"]
]);
const worldMetersPerUnit = 20;
const torpedoLogLimit = 40;
const enemyTorpedoFireArcRadians = 0.14;
const enemyTorpedoAimJitterRadians = 0.035;
const enemyTargetingRange = 420;
const engineHoldInitialDelaySeconds = 0.22;
const engineHoldRepeatSeconds = 0.1;
const mouseWheelEngineStep = 100;
const testPlayerInvulnerable = false;
const playerLogin = await requirePlayerLogin();
const playerInitials = playerLogin.initials;
const worldLandmasses = await loadWorldLandmasses();
document.body.dataset.worldSource = "server";
document.body.dataset.worldLandmasses = String(worldLandmasses.length);
const gameState = await loadGameState();
document.body.dataset.gameStateSource = "server";
document.body.dataset.serverGameState = gameState.state;
document.body.dataset.serverShips = String(gameState.ships.length);
document.body.dataset.serverTorpedoes = String(gameState.torpedoes.length);
const playerId = getLocalPlayerId(playerInitials);
const playerTeamId = getRequestedPlayerTeamId(gameState.ships, playerLogin.teamId);
const playerShips = getTeamShips(gameState.ships, playerTeamId);
const enemyShips = getEnemyShips(gameState.ships, playerTeamId);
const initialPlayerSpawn = createPlayerSpawn(playerShips, playerId);
let playerServerShipId = initialPlayerSpawn.shipId;
let playerBearingPosition = initialPlayerSpawn.position;
const fleetTotals = getFleetCounts(gameState.ships);
let playerTorpedoesRemaining = Number.isFinite(initialPlayerSpawn.torpedoesRemaining)
  ? initialPlayerSpawn.torpedoesRemaining
  : null;
document.body.dataset.playerTeam = playerTeamId;
document.body.dataset.playerId = playerId;
document.body.dataset.playerInitials = playerInitials;
document.body.dataset.playerShipId = playerServerShipId ?? "pending";
document.body.dataset.serverOwnShips = String(playerShips.length);
document.body.dataset.serverEnemyShips = String(enemyShips.length);
document.body.dataset.testPlayerInvulnerable = String(testPlayerInvulnerable);
setupResetGameControl(resetGameButton);
setupMapZoomControl(mapZoom);

const materials = createMaterials(scene);
const world = new TransformNode("world", scene);

const sun = new DirectionalLight("sun", new Vector3(-0.45, -0.9, 0.32), scene);
sun.position = new Vector3(35, 80, -45);
sun.intensity = 0.92;
sun.diffuse = new Color3(1.0, 0.78, 0.52);
sun.specular = new Color3(0.58, 0.42, 0.3);

const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
ambient.intensity = 0.44;
ambient.diffuse = new Color3(0.62, 0.72, 0.82);
ambient.groundColor = new Color3(0.055, 0.095, 0.11);

const worldLimit = 5000;
const ocean = MeshBuilder.CreateGround("ocean", { width: 2300, height: 2300, subdivisions: 160 }, scene);
ocean.material = materials.water;
ocean.parent = world;
const foam = createFoamPatches(scene, materials, world);
const volcanoPlumes = [];

const blockedWaters = worldLandmasses.map(getLandZone);
createWorldLandmasses(worldLandmasses, scene, materials, world);

const boat = createPlayerBow(scene, materials, "player_bow", playerTeamId);
boat.root.position.copyFrom(initialPlayerSpawn.position);

// Until SSE arrives, backend ships seed the visual fleet and local motion keeps them inspectable.
const enemyMotions = createEnemyFleet(scene, materials, getOtherServerShips(gameState.ships, playerServerShipId));
document.body.dataset.meshCount = String(scene.meshes.length);

const camera = new FreeCamera("follow_camera", new Vector3(0, 7, -13), scene);
camera.minZ = 0.2;
camera.maxZ = 4200;
camera.fov = 0.78;
scene.activeCamera = camera;

window.addEventListener("keydown", (event) => {
  if (isHudControlEvent(event)) return;
  document.body.dataset.lastKey = formatInputEvent(event);
  const playerActive = playerDamageState === "active";

  if (playerActive && isInputKey(event, "up")) {
    heldEngineDirection = 1;
    if (!event.repeat) {
      changeEngineOrder(1);
      nextEngineHoldChangeTime = time + engineHoldInitialDelaySeconds;
    }
    event.preventDefault();
  }
  if (playerActive && isInputKey(event, "down")) {
    heldEngineDirection = -1;
    if (!event.repeat) {
      changeEngineOrder(-1);
      nextEngineHoldChangeTime = time + engineHoldInitialDelaySeconds;
    }
    event.preventDefault();
  }
  if (playerActive && isInputKey(event, "left")) {
    heldRudderDirection = -1;
    if (!event.repeat) {
      rudderDegrees = stepRudderDegrees(rudderDegrees, -1);
    }
    event.preventDefault();
  }
  if (playerActive && isInputKey(event, "right")) {
    heldRudderDirection = 1;
    if (!event.repeat) {
      rudderDegrees = stepRudderDegrees(rudderDegrees, 1);
    }
    event.preventDefault();
  }
  if (playerActive && isTorpedoFireKey(event) && !event.repeat) {
    requestPlayerTorpedoFire();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (isHudControlEvent(event)) return;
  if (isInputKey(event, "up") && heldEngineDirection > 0) {
    heldEngineDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "down") && heldEngineDirection < 0) {
    heldEngineDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "left") && heldRudderDirection < 0) {
    heldRudderDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "right") && heldRudderDirection > 0) {
    heldRudderDirection = 0;
    event.preventDefault();
  }
});

window.addEventListener("mousedown", (event) => {
  if (isHudControlEvent(event)) return;
  if (fireMouseTorpedo(event.button)) {
    event.preventDefault();
    return;
  }
});

window.addEventListener("pointerdown", (event) => {
  if (isHudControlEvent(event)) return;
  if (startGlobalMouseRudder(event)) {
    mouseButtonMask = event.buttons;
    event.target?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
});

window.addEventListener("mouseup", (event) => {
  if (isHudControlEvent(event)) return;
  if (stopGlobalMouseRudder(event.button)) {
    mouseButtonMask = event.buttons;
    event.preventDefault();
  }
});

window.addEventListener("pointerup", (event) => {
  if (isHudControlEvent(event)) return;
  if (stopGlobalMouseRudder(event.button)) {
    mouseButtonMask = event.buttons;
    event.target?.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
  }
});

window.addEventListener("pointermove", (event) => {
  mouseButtonMask = event.buttons;
  updateGlobalMouseRudder(event);
});

window.addEventListener("pointercancel", () => {
  mouseButtonMask = 0;
  rightMouseRudderActive = false;
});

window.addEventListener("blur", () => {
  mouseButtonMask = 0;
  rightMouseRudderActive = false;
});

window.addEventListener("contextmenu", (event) => {
  if (playerDamageState === "active") {
    event.preventDefault();
  }
});

window.addEventListener("auxclick", (event) => {
  if (isMouseTorpedoButton(event.button)) {
    event.preventDefault();
  }
});

window.addEventListener("wheel", (event) => {
  if (playerDamageState !== "active") return;

  mouseWheelEngineAccumulator -= event.deltaY;
  while (mouseWheelEngineAccumulator <= -mouseWheelEngineStep) {
    changeEngineOrder(1);
    mouseWheelEngineAccumulator += mouseWheelEngineStep;
  }
  while (mouseWheelEngineAccumulator >= mouseWheelEngineStep) {
    changeEngineOrder(-1);
    mouseWheelEngineAccumulator -= mouseWheelEngineStep;
  }
  event.preventDefault();
}, { passive: false });

const engineOrders = [
  { label: "Astern Full", shortLabel: "Full Ast", speed: -4.2 },
  { label: "Astern Half", shortLabel: "Half Ast", speed: -2.2 },
  { label: "Stop", speed: 0 },
  { label: "Ahead Slow", shortLabel: "Slow", speed: 0.55 },
  { label: "Ahead 1/3", shortLabel: "1/3", speed: 1.8 },
  { label: "Ahead Half", shortLabel: "Half", speed: 3.8 },
  { label: "Ahead 2/3", shortLabel: "2/3", speed: 6.4 },
  { label: "Ahead Full", shortLabel: "Full", speed: 9.6 },
  { label: "Flank", speed: 12.4 }
];

// Keep propulsion as discrete ship orders, not held-key throttle.
// Later multiplayer can send this order index plus heading/speed instead of raw input.
let heading = initialPlayerSpawn.heading;
let speed = 0;
let engineOrder = 2;
let turnVelocity = 0;
let rudderDegrees = 0;
let heldEngineDirection = 0;
let nextEngineHoldChangeTime = 0;
let heldRudderDirection = 0;
let mouseButtonMask = 0;
let mouseWheelEngineAccumulator = 0;
let rightMouseRudderActive = false;
let rightMouseRudderStartX = 0;
let rightMouseRudderStartDegrees = 0;
let cameraPosition = camera.position.clone();
let cameraTarget = boat.root.position.clone();
let time = 0;
let nextRamHitTime = 0;
let ramShake = 0;
let playerHits = 0;
let playerDamageState = "active";
let playerSinkStartTime = 0;
let playerSinkStartY = 0;
let playerSinkSide = -1;
let playerRespawnIndex = 0;
let pendingPlayerServerShip = null;
let playerServerTarget = null;
let playerServerPositionCorrection = Vector3.Zero();
let playerServerHeadingCorrection = 0;
let playerServerTurnRateCorrection = 0;
let nextPlayerStateSendTime = 0;
let playerStateRequestInFlight = false;
let remoteCorrectionSamples = 0;
let remoteCorrectionTotal = 0;
let remoteCorrectionMax = 0;
let playerServerSnapshotReceived = false;
let serverRadarReady = false;
let serverRadarContacts = [];
let serverRadarObserverPosition = null;
let serverRadarObserverHeading = null;
let serverRadarRange = 360;
let serverShipsById = indexShipsById(gameState.ships);
let gameEventSource = null;
let gameEventSourceReady = false;
let fireTorpedoRequestInFlight = false;
const maxRudderDegrees = 35;
const rudderStepDegrees = 1;
const rudderHoldDegreesPerSecond = 72;
const maxSimulationFrameSeconds = 0.12;
boat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
const playerRespawnPoints = createPlayerRespawnPoints(playerShips, initialPlayerSpawn);
const torpedoLaunchDefaults = {
  tubeX: 0.6,
  startZ: 2.45,
  startY: 0.6
};
const torpedoSystem = createTorpedoSystem(scene, materials, world);
connectGameEventStream();

const telegraphSteps = createTelegraphSteps(engineOrders, telegraphScale);
setupTelegraphDragControl(telegraphScale);
setupRudderDragControl(document.querySelector(".rudder-gauge"));
updateFleetStatus(gameState.ships, gameState.destroyedShipsByTeam);
updatePlayerList(gameState.ships, gameState.killsByPlayer);
updatePlayerTorpedoStock(playerTorpedoesRemaining);
enemyMotions
  .filter((enemyMotion) => !enemyMotion.isServerControlled)
  .forEach((enemyMotion, index) => startLocalEnemyEventSource(enemyMotion, index));

scene.onBeforeRenderObservable.add(() => {
  const rawFrameSeconds = engine.getDeltaTime() / 1000;
  const dt = Math.min(rawFrameSeconds, maxSimulationFrameSeconds);
  time += dt;
  const playerActive = playerDamageState === "active";

  if (playerActive && heldRudderDirection !== 0) {
    rudderDegrees = clamp(
      rudderDegrees + heldRudderDirection * rudderHoldDegreesPerSecond * dt,
      -maxRudderDegrees,
      maxRudderDegrees
    );
  }

  if (playerActive && heldEngineDirection !== 0 && time >= nextEngineHoldChangeTime) {
    changeEngineOrder(heldEngineDirection);
    nextEngineHoldChangeTime = time + engineHoldRepeatSeconds;
  }

  // Heavy ship feel: the selected telegraph order is a target, and speed eases toward it.
  const waterSafety = getShipWaterSafety(boat.root.position, heading, blockedWaters);
  let forward = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  let nextWaterSafety = waterSafety;

  if (playerActive) {
    const maxForwardSpeed = 12.4;
    const engineTargetSpeed = engineOrders[engineOrder].speed;
    const targetSpeed = engineTargetSpeed > 0 ? Math.min(engineTargetSpeed, maxForwardSpeed) : engineTargetSpeed;
    const response = Math.abs(targetSpeed) > Math.abs(speed) ? 0.45 : 0.75;
    speed += (targetSpeed - speed) * Math.min(1, dt * response);

    const turnStrength = speed >= 0 ? 0.24 : -0.16;
    const rudderGrip = clamp(Math.abs(speed) / 4.2, 0, 1);
    const steer = rudderDegrees / maxRudderDegrees;
    const targetTurnVelocity = steer * turnStrength * rudderGrip;
    turnVelocity += (targetTurnVelocity - turnVelocity) * Math.min(1, dt * 2.0);
    heading += turnVelocity * dt;
    forward = new Vector3(Math.sin(heading), 0, Math.cos(heading));

    const previousPosition = boat.root.position.clone();
    boat.root.position.addInPlace(forward.scale(speed * dt));
    boat.root.position.x = clamp(boat.root.position.x, -worldLimit, worldLimit);
    boat.root.position.z = clamp(boat.root.position.z, -worldLimit, worldLimit);

    nextWaterSafety = getShipWaterSafety(boat.root.position, heading, blockedWaters);
    const movementSafety = nextWaterSafety.isBlocked
      ? getShipMovementWaterSafety(boat.root.position, heading, speed, blockedWaters)
      : nextWaterSafety;
    if (movementSafety.isBlocked) {
      boat.root.position.copyFrom(previousPosition);

      // Grounding stops the ship, but a tiny escape nudge prevents numeric edge-locking.
      const groundedSafety = getShipWaterSafety(boat.root.position, heading, blockedWaters);
      if (groundedSafety.isBlocked) {
        boat.root.position.addInPlace(getWaterEscapeVector(groundedSafety.blockedPoint ?? boat.root.position, blockedWaters).scale(0.18));
      }

      speed = engineOrders[engineOrder].speed < 0 ? Math.min(speed, -1.2) : 0;
      turnVelocity *= 0.4;
    }
  } else {
    heldRudderDirection = 0;
    engineOrder = 2;
    speed *= Math.max(0, 1 - dt * 1.7);
    turnVelocity *= Math.max(0, 1 - dt * 2.0);
    rudderDegrees += (0 - rudderDegrees) * Math.min(1, dt * 1.8);
  }

  const bob = Math.sin(time * 2.1) * 0.08 + Math.sin(time * 3.8 + 1.6) * 0.035;
  if (playerActive) {
    boat.root.position.y = 0.32 + bob;
    boat.root.rotationQuaternion = Quaternion.FromEulerAngles(
      Math.sin(time * 2.6) * 0.025,
      heading,
      -turnVelocity * 0.5 + Math.sin(time * 1.9) * 0.018
    );
  } else {
    updatePlayerSinking(boat, time);
  }
  ocean.position.x = boat.root.position.x;
  ocean.position.z = boat.root.position.z;

  materials.water.diffuseTexture.uOffset += dt * 0.01;
  materials.water.diffuseTexture.vOffset += dt * 0.018;
  updateFoamPatches(foam, boat.root.position, time);
  updateVolcanoPlumes(volcanoPlumes, time);
  enemyMotions.forEach((enemyMotion) => updateEnemyMotion(enemyMotion, dt, time, boat.root.position, blockedWaters));
  updateEnemyFireControl(torpedoSystem, enemyMotions, boat.root.position, blockedWaters, time);
  updateServerTorpedoVisuals(torpedoSystem, dt, time);
  syncMultiplayerState(time);
  const torpedoResult = updateTorpedoSystem(torpedoSystem, dt, time, enemyMotions, blockedWaters, boat.root.position);
  if (torpedoResult.playerHit && playerDamageState === "active") {
    playerHits += torpedoResult.playerHit;
    ramShake = 1;
    speed *= 0.55;
    if (testPlayerInvulnerable) {
      document.body.dataset.playerDamageState = "invulnerable-hit";
    } else {
      beginPlayerSinking(torpedoResult.playerHitPosition, time);
    }
  }

  const ramHit = playerActive ? getPlayerRamHit(boat.root.position, heading, speed, enemyMotions, time) : null;
  if (ramHit) {
    nextRamHitTime = time + 2.2;
    torpedoSystem.hits += 1;
    ramShake = 1;
    beginEnemySinking(ramHit.motion, -ramHit.side, time);
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
  document.body.dataset.frameMs = (rawFrameSeconds * 1000).toFixed(1);
  document.body.dataset.simulationMs = (dt * 1000).toFixed(1);
  document.body.dataset.cameraRotation = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)},${camera.rotation.z.toFixed(2)}`;
  document.body.dataset.activeCamera = scene.activeCamera?.name ?? "none";
  document.body.dataset.boat = `${boat.root.position.x.toFixed(1)},${boat.root.position.y.toFixed(1)},${boat.root.position.z.toFixed(1)}`;
  document.body.dataset.engineOrder = engineOrders[engineOrder].label;
  document.body.dataset.rudderDegrees = String(Math.round(rudderDegrees));
  document.body.dataset.torpedoes = String(torpedoSystem.active.length);
  document.body.dataset.torpedoHits = String(torpedoSystem.hits);
  document.body.dataset.playerHits = String(playerHits);
  document.body.dataset.playerDamageState = playerDamageState;
  document.body.dataset.ramReady = time >= nextRamHitTime ? "true" : "false";
  playerBearingPosition = boat.root.position;

  const displayedSpeed = Math.abs(speed) < 0.08 ? 0 : Math.abs(speed);
  speedValue.textContent = displayedSpeed.toFixed(1);
  engineValue.textContent = engineOrders[engineOrder].label;
  updateTelegraphSteps(telegraphSteps, engineOrder);
  depthValue.textContent = nextWaterSafety.isBlocked ? "Ground" : "Sea";
  depthGauge?.style.setProperty("--depth-ratio", "1");
  compassPointer?.style.setProperty("transform", `translate(-50%, -50%) rotate(${heading}rad)`);
  if (compassHeading) compassHeading.textContent = `HDG ${formatHeadingDegrees(heading)}`;
  updateRudderGauge(rudderIndicator, rudderValue, rudderDegrees);
  updateNavigationInstruments(mapCanvas, radarCanvas, radarStatus, boat.root.position, getRadarContacts(enemyMotions), blockedWaters, heading);
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

function isHudControlEvent(event) {
  return event.target?.closest?.("input, button, select, textarea");
}

function setupMapZoomControl(input) {
  if (!input) return;

  const setZoomFromPointer = (event) => {
    const rect = input.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const min = Number(input.min ?? 0);
    const max = Number(input.max ?? mapZoomScales.length - 1);
    input.value = String(Math.round(min + ratio * (max - min)));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  input.addEventListener("pointerdown", (event) => {
    setZoomFromPointer(event);
    input.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  });
  input.addEventListener("pointermove", (event) => {
    if (!event.buttons) return;
    setZoomFromPointer(event);
    event.stopPropagation();
    event.preventDefault();
  });
  input.addEventListener("keydown", (event) => {
    const delta = event.code === "ArrowRight" || event.code === "ArrowUp"
      ? 1
      : event.code === "ArrowLeft" || event.code === "ArrowDown"
        ? -1
        : 0;
    if (!delta) return;
    input.value = String(clamp(Number(input.value) + delta, Number(input.min ?? 0), Number(input.max ?? mapZoomScales.length - 1)));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    event.stopPropagation();
    event.preventDefault();
  });
}

function setupTelegraphDragControl(scale) {
  if (!scale) return;

  const setOrderFromPointer = (event) => {
    if (playerDamageState !== "active") return;
    const rect = scale.getBoundingClientRect();
    if (rect.height <= 0) return;
    const ratio = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    engineOrder = clamp(engineOrders.length - 1 - Math.round(ratio * (engineOrders.length - 1)), 0, engineOrders.length - 1);
    nextEngineHoldChangeTime = time + engineHoldInitialDelaySeconds;
  };

  scale.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    setOrderFromPointer(event);
    scale.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  });
  scale.addEventListener("pointermove", (event) => {
    if ((event.buttons & 1) === 0) return;
    setOrderFromPointer(event);
    event.stopPropagation();
    event.preventDefault();
  });
}

function setupRudderDragControl(gauge) {
  if (!gauge) return;

  const setRudderFromPointer = (event) => {
    if (playerDamageState !== "active") return;
    const rect = gauge.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    rudderDegrees = clamp((ratio * 2 - 1) * maxRudderDegrees, -maxRudderDegrees, maxRudderDegrees);
  };

  gauge.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    setRudderFromPointer(event);
    gauge.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  });
  gauge.addEventListener("pointermove", (event) => {
    if ((event.buttons & 1) === 0) return;
    setRudderFromPointer(event);
    event.stopPropagation();
    event.preventDefault();
  });
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

function changeEngineOrder(direction) {
  engineOrder = clamp(engineOrder + direction, 0, engineOrders.length - 1);
}

function stepRudderDegrees(currentDegrees, direction) {
  const step = rudderStepDegrees * Math.sign(direction);
  if (currentDegrees !== 0 && Math.sign(currentDegrees) !== Math.sign(step) && Math.abs(currentDegrees) <= rudderStepDegrees) {
    return 0;
  }
  const steppedDegrees = currentDegrees + step;
  if (currentDegrees !== 0 && Math.sign(currentDegrees) !== Math.sign(steppedDegrees)) {
    return 0;
  }
  return clamp(steppedDegrees, -maxRudderDegrees, maxRudderDegrees);
}

function startGlobalMouseRudder(event) {
  if (playerDamageState !== "active" || event.button !== 2) return false;
  rightMouseRudderActive = true;
  rightMouseRudderStartX = event.clientX;
  rightMouseRudderStartDegrees = rudderDegrees;
  updateGlobalMouseRudder(event);
  return true;
}

function stopGlobalMouseRudder(button) {
  if (button !== 2) return false;
  rightMouseRudderActive = false;
  return true;
}

function fireMouseTorpedo(button) {
  if (!isMouseTorpedoButton(button) || playerDamageState !== "active") return false;
  requestPlayerTorpedoFire();
  return true;
}

function isMouseTorpedoButton(button) {
  return button === 1 || button === 3;
}

function updateGlobalMouseRudder(event) {
  if (!rightMouseRudderActive || playerDamageState !== "active" || (event.buttons & 2) === 0) return;
  const dragDegrees = (event.clientX - rightMouseRudderStartX) * 0.22;
  rudderDegrees = clamp(rightMouseRudderStartDegrees + dragDegrees, -maxRudderDegrees, maxRudderDegrees);
}

async function loadWorldLandmasses() {
  const endpoint = getWorldMapEndpoint();
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) {
    failWorldMapLoad(endpoint, `World map request failed with ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.landmasses)) {
    failWorldMapLoad(endpoint, "World map response has no landmasses array");
  }

  console.info("[sea-battle] loaded world map from server", {
    endpoint,
    version: payload.version,
    landmasses: payload.landmasses.length
  });
  return payload.landmasses;
}

function failWorldMapLoad(endpoint, message) {
  document.body.dataset.worldSource = "error";
  document.body.dataset.worldError = message;
  document.body.innerHTML = `<main class="startup-error"><h1>World map unavailable</h1><p>${escapeHtml(message)}</p><small>${escapeHtml(endpoint)}</small></main>`;
  throw new Error(`${message}: ${endpoint}`);
}

function getWorldMapEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/world`;
  }

  return "/game/world";
}

async function loadGameState() {
  const endpoint = getGameStateEndpoint();
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) {
    failGameStateLoad(endpoint, `Game state request failed with ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.ships)) {
    failGameStateLoad(endpoint, "Game state response has no ships array");
  }
  if (!Array.isArray(payload.torpedoes)) {
    failGameStateLoad(endpoint, "Game state response has no torpedoes array");
  }

  console.info("[sea-battle] loaded game state from server", {
    endpoint,
    sessionId: payload.sessionId,
    state: payload.state,
    ships: payload.ships.length,
    torpedoes: payload.torpedoes.length
  });
  return payload;
}

function failGameStateLoad(endpoint, message) {
  document.body.dataset.gameStateSource = "error";
  document.body.dataset.gameStateError = message;
  document.body.innerHTML = `<main class="startup-error"><h1>Game state unavailable</h1><p>${escapeHtml(message)}</p><small>${escapeHtml(endpoint)}</small></main>`;
  throw new Error(`${message}: ${endpoint}`);
}

function getGameStateEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/state`;
  }

  return "/game/state";
}

function getPlayerStateEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/player-state`;
  }

  return "/game/player-state";
}

function getFireTorpedoEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/fire-torpedo`;
  }

  return "/game/fire-torpedo";
}

function getGameEventsEndpoint() {
  const safePlayerId = encodeURIComponent(playerId);
  const safeTeamId = encodeURIComponent(playerTeamId);
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/events/${safePlayerId}/${safeTeamId}`;
  }

  return `/game/events/${safePlayerId}/${safeTeamId}`;
}

function getLocalPlayerId(initials = "PL") {
  const storageKey = "seaBattlePlayerId";
  const idPrefix = `player-${initials}-`;
  const existingId = localStorage.getItem(storageKey);
  if (existingId?.startsWith(idPrefix)) {
    return existingId;
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  const id = `${idPrefix}${Date.now().toString(36)}-${randomPart}`;
  localStorage.setItem(storageKey, id);
  return id;
}

function requirePlayerLogin() {
  const params = new URLSearchParams(location.search);
  const requestedTeamId = sanitizeTeamId(params.get("team") ?? params.get("side"));
  const requestedInitials = sanitizeInitials(params.get("initials") ?? params.get("name") ?? params.get("player"));
  const storageKey = "seaBattlePlayerInitials";
  const existing = sanitizeInitials(localStorage.getItem(storageKey));
  if (requestedInitials && requestedTeamId) {
    localStorage.setItem(storageKey, requestedInitials);
    return Promise.resolve({ initials: requestedInitials, teamId: requestedTeamId });
  }
  if (existing && requestedTeamId) {
    return Promise.resolve({ initials: existing, teamId: requestedTeamId });
  }

  document.body.classList.add("login-active");
  const overlay = document.createElement("section");
  overlay.className = "login-screen";
  overlay.innerHTML = `
    <form class="login-card">
      <strong>Sea Battle</strong>
      <label for="playerInitials">Initialen</label>
      <input id="playerInitials" name="initials" maxlength="${maxPlayerInitialsLength}" pattern="[A-Za-z0-9]{1,${maxPlayerInitialsLength}}" autocomplete="off" value="${existing}" autofocus />
      <label for="playerTeam">Seite</label>
      <select id="playerTeam" name="team">
        ${teamDefinitions.map((team) => `<option value="${team.id}">${team.label}</option>`).join("")}
      </select>
      <button type="submit">Start</button>
    </form>
  `;
  document.body.appendChild(overlay);
  const input = overlay.querySelector("input");
  const teamSelect = overlay.querySelector("select");
  if (requestedTeamId && teamSelect) {
    teamSelect.value = requestedTeamId;
  }
  input?.focus();
  input?.select();
  input?.addEventListener("input", () => {
    input.value = sanitizeInitials(input.value);
  });

  return new Promise((resolve) => {
    overlay.querySelector("form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const initials = sanitizeInitials(input?.value) || "PL";
      const teamId = sanitizeTeamId(teamSelect?.value) || "light";
      localStorage.setItem(storageKey, initials);
      setRequestedTeamInUrl(teamId);
      document.body.classList.remove("login-active");
      overlay.remove();
      resolve({ initials, teamId });
    });
  });
}

function sanitizeInitials(value) {
  const initials = String(value ?? "").replace(/[^a-z0-9]/gi, "").slice(0, maxPlayerInitialsLength).toUpperCase();
  return initials.length > 0 ? initials : "";
}

function getTeamDefinition(teamId) {
  const canonicalTeamId = legacyTeamAliases.get(String(teamId ?? "").toLowerCase()) ?? String(teamId ?? "").toLowerCase();
  return teamDefinitions.find((team) => team.id === canonicalTeamId) ?? null;
}

function sanitizeTeamId(value) {
  const rawTeamId = String(value ?? "").trim().toLowerCase();
  const teamId = legacyTeamAliases.get(rawTeamId) ?? rawTeamId;
  return getTeamDefinition(teamId) ? teamId : "";
}

function setRequestedTeamInUrl(teamId) {
  if (!history.replaceState) return;
  const url = new URL(location.href);
  url.searchParams.set("team", teamId);
  history.replaceState(null, "", url);
}

function getRequestedPlayerTeamId(ships, selectedTeamId = "") {
  const params = new URLSearchParams(location.search);
  const requestedTeamId = selectedTeamId || params.get("team") || params.get("side");
  const teamIds = [...new Set(ships.map((ship) => ship.teamId).filter(Boolean))];

  if (requestedTeamId && teamIds.includes(requestedTeamId)) {
    return requestedTeamId;
  }
  if (teamIds.includes("light")) {
    return "light";
  }
  return teamIds[0] ?? "light";
}

function setupResetGameControl(button) {
  if (button) {
    button.hidden = true;
  }

  window.addEventListener("keydown", (event) => {
    if (!(event.altKey && event.shiftKey && event.code === "KeyR")) return;
    event.preventDefault();
    requestHostGameReset();
  });
}

async function requestHostGameReset() {
  const adminKey = window.prompt("Host key");
  if (!adminKey) return;
  const setupId = promptGameSetupId();
  if (setupId === null) return;

  try {
    const response = await fetch(getResetGameEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey, setupId })
    });
    if (!response.ok) {
      throw new Error(`Reset failed with ${response.status}`);
    }
    window.location.reload();
  } catch (error) {
    document.body.dataset.resetGameError = error.message;
  }
}

function promptGameSetupId() {
  const currentSetup = new URLSearchParams(location.search).get("setup") ?? "dense-land";
  const choice = window.prompt("World: 1 = Dense land, 2 = Islands", currentSetup === "islands" ? "2" : "1");
  if (choice === null) return null;
  const normalized = choice.trim().toLowerCase();
  if (normalized === "2" || normalized === "islands" || normalized === "island") return "islands";
  return "dense-land";
}

function getResetGameEndpoint() {
  if (location.protocol === "file:") {
    return "http://127.0.0.1:9090/game/reset";
  }
  return "/game/reset";
}

function getTeamShips(ships, teamId) {
  return ships.filter((ship) => ship.teamId === teamId);
}

function getEnemyShips(ships, teamId) {
  return ships.filter((ship) => ship.teamId !== teamId);
}

function getFleetCounts(ships) {
  return ships.reduce((counts, ship) => {
    const teamId = sanitizeTeamId(ship.teamId);
    if (teamId) {
      counts[teamId] = (counts[teamId] ?? 0) + 1;
    }
    return counts;
  }, Object.fromEntries(teamDefinitions.map((team) => [team.id, 0])));
}

function updateFleetStatus(ships, destroyedShipsByTeam = {}) {
  if (!fleetStatusRows) return;

  const activeCounts = getFleetCounts(ships);
  fleetStatusRows.innerHTML = "";

  teamDefinitions.forEach((team) => {
    const active = activeCounts[team.id] ?? 0;
    const total = fleetTotals[team.id] ?? active;
    const lost = Number.isFinite(destroyedShipsByTeam[team.id]) ? destroyedShipsByTeam[team.id] : 0;
    const row = document.createElement("div");
    row.className = `fleet-status-row fleet-status-${team.className}`;

    const label = document.createElement("span");
    label.textContent = team.label;

    const value = document.createElement("strong");
    value.textContent = `${active}/${total} L${lost}`;

    row.append(label, value);
    fleetStatusRows.append(row);
    document.body.dataset[`fleet${team.id[0].toUpperCase()}${team.id.slice(1)}`] = `${active}/${total}`;
    document.body.dataset[`fleet${team.id[0].toUpperCase()}${team.id.slice(1)}Lost`] = String(lost);
  });
}

function updatePlayerList(ships, killsByPlayer = {}) {
  if (!playerListRows || !Array.isArray(ships)) return;

  const humanShips = ships
    .filter((ship) => isHumanController(ship.controlledBy))
    .sort((left, right) => {
      if (left.teamId !== right.teamId) return left.teamId.localeCompare(right.teamId);
      return getPlayerInitialsFromId(left.controlledBy).localeCompare(getPlayerInitialsFromId(right.controlledBy));
    });

  playerListRows.innerHTML = "";
  if (humanShips.length === 0) {
    const empty = document.createElement("div");
    empty.className = "player-list-empty";
    empty.textContent = "No players";
    playerListRows.append(empty);
    document.body.dataset.humanPlayers = "0";
    return;
  }

  humanShips.forEach((ship) => {
    const row = document.createElement("div");
    const teamClass = `player-list-row-${getTeamDefinition(ship.teamId)?.className ?? "dark"}`;
    row.className = `player-list-row ${teamClass}${ship.controlledBy === playerId ? " player-list-row-own" : ""}`;

    const initials = document.createElement("strong");
    initials.textContent = getPlayerInitialsFromId(ship.controlledBy);

    const shipLabel = document.createElement("span");
    shipLabel.textContent = createShipDesignation(ship);

    const kills = document.createElement("span");
    kills.className = "player-list-kills";
    kills.textContent = `K${Number.isFinite(killsByPlayer?.[ship.controlledBy]) ? killsByPlayer[ship.controlledBy] : 0}`;

    const bearing = document.createElement("span");
    bearing.className = "player-list-bearing";
    bearing.title = "Bearing";
    const relativeBearing = getRelativeBearingToShip(ship);
    if (Number.isFinite(relativeBearing)) {
      bearing.style.setProperty("--bearing", `${relativeBearing}rad`);
    } else {
      bearing.classList.add("is-unknown");
    }

    const sector = document.createElement("small");
    sector.textContent = formatMapSector(ship);

    row.append(initials, shipLabel, kills, bearing, sector);
    playerListRows.append(row);
  });

  document.body.dataset.humanPlayers = String(humanShips.length);
}

function isHumanController(controller) {
  return typeof controller === "string" && controller.length > 0 && controller !== "bot";
}

function getPlayerInitialsFromId(controller) {
  if (!isHumanController(controller)) return "BOT";
  const match = controller.match(/^player-([A-Z0-9]{1,5})-/i);
  return (match?.[1] ?? controller.slice(0, maxPlayerInitialsLength)).toUpperCase();
}

function getRelativeBearingToShip(ship) {
  if (!ship || ship.id === playerServerShipId) return null;
  const ownPosition = playerBearingPosition;
  if (!ownPosition || !Number.isFinite(ship.x) || !Number.isFinite(ship.z)) return null;

  const absoluteBearing = Math.atan2(ship.x - ownPosition.x, ship.z - ownPosition.z);
  return getSignedAngularDistance(absoluteBearing, heading);
}

function updatePlayerTorpedoStock(torpedoesRemaining) {
  playerTorpedoesRemaining = Number.isFinite(torpedoesRemaining) ? torpedoesRemaining : null;
  if (torpedoStockValue) {
    torpedoStockValue.textContent = playerTorpedoesRemaining === null ? "--" : String(playerTorpedoesRemaining);
  }
  document.body.dataset.playerTorpedoesRemaining = playerTorpedoesRemaining === null
    ? ""
    : String(playerTorpedoesRemaining);
}

function createPlayerSpawn(teamShips, currentPlayerId) {
  const ship =
    teamShips.find((candidate) => candidate.state === "active" && candidate.controlledBy === currentPlayerId) ??
    teamShips.find((candidate) => candidate.state === "active" && candidate.controlledBy === "bot") ??
    teamShips.find((candidate) => candidate.state === "active") ??
    teamShips[0];
  if (!ship) {
    return {
      shipId: null,
      position: new Vector3(46, 0.28, 52),
      heading: -2.12,
      torpedoesRemaining: null
    };
  }

  return {
    shipId: ship.id,
    position: new Vector3(ship.x, 0.28, ship.z),
    heading: Number.isFinite(ship.heading) ? ship.heading : 0,
    torpedoesRemaining: Number.isFinite(ship.torpedoesRemaining) ? ship.torpedoesRemaining : null
  };
}

function createPlayerRespawnPoints(teamShips, fallbackSpawn) {
  const spawns = teamShips
    .filter((ship) => ship.state === "active")
    .map((ship) => ({
      position: new Vector3(ship.x, 0.28, ship.z),
      heading: Number.isFinite(ship.heading) ? ship.heading : fallbackSpawn.heading
    }));

  return spawns.length > 0 ? spawns : [fallbackSpawn];
}

function getOtherServerShips(ships, ownShipId) {
  return ships.filter((ship) => ship.id !== ownShipId);
}

function syncMultiplayerState(now) {
  if (now >= nextPlayerStateSendTime && !playerStateRequestInFlight && playerDamageState === "active") {
    nextPlayerStateSendTime = now + 0.25;
    sendPlayerState();
  }
}

async function sendPlayerState() {
  playerStateRequestInFlight = true;
  try {
    const response = await fetch(getPlayerStateEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        teamId: playerTeamId,
        x: boat.root.position.x,
        z: boat.root.position.z,
        heading,
        speed,
        turnVelocity,
        engineOrder,
        rudderDegrees: Math.round(rudderDegrees),
        clientTime: performance.now() / 1000
      })
    });
    if (!response.ok) {
      throw new Error(`Player state request failed with ${response.status}`);
    }
    await response.json();
    document.body.dataset.playerStateSync = "command-ok";
  } catch (error) {
    document.body.dataset.playerStateSync = "error";
    document.body.dataset.playerStateSyncError = error.message;
  } finally {
    playerStateRequestInFlight = false;
  }
}

async function requestPlayerTorpedoFire() {
  if (fireTorpedoRequestInFlight || playerDamageState !== "active") return;

  fireTorpedoRequestInFlight = true;
  try {
    const response = await fetch(getFireTorpedoEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        teamId: playerTeamId
      })
    });
    if (!response.ok) {
      throw new Error(`Fire torpedo request failed with ${response.status}`);
    }
    applyServerGameSnapshot(await response.json());
    document.body.dataset.fireTorpedoSync = "ok";
  } catch (error) {
    document.body.dataset.fireTorpedoSync = "error";
    document.body.dataset.fireTorpedoSyncError = error.message;
  } finally {
    fireTorpedoRequestInFlight = false;
  }
}

function applyServerGameSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.ships)) return;
  serverShipsById = indexShipsById(snapshot.ships);
  updateFleetStatus(snapshot.ships, snapshot.destroyedShipsByTeam);
  updatePlayerList(snapshot.ships, snapshot.killsByPlayer);

  const ownShip = snapshot.ships.find((ship) => ship.controlledBy === playerId && ship.teamId === playerTeamId);
  const previousOwnShip = snapshot.ships.find((ship) => ship.id === playerServerShipId);
  const activeIds = new Set(snapshot.ships.map((ship) => ship.id));
  if (ownShip) {
    const assignedShipChanged = playerServerShipId !== ownShip.id;
    if (assignedShipChanged && playerServerSnapshotReceived && playerServerShipId) {
      pendingPlayerServerShip = ownShip;
      document.body.dataset.pendingPlayerShipId = ownShip.id;
      if (playerDamageState === "active") {
        beginPlayerSinking(null, time);
      }
    } else if (playerDamageState === "sinking") {
      pendingPlayerServerShip = ownShip;
      document.body.dataset.pendingPlayerShipId = ownShip.id;
    } else {
      playerServerShipId = ownShip.id;
      document.body.dataset.playerShipId = playerServerShipId;
      document.body.dataset.pendingPlayerShipId = "";
      updatePlayerTorpedoStock(Number.isFinite(ownShip.torpedoesRemaining) ? ownShip.torpedoesRemaining : null);
      if (!playerServerSnapshotReceived || assignedShipChanged) {
        alignPlayerBoatToServerShip(ownShip);
        playerServerSnapshotReceived = true;
      } else {
        playerServerTarget = null;
        document.body.dataset.playerServerCorrection = "client-authoritative";
      }
    }
  } else if (
    playerServerSnapshotReceived &&
    playerServerShipId &&
    playerDamageState === "active" &&
    (!previousOwnShip || previousOwnShip.controlledBy !== playerId || previousOwnShip.state !== "active")
  ) {
    pendingPlayerServerShip = null;
    document.body.dataset.pendingPlayerShipId = "";
    beginPlayerSinking(null, time);
  }

  snapshot.ships
    .filter((ship) => ship.id !== playerServerShipId)
    .filter((ship) => ship.id !== pendingPlayerServerShip?.id)
    .forEach((ship) => updateOrCreateRemoteShip(ship));

  enemyMotions.forEach((motion) => {
    if (!activeIds.has(motion.id) || motion.id === playerServerShipId || motion.id === pendingPlayerServerShip?.id) {
      motion.root.setEnabled(false);
      motion.state = motion.id === playerServerShipId || motion.id === pendingPlayerServerShip?.id ? "hidden-own-ship" : "sunk";
    }
  });

  syncServerTorpedoes(
    Array.isArray(snapshot.torpedoes) ? snapshot.torpedoes : [],
    Array.isArray(snapshot.torpedoImpacts) ? snapshot.torpedoImpacts : []
  );
  document.body.dataset.remoteShips = String(snapshot.ships.length);
  document.body.dataset.serverTorpedoes = String(Array.isArray(snapshot.torpedoes) ? snapshot.torpedoes.length : 0);
  document.body.dataset.playerStateSync = "ok";
}

function alignPlayerBoatToServerShip(ship) {
  updatePlayerServerTarget(ship, null, true);
  boat.root.position.x = ship.x;
  boat.root.position.z = ship.z;
  heading = Number.isFinite(ship.heading) ? ship.heading : heading;
  speed = Number.isFinite(ship.speed) ? ship.speed : speed;
  engineOrder = Number.isInteger(ship.engineOrder) ? ship.engineOrder : engineOrder;
  rudderDegrees = Number.isFinite(ship.rudderDegrees) ? ship.rudderDegrees : rudderDegrees;
  turnVelocity = 0;
  playerServerPositionCorrection = Vector3.Zero();
  playerServerHeadingCorrection = 0;
  playerServerTurnRateCorrection = 0;
  boat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
  document.body.dataset.playerServerAligned = ship.id;
}

function updatePlayerServerTarget(ship, serverTime, force = false) {
  const previousPrediction = playerServerTarget?.id === ship.id
    ? predictPlayerServerMotion(playerServerTarget, clamp(time - playerServerTarget.receivedAt, 0, 0.35))
    : null;

  if (playerServerTarget?.id === ship.id) {
    const serverHeading = Number.isFinite(ship.heading) ? ship.heading : previousPrediction.heading;
    const headingError = Math.abs(getSignedAngularDistance(serverHeading, previousPrediction.heading));
    document.body.dataset.playerServerHeadingError = headingError.toFixed(4);
  }

  const nextTarget = createPlayerServerTarget(ship, serverTime);
  if (!force && playerServerTarget?.id === nextTarget.id && nextTarget.serverTime <= playerServerTarget.serverTime) {
    document.body.dataset.playerServerSnapshotIgnored = String(nextTarget.serverTime);
    return;
  }

  if (!force && previousPrediction) {
    const nextPrediction = predictPlayerServerMotion(nextTarget, 0);
    playerServerPositionCorrection = boat.root.position.subtract(nextPrediction.position);
    playerServerPositionCorrection.y = 0;
    playerServerHeadingCorrection = getSignedAngularDistance(heading, nextPrediction.heading);
    playerServerTurnRateCorrection = turnVelocity - nextTarget.turnRate;
    document.body.dataset.playerServerCorrection = `${playerServerPositionCorrection.length().toFixed(2)},${Math.abs(playerServerHeadingCorrection).toFixed(4)}`;
  } else {
    playerServerPositionCorrection = Vector3.Zero();
    playerServerHeadingCorrection = 0;
    playerServerTurnRateCorrection = 0;
  }

  playerServerTarget = nextTarget;
}

function createPlayerServerTarget(ship, serverTime) {
  const snapshotHeading = Number.isFinite(ship.heading) ? ship.heading : heading;
  const snapshotSpeed = Number.isFinite(ship.speed) ? ship.speed : speed;
  const previous = playerServerTarget?.id === ship.id ? playerServerTarget : null;
  const snapshotServerTime = Number.isFinite(serverTime) ? serverTime : (previous?.serverTime ?? time);
  const elapsed = previous ? snapshotServerTime - previous.serverTime : 0;
  const canComputeRates = previous && elapsed > 0.04;
  const rawTurnRate = Number.isFinite(ship.turnVelocity)
    ? ship.turnVelocity
    : canComputeRates
    ? getSignedAngularDistance(snapshotHeading, previous.heading) / elapsed
    : 0;

  return {
    id: ship.id,
    position: new Vector3(ship.x, 0.28, ship.z),
    heading: snapshotHeading,
    speed: snapshotSpeed,
    turnRate: clamp(rawTurnRate, -0.8, 0.8),
    speedRate: canComputeRates
      ? clamp((snapshotSpeed - previous.speed) / elapsed, -10, 10)
      : 0,
    engineOrder: Number.isInteger(ship.engineOrder) ? ship.engineOrder : engineOrder,
    rudderDegrees: Number.isFinite(ship.rudderDegrees) ? ship.rudderDegrees : rudderDegrees,
    serverTime: snapshotServerTime,
    receivedAt: time
  };
}

function applyPlayerServerTarget(dt) {
  if (!playerServerTarget) return;

  const snapshotAge = clamp(time - playerServerTarget.receivedAt, 0, 0.35);
  const prediction = predictPlayerServerMotion(playerServerTarget, snapshotAge);
  const correctedPosition = prediction.position.add(playerServerPositionCorrection);
  const correctedTurnRate = playerServerTarget.turnRate + playerServerTurnRateCorrection;
  const correctedHeading = prediction.heading + playerServerHeadingCorrection
    + playerServerTurnRateCorrection * Math.min(snapshotAge, 0.25);
  const distance = distance2D(correctedPosition, boat.root.position);

  boat.root.position.x = correctedPosition.x;
  boat.root.position.z = correctedPosition.z;
  heading = correctedHeading;
  speed = prediction.speed;
  turnVelocity = correctedTurnRate;
  const correctionDecay = Math.min(1, dt * 8.0);
  playerServerPositionCorrection.scaleInPlace(1 - correctionDecay);
  playerServerHeadingCorrection *= 1 - correctionDecay;
  playerServerTurnRateCorrection *= 1 - correctionDecay;
  document.body.dataset.playerServerDistance = distance.toFixed(2);
}

function predictPlayerServerMotion(target, age) {
  const steps = Math.max(1, Math.ceil(age / 0.035));
  const stepSeconds = steps === 0 ? 0 : age / steps;
  let predictedPosition = target.position.clone();
  let predictedHeading = target.heading;
  let predictedSpeed = target.speed;

  for (let index = 0; index < steps; index += 1) {
    const sampleTime = (index + 0.5) * stepSeconds;
    predictedHeading = target.heading + target.turnRate * sampleTime;
    predictedSpeed = target.speed + target.speedRate * sampleTime;
    predictedPosition = predictedPosition.add(
      new Vector3(Math.sin(predictedHeading), 0, Math.cos(predictedHeading)).scale(predictedSpeed * stepSeconds)
    );
  }

  return {
    position: predictedPosition,
    heading: target.heading + target.turnRate * age,
    speed: target.speed + target.speedRate * age
  };
}

function applyServerRadarSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.contacts)) return;

  serverRadarReady = true;
  serverRadarObserverPosition = Number.isFinite(snapshot.observerX) && Number.isFinite(snapshot.observerZ)
    ? new Vector3(snapshot.observerX, 0.28, snapshot.observerZ)
    : null;
  serverRadarObserverHeading = Number.isFinite(snapshot.observerHeading) ? snapshot.observerHeading : null;
  serverRadarRange = Number.isFinite(snapshot.range) ? snapshot.range : 360;
  serverRadarContacts = snapshot.contacts.map((contact) => {
    const ship = serverShipsById.get(contact.id);
    return {
      id: `radar-${contact.id}`,
      shipId: contact.id,
      team: contact.teamId === playerTeamId ? "light" : "dark",
      teamId: contact.teamId,
      controlledBy: ship?.controlledBy ?? "bot",
      label: createRadarContactLabel(ship ?? contact),
      position: new Vector3(contact.x, 0.28, contact.z),
      heading: contact.heading,
      distance: contact.distance,
      bearing: contact.bearing,
      serverVisible: true
    };
  });
  document.body.dataset.radarStateSync = "ok";
  document.body.dataset.radarShipId = snapshot.shipId ?? "";
  document.body.dataset.radarContacts = String(serverRadarContacts.length);
}

function connectGameEventStream() {
  const endpoint = getGameEventsEndpoint();
  gameEventSource?.close();
  gameEventSourceReady = false;
  document.body.dataset.gameEventSource = "connecting";
  document.body.dataset.gameEventEndpoint = endpoint;

  gameEventSource = new EventSource(endpoint);
  gameEventSource.onopen = () => {
    gameEventSourceReady = true;
    document.body.dataset.gameEventSource = "open";
  };
  gameEventSource.onmessage = (event) => {
    applyGameStreamMessage(event.data);
  };
  gameEventSource.onerror = () => {
    gameEventSourceReady = false;
    document.body.dataset.gameEventSource = "error";
  };
}

function applyGameStreamMessage(data) {
  let message;
  try {
    message = JSON.parse(data);
  } catch (error) {
    document.body.dataset.gameEventSource = "parse-error";
    document.body.dataset.gameEventError = error.message;
    return;
  }

  if (message.type !== "game-stream") {
    document.body.dataset.gameEventSource = "unexpected";
    return;
  }

  applyServerGameSnapshot(message.state);
  applyServerRadarSnapshot(message.radar);
  document.body.dataset.gameEventSource = gameEventSourceReady ? "open" : "message";
  document.body.dataset.gameEventTime = String(message.state?.t ?? "");
}

function updateOrCreateRemoteShip(ship) {
  const existing = enemyMotions.find((motion) => motion.id === ship.id);
  if (existing) {
    applyServerShipSnapshot(existing, ship);
    return existing;
  }

  const boatModel = createEnemyTorpedoBoat(scene, materials, `server_ship_${ship.id}`, ship.teamId, createShipDesignation(ship));
  const headingValue = Number.isFinite(ship.heading) ? ship.heading : 0;
  boatModel.root.position = new Vector3(ship.x, 0.26, ship.z);
  boatModel.root.rotationQuaternion = Quaternion.FromEulerAngles(0, headingValue, 0);
  boatModel.root.metadata = {
    serverShipId: ship.id,
    teamId: ship.teamId,
    controlledBy: ship.controlledBy
  };
  const motion = createEnemyMotion(boatModel.root, boatModel.bowWake, headingValue, ship.engineOrder ?? 2, enemyMotions.length, ship);
  enemyMotions.push(motion);
  return motion;
}

function applyServerShipSnapshot(motion, ship) {
  if (motion.state === "sinking") return;

  if (ship.state === "sunk") {
    motion.serverState = "sunk";
    motion.serverPosition.x = Number.isFinite(ship.x) ? ship.x : motion.serverPosition.x;
    motion.serverPosition.z = Number.isFinite(ship.z) ? ship.z : motion.serverPosition.z;
    motion.serverHeading = Number.isFinite(ship.heading) ? ship.heading : motion.serverHeading;
    motion.root.position.x = motion.serverPosition.x;
    motion.root.position.z = motion.serverPosition.z;
    motion.heading = Number.isFinite(ship.heading) ? ship.heading : motion.heading;
    motion.root.setEnabled(true);
    beginEnemySinking(motion, getStableSinkSide(motion.id), time);
    return;
  }

  const correctionDistance = distance2D(motion.root.position, { x: ship.x, z: ship.z });
  remoteCorrectionSamples += 1;
  remoteCorrectionTotal += correctionDistance;
  remoteCorrectionMax = Math.max(remoteCorrectionMax, correctionDistance);
  document.body.dataset.remoteCorrection = correctionDistance.toFixed(2);
  document.body.dataset.remoteCorrectionAvg = (remoteCorrectionTotal / remoteCorrectionSamples).toFixed(2);
  document.body.dataset.remoteCorrectionMax = remoteCorrectionMax.toFixed(2);

  motion.teamId = ship.teamId;
  motion.controlledBy = ship.controlledBy;
  motion.serverState = ship.state;
  motion.serverPosition.x = Number.isFinite(ship.x) ? ship.x : motion.serverPosition.x;
  motion.serverPosition.z = Number.isFinite(ship.z) ? ship.z : motion.serverPosition.z;
  motion.serverHeading = Number.isFinite(ship.heading) ? ship.heading : motion.serverHeading;
  motion.serverSpeed = Number.isFinite(ship.speed) ? ship.speed : motion.serverSpeed;
  motion.serverSnapshotTime = time;
  motion.heading = Number.isFinite(ship.heading) ? blendAngle(motion.heading, ship.heading, 0.18) : motion.heading;
  motion.speed = Number.isFinite(ship.speed) ? motion.speed + (ship.speed - motion.speed) * 0.18 : motion.speed;
  motion.engineOrder = Number.isInteger(ship.engineOrder) ? ship.engineOrder : motion.engineOrder;
  motion.rudder = Number.isFinite(ship.rudderDegrees) ? clamp(ship.rudderDegrees / maxRudderDegrees, -1, 1) : motion.rudder;
  if (correctionDistance > 55) {
    motion.root.position.x = motion.serverPosition.x;
    motion.root.position.z = motion.serverPosition.z;
  }
  motion.root.setEnabled(true);
  motion.state = "active";
  motion.root.metadata = {
    ...motion.root.metadata,
    teamId: ship.teamId,
    controlledBy: ship.controlledBy
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function updateNavigationInstruments(mapCanvas, radarCanvas, radarStatus, playerPosition, radarContacts, landZones, heading) {
  drawMapInstrument(mapCanvas, playerPosition, landZones, mapZoom);
  drawRadarInstrument(radarCanvas, radarStatus, playerPosition, radarContacts, landZones, heading, serverRadarRange);
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

  drawMapSectorGrid(ctx, bounds, width, height, scale);

  const visibleLandZones = landZones.filter((zone) => zoneIntersectsBounds(zone, bounds));
  drawMapLandUnion(ctx, visibleLandZones, bounds, width, height, scale);
  drawMapLandLabels(ctx, visibleLandZones, bounds, width, height, scale);

  const playerPoint = clampInstrumentPoint(worldToMapPoint(playerPosition, bounds, width, height, scale), width, height, 6);
  drawMapShipMarker(ctx, playerPoint.x, playerPoint.y, "#f7fbff", heading);

  if (mapSectorValue) mapSectorValue.textContent = formatMapSector(playerPosition);
  if (mapCoordinateValue) mapCoordinateValue.textContent = `${formatWorldCoordinate(playerPosition)}\n${formatMapBounds(bounds)}\nZoom x${zoomScale}`;
  updateMapGridEdgeLabels(bounds, width, height, scale);
}

function drawMapSectorGrid(ctx, bounds, width, height, scale) {
  const { firstCol, lastCol, firstRow, lastRow } = getVisibleMapSectorRange(bounds);

  ctx.save();
  ctx.strokeStyle = "rgba(247, 251, 255, 0.18)";
  ctx.lineWidth = 1;

  for (let col = firstCol; col <= lastCol + 1; col += 1) {
    const worldX = col * mapSectorSize - mapSectorOrigin;
    const x = worldToMapPoint({ x: worldX, z: bounds.maxZ }, bounds, width, height, scale).x;
    if (x < -0.5 || x > width + 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, height);
    ctx.stroke();
  }

  for (let row = firstRow; row <= lastRow + 1; row += 1) {
    const worldZ = mapSectorOrigin - row * mapSectorSize;
    const y = worldToMapPoint({ x: bounds.minX, z: worldZ }, bounds, width, height, scale).y;
    if (y < -0.5 || y > height + 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRadarInstrument(canvas, statusElement, playerPosition, radarContacts, landZones, heading, range = 360) {
  if (!canvas) return;

  const ctx = prepareInstrumentCanvas(canvas);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radius = Math.min(width, height) * 0.5 - 7;
  const radarRange = range;
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

  drawRadarLandUnion(ctx, landZones, playerPosition, centerX, centerY, scale, heading, width, height);

  const contacts = radarContacts
    .map((contact) => ({
      ...contact,
      distance: Number.isFinite(contact.distance) ? contact.distance : distance2D(playerPosition, contact.position),
      blocked: contact.serverVisible ? false : isLineBlockedByLand(playerPosition, contact.position, landZones)
    }))
    .filter((contact) => contact.distance <= radarRange);
  const visibleContacts = contacts.filter((contact) => !contact.blocked);
  visibleContacts.forEach((contact) => {
    const contactPoint = worldToRadarPoint(contact.position, playerPosition, centerX, centerY, scale, heading);
    drawRadarContactMarker(ctx, contactPoint.x, contactPoint.y, contact.team, false, contact.heading, heading, contact.label);
  });

  const nearestVisible = visibleContacts.reduce((nearest, contact) => (
    !nearest || contact.distance < nearest.distance ? contact : nearest
  ), null);
  const nearestShadow = contacts.reduce((nearest, contact) => (
    contact.blocked && (!nearest || contact.distance < nearest.distance) ? contact : nearest
  ), null);

  if (nearestVisible) {
    const suffix = visibleContacts.length > 1 ? ` x${visibleContacts.length}` : "";
    const label = nearestVisible.team === "light" ? "Own" : "Enemy";
    if (statusElement) statusElement.textContent = `${label} ${formatWorldDistance(nearestVisible.distance)}${suffix}`;
  } else if (nearestShadow) {
    if (statusElement) statusElement.textContent = `Shadow ${formatWorldDistance(nearestShadow.distance)}`;
  } else {
    if (statusElement) statusElement.textContent = `Clear ${formatWorldDistance(radarRange)}`;
  }

  drawRadarContactMarker(ctx, centerX, centerY, "light", true);
  ctx.restore();

  ctx.strokeStyle = "rgba(155, 229, 223, 0.62)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  drawRadarCompassRing(ctx, centerX, centerY, radius, heading);
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

function bearingToRadarPoint(bearing, distance, centerX, centerY, scale) {
  return {
    x: centerX + Math.sin(bearing) * distance * scale,
    y: centerY - Math.cos(bearing) * distance * scale
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

function drawMapLandUnion(ctx, zones, bounds, width, height, scale) {
  if (zones.length === 0) return;

  const mask = document.createElement("canvas");
  mask.width = Math.max(1, Math.ceil(width));
  mask.height = Math.max(1, Math.ceil(height));
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return;

  maskCtx.fillStyle = "#ffffff";
  zones.forEach((zone) => addMapLandPath(maskCtx, zone, bounds, width, height, scale));

  ctx.save();
  ctx.drawImage(createColoredMaskCanvas(mask, "rgba(98, 129, 89, 0.95)"), 0, 0, width, height);
  drawMaskOutline(ctx, mask, "rgba(238, 218, 164, 0.78)");
  ctx.restore();

  zones.forEach((zone) => drawMapLandWater(ctx, zone, bounds, width, height, scale));
}

function addMapLandPath(ctx, zone, bounds, width, height, scale) {
  ctx.beginPath();
  if (zone.kind !== "coastline") {
    const point = worldToMapPoint(zone, bounds, width, height, scale);
    ctx.ellipse(
      point.x,
      point.y,
      Math.max(1, getZoneVisualRx(zone) * scale),
      Math.max(1, getZoneVisualRz(zone) * scale),
      0,
      0,
      Math.PI * 2
    );
  } else {
    const points = getCoastContourPoints(zone, 96).map((point) => worldToMapPoint(point, bounds, width, height, scale));
    if (points.length < 3) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
  }
  ctx.fill();
}

function createColoredMaskCanvas(mask, fillStyle) {
  const colored = document.createElement("canvas");
  colored.width = mask.width;
  colored.height = mask.height;
  const coloredCtx = colored.getContext("2d");
  if (!coloredCtx) return mask;
  coloredCtx.fillStyle = fillStyle;
  coloredCtx.fillRect(0, 0, colored.width, colored.height);
  coloredCtx.globalCompositeOperation = "destination-in";
  coloredCtx.drawImage(mask, 0, 0);
  return colored;
}

function drawMaskOutline(ctx, mask, strokeStyle) {
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return;
  const { width, height } = mask;
  const pixels = maskCtx.getImageData(0, 0, width, height).data;
  ctx.fillStyle = strokeStyle;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;
      const touchesWater =
        pixels[(y * width + x - 1) * 4 + 3] === 0 ||
        pixels[(y * width + x + 1) * 4 + 3] === 0 ||
        pixels[((y - 1) * width + x) * 4 + 3] === 0 ||
        pixels[((y + 1) * width + x) * 4 + 3] === 0;
      if (touchesWater) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function formatMapBounds(bounds) {
  const { firstCol, lastCol, firstRow, lastRow } = getVisibleMapSectorRange(bounds);
  const colStart = formatSectorColumn(Math.max(0, firstCol));
  const colEnd = formatSectorColumn(Math.max(0, lastCol));
  const rowStart = Math.max(1, firstRow + 1);
  const rowEnd = Math.max(1, lastRow + 1);
  return `Cols ${colStart}-${colEnd}\nRows ${rowStart}-${rowEnd}`;
}

function updateMapGridEdgeLabels(bounds, width, height, scale) {
  const { firstCol, lastCol, firstRow, lastRow } = getVisibleMapSectorRange(bounds);

  if (mapColumnLabels) {
    mapColumnLabels.innerHTML = "";
    for (let col = Math.max(0, firstCol); col <= Math.max(0, lastCol); col += 1) {
      const centerWorldX = col * mapSectorSize - mapSectorOrigin + mapSectorSize * 0.5;
      const x = worldToMapPoint({ x: centerWorldX, z: bounds.maxZ }, bounds, width, height, scale).x;
      if (x < 0 || x > width) continue;
      const label = document.createElement("span");
      label.textContent = formatSectorColumn(col);
      label.style.left = `${x}px`;
      mapColumnLabels.append(label);
    }
  }

  if (mapRowLabels) {
    mapRowLabels.innerHTML = "";
    for (let row = Math.max(0, firstRow); row <= Math.max(0, lastRow); row += 1) {
      const centerWorldZ = mapSectorOrigin - row * mapSectorSize - mapSectorSize * 0.5;
      const y = worldToMapPoint({ x: bounds.minX, z: centerWorldZ }, bounds, width, height, scale).y;
      if (y < 0 || y > height) continue;
      const label = document.createElement("span");
      label.textContent = String(row + 1);
      label.style.top = `${y}px`;
      mapRowLabels.append(label);
    }
  }
}

function getVisibleMapSectorRange(bounds) {
  const epsilon = 0.000001;
  return {
    firstCol: Math.floor((bounds.minX + mapSectorOrigin) / mapSectorSize),
    lastCol: Math.floor((bounds.maxX - epsilon + mapSectorOrigin) / mapSectorSize),
    firstRow: Math.floor((mapSectorOrigin - bounds.maxZ + epsilon) / mapSectorSize),
    lastRow: Math.floor((mapSectorOrigin - bounds.minZ - epsilon) / mapSectorSize)
  };
}

function drawMapLandLabel(ctx, zone, bounds, width, height, scale) {
  const area = getZoneVisualRx(zone) * getZoneVisualRz(zone);
  const screenWidth = getZoneVisualRx(zone) * scale * 2;
  const screenHeight = getZoneVisualRz(zone) * scale * 2;
  if (area < 3300 || screenWidth < 28 || screenHeight < 16) return;

  const label = getLandDisplayName(zone);
  const point = worldToMapPoint(zone, bounds, width, height, scale);
  if (point.x < 18 || point.x > width - 18 || point.y < 18 || point.y > height - 40) return;

  ctx.save();
  ctx.font = "800 9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(5, 27, 40, 0.82)";
  ctx.fillStyle = "rgba(247, 251, 255, 0.76)";
  ctx.strokeText(label, point.x, point.y);
  ctx.fillText(label, point.x, point.y);
  ctx.restore();
}

function drawMapLandLabels(ctx, zones, bounds, width, height, scale) {
  const groups = new Map();

  zones.forEach((zone) => {
    const area = getZoneVisualRx(zone) * getZoneVisualRz(zone);
    const screenWidth = getZoneVisualRx(zone) * scale * 2;
    const screenHeight = getZoneVisualRz(zone) * scale * 2;
    if (area < 3300 || screenWidth < 28 || screenHeight < 16) return;

    const label = getLandDisplayName(zone);
    const group = groups.get(label) ?? { label, x: 0, z: 0, weight: 0 };
    group.x += zone.x * area;
    group.z += zone.z * area;
    group.weight += area;
    groups.set(label, group);
  });

  groups.forEach((group) => {
    if (group.weight <= 0) return;
    drawMapLandLabelAt(ctx, group.label, { x: group.x / group.weight, z: group.z / group.weight }, bounds, width, height);
  });
}

function drawMapLandLabelAt(ctx, label, position, bounds, width, height) {
  const point = worldToMapPoint(position, bounds, width, height, Math.min(width / (bounds.maxX - bounds.minX), height / (bounds.maxZ - bounds.minZ)));
  if (point.x < 18 || point.x > width - 18 || point.y < 18 || point.y > height - 40) return;

  ctx.save();
  ctx.font = "800 9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(5, 27, 40, 0.82)";
  ctx.fillStyle = "rgba(247, 251, 255, 0.76)";
  ctx.strokeText(label, point.x, point.y);
  ctx.fillText(label, point.x, point.y);
  ctx.restore();
}

function getLandDisplayName(zone) {
  const names = {
    western_coast: "Western Coast",
    volcanic_highland: "Volcano Highland",
    fjord_coast: "Fjord Coast",
    storm_peak: "Storm Peak",
    mist_gate_north: "Mist Gate",
    mist_gate_south: "Mist Gate",
    mist_gate_east: "Mist Gate",
    northern_ridge: "Northern Ridge",
    north_sound_west: "North Sound",
    north_sound_east: "North Sound",
    north_sound_outer: "North Sound",
    eastern_delta_coast: "Delta Coast",
    southern_cliffs: "Southern Cliffs",
    crown_mountain: "Crown Mountain",
    western_continent: "Western Continent",
    western_continent_north: "Western Continent",
    western_continent_south: "Western Continent",
    western_sound_north_bank: "Western Sound",
    western_sound_south_bank: "Western Sound"
  };

  return names[zone.name] ?? zone.name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function drawRadarLandZone(ctx, zone, playerPosition, centerX, centerY, scale, heading) {
  if (zone.kind !== "coastline") {
    const point = worldToRadarPoint(zone, playerPosition, centerX, centerY, scale, heading);
    drawInstrumentEllipse(ctx, point.x, point.y, getZoneRadarRx(zone) * scale, getZoneRadarRz(zone) * scale, "rgba(96, 124, 83, 0.92)", "rgba(232, 217, 159, 0.4)", -heading);
    return;
  }

  const points = getCoastContourPoints(zone, 80).map((point) => worldToRadarPoint(point, playerPosition, centerX, centerY, scale, heading));
  drawInstrumentPolygon(ctx, points, "rgba(96, 124, 83, 0.92)", "rgba(232, 217, 159, 0.46)");
  drawRadarLandWater(ctx, zone, playerPosition, centerX, centerY, scale, heading);
}

function drawRadarLandUnion(ctx, zones, playerPosition, centerX, centerY, scale, heading, width, height) {
  if (zones.length === 0) return;

  const mask = document.createElement("canvas");
  mask.width = Math.max(1, Math.ceil(width));
  mask.height = Math.max(1, Math.ceil(height));
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return;

  maskCtx.fillStyle = "#ffffff";
  zones.forEach((zone) => addRadarLandPath(maskCtx, zone, playerPosition, centerX, centerY, scale, heading));

  ctx.save();
  ctx.drawImage(createColoredMaskCanvas(mask, "rgba(96, 124, 83, 0.92)"), 0, 0, width, height);
  drawMaskOutline(ctx, mask, "rgba(232, 217, 159, 0.46)");
  ctx.restore();

  zones.forEach((zone) => drawRadarLandWater(ctx, zone, playerPosition, centerX, centerY, scale, heading));
}

function addRadarLandPath(ctx, zone, playerPosition, centerX, centerY, scale, heading) {
  ctx.beginPath();
  if (zone.kind !== "coastline") {
    const point = worldToRadarPoint(zone, playerPosition, centerX, centerY, scale, heading);
    ctx.ellipse(
      point.x,
      point.y,
      Math.max(1, getZoneRadarRx(zone) * scale),
      Math.max(1, getZoneRadarRz(zone) * scale),
      -heading,
      0,
      Math.PI * 2
    );
  } else {
    const points = getCoastContourPoints(zone, 80).map((point) => worldToRadarPoint(point, playerPosition, centerX, centerY, scale, heading));
    if (points.length < 3) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
  }
  ctx.fill();
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

function drawMapShipMarker(ctx, x, y, color, markerHeading) {
  const size = 7;
  const noseX = Math.sin(markerHeading) * size;
  const noseY = -Math.cos(markerHeading) * size;
  const sideX = Math.cos(markerHeading) * size * 0.48;
  const sideY = Math.sin(markerHeading) * size * 0.48;
  const sternX = -Math.sin(markerHeading) * size * 0.58;
  const sternY = Math.cos(markerHeading) * size * 0.58;

  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(2, 16, 21, 0.82)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + noseX, y + noseY);
  ctx.lineTo(x + sternX + sideX, y + sternY + sideY);
  ctx.lineTo(x + sternX - sideX, y + sternY - sideY);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

function drawRadarContactMarker(ctx, x, y, team, isPlayer = false, contactHeading = null, radarHeading = 0, label = "") {
  const color = team === "light" ? "#7fd7ff" : "#ff6b4a";
  const ring = team === "light" ? "rgba(127, 215, 255, 0.42)" : "rgba(255, 107, 74, 0.48)";
  const radius = isPlayer ? 4.2 : 4;

  if (!isPlayer && Number.isFinite(contactHeading)) {
    drawRadarShipMarker(ctx, x, y, color, contactHeading - radarHeading);
  } else {
    drawInstrumentMarker(ctx, x, y, color, radius);
  }
  ctx.strokeStyle = ring;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, radius + 3.2, 0, Math.PI * 2);
  ctx.stroke();

  if (!isPlayer && label) {
    ctx.font = "700 9px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(2, 16, 21, 0.92)";
    ctx.strokeText(label, x + 9, y - 8);
    ctx.fillStyle = color;
    ctx.fillText(label, x + 9, y - 8);
  }
}

function drawRadarCompassRing(ctx, centerX, centerY, radius, radarHeading) {
  const labels = [
    ["N", 0],
    ["E", Math.PI / 2],
    ["S", Math.PI],
    ["W", -Math.PI / 2]
  ];
  const labelRadius = Math.max(12, radius - 13);

  ctx.save();
  ctx.font = "800 10px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(216, 236, 242, 0.82)";
  ctx.strokeStyle = "rgba(2, 16, 21, 0.74)";
  ctx.lineWidth = 3;

  labels.forEach(([label, worldBearing]) => {
    const relative = worldBearing - radarHeading;
    const x = centerX + Math.sin(relative) * labelRadius;
    const y = centerY - Math.cos(relative) * labelRadius;
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
  });
  ctx.restore();
}

function drawRadarShipMarker(ctx, x, y, color, relativeHeading) {
  const noseX = Math.sin(relativeHeading) * 7;
  const noseY = -Math.cos(relativeHeading) * 7;
  const sideX = Math.cos(relativeHeading) * 3.4;
  const sideY = Math.sin(relativeHeading) * 3.4;
  const sternX = -Math.sin(relativeHeading) * 4.4;
  const sternY = Math.cos(relativeHeading) * 4.4;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + noseX, y + noseY);
  ctx.lineTo(x + sternX + sideX, y + sternY + sideY);
  ctx.lineTo(x + sternX - sideX, y + sternY - sideY);
  ctx.closePath();
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
  if (!zone.radarOcclusion) return;

  const dx = zone.x - playerPosition.x;
  const dz = zone.z - playerPosition.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const landRadius = Math.max(getZoneVisualRx(zone), getZoneVisualRz(zone)) * radarOcclusionScale;
  const shadowStartDistance = distance - landRadius;

  // If the coarse occlusion shape reaches the player, drawing a shadow from
  // the center is more misleading than helpful. Shadows start behind land.
  if (distance < 1 || shadowStartDistance <= 0 || shadowStartDistance > radarRange) return;

  const centerAngle = Math.atan2(dx, dz) - heading;
  const halfAngle = Math.asin(clamp(landRadius / Math.max(distance, landRadius), 0, 0.95));
  const near = clamp(shadowStartDistance / radarRange, 0.04, 1) * radius;
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
  const startInsideOccluder = (ox * ox) / (rx * rx) + (oz * oz) / (rz * rz) <= 1;

  if (startInsideOccluder) return false;

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

function formatHeadingDegrees(headingValue) {
  const degrees = Math.round(((headingValue * 180 / Math.PI) % 360 + 360) % 360);
  return String(degrees).padStart(3, "0");
}

function formatMapSector(position) {
  const x = Number.isFinite(position.x) ? position.x : 0;
  const z = Number.isFinite(position.z) ? position.z : 0;
  const colIndex = Math.max(0, Math.floor((x + mapSectorOrigin) / mapSectorSize));
  const rowIndex = Math.max(0, Math.floor((mapSectorOrigin - z) / mapSectorSize));

  return `${formatSectorColumn(colIndex)}${rowIndex + 1}`;
}

function formatSectorColumn(index) {
  let value = index;
  let label = "";

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

function getZoneVisualRx(zone) {
  return zone.visualRx ?? zone.rx;
}

function getZoneVisualRz(zone) {
  return zone.visualRz ?? zone.rz;
}

function getZoneRadarRx(zone) {
  return getZoneVisualRx(zone);
}

function getZoneRadarRz(zone) {
  return getZoneVisualRz(zone);
}

function createShipDesignation(ship) {
  const match = String(ship.id ?? "").match(/(\d+)$/);
  const number = match ? Number.parseInt(match[1], 10) : 0;
  const base = getTeamDefinition(ship.teamId)?.shipBase ?? 50;
  return `S ${base + number}`;
}

function createRadarContactLabel(ship) {
  const controlledBy = ship?.controlledBy ?? "bot";
  if (controlledBy && controlledBy !== "bot") {
    return getPlayerInitials(controlledBy);
  }
  return createShipDesignation(ship);
}

function getPlayerInitials(playerIdentifier) {
  const match = String(playerIdentifier ?? "").match(/^player-([a-z0-9]{1,5})-/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return sanitizeInitials(playerIdentifier) || "PL";
}

function indexShipsById(ships) {
  return new Map((ships ?? []).map((ship) => [ship.id, ship]));
}

function createEnemyFleet(scene, materials, serverShips) {
  return serverShips.map((ship, index) => {
    const enemyBoat = createEnemyTorpedoBoat(scene, materials, `server_ship_${ship.id}`, ship.teamId, createShipDesignation(ship));
    const heading = Number.isFinite(ship.heading) ? ship.heading : 0;
    const engineOrder = Number.isInteger(ship.engineOrder) ? ship.engineOrder : 2;
    enemyBoat.root.position = new Vector3(ship.x, 0.26, ship.z);
    enemyBoat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
    enemyBoat.root.metadata = {
      serverShipId: ship.id,
      teamId: ship.teamId,
      controlledBy: ship.controlledBy
    };
    return createEnemyMotion(enemyBoat.root, enemyBoat.bowWake, heading, engineOrder, index, ship);
  });
}

function createEnemyMotion(root, bowWake, heading, engineOrder, index = 0, serverShip = null) {
  return {
    id: serverShip?.id ?? `local-${index + 1}`,
    numericIndex: index + 1,
    teamId: serverShip?.teamId ?? "unknown",
    controlledBy: serverShip?.controlledBy ?? "local",
    serverState: serverShip?.state ?? "active",
    root,
    bowWake,
    heading,
    speed: serverShip?.speed ?? 0,
    isServerControlled: Boolean(serverShip),
    serverPosition: new Vector3(serverShip?.x ?? root.position.x, 0.28, serverShip?.z ?? root.position.z),
    serverHeading: Number.isFinite(serverShip?.heading) ? serverShip.heading : heading,
    serverSpeed: Number.isFinite(serverShip?.speed) ? serverShip.speed : 0,
    serverSnapshotTime: 0,
    turnVelocity: 0,
    rollImpulse: 0,
    engineOrder,
    rudder: 0,
    state: "active",
    sinkAge: 0,
    sinkSide: -1,
    sinkStartY: root.position.y,
    timers: [],
    nextTube: 0,
    nextFireTime: 24 + index * 6
  };
}

function startLocalEnemyEventSource(motion, index = 0) {
  const events = [
    { delay: 1000, engineOrder: 3 + (index % 2), rudder: 0.1 - index * 0.03 },
    { delay: 3600, engineOrder: 6 + (index % 3), rudder: -0.2 + index * 0.05 },
    { delay: 7600, engineOrder: 3, rudder: -0.08 - index * 0.03 },
    { delay: 11600, engineOrder: 5, rudder: 0.22 - index * 0.04 },
    { delay: 15400, engineOrder: 2 + (index % 2), rudder: 0 },
    { delay: 19000, engineOrder: 8, rudder: -0.18 + index * 0.04 },
    { delay: 22400, engineOrder: 3 + (index % 3), rudder: -0.25 + index * 0.035 },
    { delay: 28600, engineOrder: 4 + (index % 2), rudder: 0.16 - index * 0.03 },
    { delay: 34000, engineOrder: 3, rudder: 0 }
  ];

  events.forEach((event) => {
    const timer = window.setTimeout(() => {
      applyEnemyMotionEvent(motion, event);
    }, event.delay + index * 850);
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

function updateEnemyMotion(motion, dt, time, playerPosition, landZones) {
  if (motion.state === "sunk") return;

  if (motion.state === "sinking") {
    updateEnemySinking(motion, dt, time);
    return;
  }

  if (motion.state !== "active") return;

  if (motion.isServerControlled) {
    updateServerEnemyMotion(motion, dt, time);
    return;
  }

  updateEnemyHelmTowardTarget(motion, playerPosition, landZones, time);

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

function updateServerEnemyMotion(motion, dt, time) {
  const snapshotAge = Math.max(0, time - (motion.serverSnapshotTime ?? time));
  const serverForward = new Vector3(Math.sin(motion.serverHeading), 0, Math.cos(motion.serverHeading));
  const projectedServerPosition = motion.serverPosition.add(serverForward.scale(motion.serverSpeed * snapshotAge));
  const correctionDistance = distance2D(motion.root.position, projectedServerPosition);

  motion.speed += (motion.serverSpeed - motion.speed) * Math.min(1, dt * 3.5);
  motion.heading = blendAngle(motion.heading, motion.serverHeading, Math.min(1, dt * 3.2));

  const forward = new Vector3(Math.sin(motion.heading), 0, Math.cos(motion.heading));
  motion.root.position.addInPlace(forward.scale(motion.speed * dt));

  const correctionStrength = correctionDistance > 18 ? 4.2 : 1.8;
  motion.root.position.x += (projectedServerPosition.x - motion.root.position.x) * Math.min(1, dt * correctionStrength);
  motion.root.position.z += (projectedServerPosition.z - motion.root.position.z) * Math.min(1, dt * correctionStrength);
  motion.root.position.y = 0.28 + Math.sin(time * 1.6 + 1.9) * 0.04;
  motion.root.rotationQuaternion = Quaternion.FromEulerAngles(
    Math.sin(time * 1.9 + 0.8) * 0.015,
    motion.heading,
    Math.sin(time * 1.4) * 0.01
  );
  updateEnemyBowWake(motion.bowWake, motion.speed, time);

  document.body.dataset.enemy = `${motion.root.position.x.toFixed(1)},${motion.root.position.z.toFixed(1)}`;
  document.body.dataset.enemyEngineOrder = engineOrders[motion.engineOrder].label;
  document.body.dataset.enemySpeed = motion.speed.toFixed(1);
}

function updateEnemyHelmTowardTarget(motion, playerPosition, landZones, time) {
  if (motion.teamId === playerTeamId) return;

  const distance = distance2D(playerPosition, motion.root.position);
  if (distance < 70 || distance > enemyTargetingRange) return;
  if (isLineBlockedByLand(motion.root.position, playerPosition, landZones)) return;

  const targetHeading = Math.atan2(
    playerPosition.x - motion.root.position.x,
    playerPosition.z - motion.root.position.z
  );
  const imperfectHeading = targetHeading + Math.sin(time * 0.48 + motion.numericIndex * 1.7) * 0.075;
  const headingError = getSignedAngularDistance(imperfectHeading, motion.heading);

  motion.rudder = clamp(headingError / 0.62, -1, 1);
  if (distance > 250) {
    motion.engineOrder = Math.max(motion.engineOrder, 5);
  } else if (distance < 130) {
    motion.engineOrder = Math.min(motion.engineOrder, 3);
  } else {
    motion.engineOrder = clamp(motion.engineOrder, 3, 5);
  }
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

function getRadarContacts(enemyMotions) {
  if (serverRadarReady) {
    return serverRadarContacts;
  }

  return enemyMotions
    .filter(() => false);
}

function beginPlayerSinking(hitPosition, now) {
  if (playerDamageState !== "active") return;

  playerDamageState = "sinking";
  playerSinkStartTime = now;
  playerSinkStartY = boat.root.position.y;
  playerSinkSide = getPlayerSinkSide(hitPosition, boat.root.position, heading);
  engineOrder = 2;
  heldRudderDirection = 0;
  rudderDegrees = 0;
  turnVelocity *= 0.25;
  speed *= 0.18;
  updateSinkingWaterOverlay(0);
}

function updatePlayerSinking(playerBoat, now) {
  const age = now - playerSinkStartTime;
  const t = clamp(age / 4.6, 0, 1);
  const ease = easeInOutCubic(t);
  const bob = Math.sin(now * 3.4) * (1 - t) * 0.05;

  playerBoat.root.position.y = playerSinkStartY - ease * 2.25 + bob;
  playerBoat.root.rotationQuaternion = Quaternion.FromEulerAngles(
    -ease * 0.32 + Math.sin(now * 1.8) * (1 - t) * 0.025,
    heading,
    playerSinkSide * (0.16 + ease * 1.18)
  );
  updateSinkingWaterOverlay(smoothstep(0.08, 0.92, t) * 0.96);

  if (t >= 1) {
    respawnPlayerBoat(playerBoat);
  }
}

function respawnPlayerBoat(playerBoat) {
  if (pendingPlayerServerShip) {
    const nextShip = pendingPlayerServerShip;
    pendingPlayerServerShip = null;
    playerServerShipId = nextShip.id;
    document.body.dataset.playerShipId = playerServerShipId;
    document.body.dataset.pendingPlayerShipId = "";
    alignPlayerBoatToServerShip(nextShip);
    updatePlayerTorpedoStock(Number.isFinite(nextShip.torpedoesRemaining) ? nextShip.torpedoesRemaining : null);
    playerDamageState = "active";
    updateSinkingWaterOverlay(0);
    return;
  }

  playerRespawnIndex = (playerRespawnIndex + 1) % playerRespawnPoints.length;
  const spawn = playerRespawnPoints[playerRespawnIndex];

  playerBoat.root.position.copyFrom(spawn.position);
  heading = spawn.heading;
  speed = 0;
  turnVelocity = 0;
  rudderDegrees = 0;
  engineOrder = 2;
  ramShake = 0.72;
  playerDamageState = "active";
  playerServerShipId = null;
  document.body.dataset.playerShipId = "pending";
  playerBoat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
  updateSinkingWaterOverlay(0);
}

function updateSinkingWaterOverlay(level) {
  if (!sinkingWaterOverlay) return;

  const visibleLevel = clamp(level, 0, 1);
  sinkingWaterOverlay.style.setProperty("--sink-water-level", visibleLevel.toFixed(3));
  sinkingWaterOverlay.style.setProperty("--sink-water-opacity", visibleLevel > 0.015 ? "1" : "0");
}

function getPlayerSinkSide(hitPosition, playerPosition, playerHeading) {
  if (!hitPosition) return -1;

  const dx = hitPosition.x - playerPosition.x;
  const dz = hitPosition.z - playerPosition.z;
  const right = dx * Math.cos(playerHeading) - dz * Math.sin(playerHeading);
  return right >= 0 ? -1 : 1;
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
    serverVisuals: new Map(),
    serverImpactIds: new Set(),
    nextTube: 0,
    nextFireTime: 0,
    nextEnemyFireTime: 10,
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
    owner: "player",
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

function fireEnemyTorpedo(system, motion, targetPosition, now) {
  if (motion.state !== "active" || now < motion.nextFireTime || now < system.nextEnemyFireTime) return false;

  const aimJitter = (pseudoRandom(system.nextId + motion.numericIndex * 17, 97) - 0.5) * enemyTorpedoAimJitterRadians;
  const launchHeading = motion.heading + aimJitter;
  const forward = getForwardVector(launchHeading);
  const right = getRightVector(launchHeading);
  const tubeSide = motion.nextTube === 0 ? -1 : 1;
  motion.nextTube = 1 - motion.nextTube;
  motion.nextFireTime = now + 34 + motion.numericIndex * 4.5;
  system.nextEnemyFireTime = now + 18;

  const launchStart = motion.root.position
    .add(right.scale(tubeSide * 0.44))
    .add(forward.scale(3.65))
    .add(new Vector3(0, 0.42, 0));
  const launchEnd = motion.root.position
    .add(right.scale(tubeSide * 0.44))
    .add(forward.scale(4.35))
    .add(new Vector3(0, 0.04, 0));
  const runStart = motion.root.position
    .add(right.scale(tubeSide * 0.44))
    .add(forward.scale(4.65))
    .add(new Vector3(0, 0.05, 0));

  const root = new TransformNode(`enemy_torpedo_${system.nextId}`, system.scene);
  root.parent = system.root;
  root.position.copyFrom(launchStart);
  root.rotationQuaternion = Quaternion.FromEulerAngles(0, launchHeading, 0);

  const body = MeshBuilder.CreateCylinder(`${root.name}_body`, {
    diameter: 0.18,
    height: 3.5,
    tessellation: 12
  }, system.scene);
  body.parent = root;
  body.rotation.x = Math.PI / 2;
  body.material = system.materials.funnel;

  const nose = MeshBuilder.CreateCylinder(`${root.name}_nose`, {
    diameterTop: 0.035,
    diameterBottom: 0.18,
    height: 0.34,
    tessellation: 12
  }, system.scene);
  nose.parent = root;
  nose.position.z = 1.92;
  nose.rotation.x = Math.PI / 2;
  nose.material = system.materials.funnel;

  const wake = createTorpedoWake(system.scene, system.materials, root.name);
  system.active.push({
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
    speed: 21 + Math.max(0, motion.speed) * 0.25,
    owner: "enemy",
    launchDuration: 0.24,
    maxRange: 520,
    hit: false
  });
  createLaunchPuff(system, launchStart.add(forward.scale(0.2)), launchHeading, tubeSide);
  system.nextId += 1;
  return true;
}

function updateEnemyFireControl(system, enemyMotions, playerPosition, landZones, time) {
  enemyMotions.forEach((motion) => {
    if (motion.state !== "active") return;
    if (motion.isServerControlled) return;
    if (motion.teamId === playerTeamId) return;

    const distance = distance2D(playerPosition, motion.root.position);
    if (distance < 75 || distance > 330) return;
    if (!isTargetInEnemyTorpedoArc(motion, playerPosition)) return;
    if (isLineBlockedByLand(motion.root.position, playerPosition, landZones)) return;

    fireEnemyTorpedo(system, motion, playerPosition, time);
  });
}

function isTargetInEnemyTorpedoArc(motion, targetPosition) {
  const targetHeading = Math.atan2(
    targetPosition.x - motion.root.position.x,
    targetPosition.z - motion.root.position.z
  );
  return getAngularDistance(targetHeading, motion.heading) <= enemyTorpedoFireArcRadians;
}

function syncServerTorpedoes(torpedoes, impacts = []) {
  const activeIds = new Set();

  torpedoes.forEach((snapshot) => {
    activeIds.add(snapshot.id);
    const visual = torpedoSystem.serverVisuals.get(snapshot.id) ?? createServerTorpedoVisual(torpedoSystem, snapshot);
    applyServerTorpedoSnapshot(visual, snapshot);
  });

  renderServerTorpedoImpacts(impacts);

  torpedoSystem.serverVisuals.forEach((visual, id) => {
    if (activeIds.has(id)) return;

    disposeServerTorpedoVisual(visual);
    torpedoSystem.serverVisuals.delete(id);
  });
}

function renderServerTorpedoImpacts(impacts) {
  impacts.forEach((impact) => {
    const key = `${impact.id}:${impact.reason}:${impact.t}`;
    if (torpedoSystem.serverImpactIds.has(key)) return;
    torpedoSystem.serverImpactIds.add(key);

    const position = new Vector3(
      Number.isFinite(impact.x) ? impact.x : 0,
      0.05,
      Number.isFinite(impact.z) ? impact.z : 0
    );
    const headingValue = Number.isFinite(impact.heading) ? impact.heading : 0;
    torpedoSystem.hits += 1;
    if (impact.reason === "expired") {
      createRangeSplash(torpedoSystem, position, headingValue);
    } else {
      createHitChurn(torpedoSystem, position, headingValue);
    }
  });

  if (torpedoSystem.serverImpactIds.size > 120) {
    torpedoSystem.serverImpactIds = new Set(Array.from(torpedoSystem.serverImpactIds).slice(-80));
  }
}

function createServerTorpedoVisual(system, snapshot) {
  const root = new TransformNode(`server_torpedo_${snapshot.id}`, system.scene);
  root.parent = system.root;
  const launch = getServerTorpedoLaunch(system, snapshot);
  root.position.copyFrom(launch.start);
  root.rotationQuaternion = Quaternion.FromEulerAngles(0, launch.heading, 0);

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

  const visual = {
    id: snapshot.id,
    root,
    body,
    nose,
    wake: createTorpedoWake(system.scene, system.materials, root.name),
    heading: Number.isFinite(snapshot.heading) ? snapshot.heading : 0,
    forward: getForwardVector(Number.isFinite(snapshot.heading) ? snapshot.heading : 0),
    speed: Number.isFinite(snapshot.speed) ? snapshot.speed : 24,
    serverPosition: new Vector3(snapshot.x, 0.05, snapshot.z),
    serverSnapshotTime: time,
    runDistance: 0,
    launchBlendUntil: launch.blendUntil
  };
  system.serverVisuals.set(snapshot.id, visual);

  if (launch.showMuzzleEffect) {
    createLaunchPuff(system, launch.puffPosition, launch.heading, launch.tubeSide);
    createMuzzleEffect(system, launch.muzzlePosition, launch.heading, launch.tubeSide);
  }
  return visual;
}

function getServerTorpedoLaunch(system, snapshot) {
  const heading = Number.isFinite(snapshot.heading) ? snapshot.heading : 0;
  const forward = getForwardVector(heading);
  const serverPosition = new Vector3(snapshot.x, 0.05, snapshot.z);

  if (snapshot.shipId !== playerServerShipId) {
    return {
      heading,
      start: serverPosition,
      puffPosition: serverPosition,
      muzzlePosition: serverPosition,
      tubeSide: 1,
      blendUntil: 0,
      showMuzzleEffect: false
    };
  }

  const tubeSide = system.nextTube === 0 ? -1 : 1;
  system.nextTube = 1 - system.nextTube;
  const right = getRightVector(heading);
  const tuning = torpedoLaunchDefaults;
  const tubeX = tubeSide * tuning.tubeX;
  const tubeStartZ = tuning.startZ;
  const muzzleZ = 3.05;
  const start = boat.root.position
    .add(right.scale(tubeX))
    .add(forward.scale(tubeStartZ))
    .add(new Vector3(0, tuning.startY, 0));
  const muzzlePosition = boat.root.position
    .add(right.scale(tubeSide * 0.32))
    .add(forward.scale(tubeStartZ))
    .add(new Vector3(0, tuning.startY, 0));
  const puffPosition = boat.root.position
    .add(right.scale(tubeSide * 0.32))
    .add(forward.scale(muzzleZ + 0.4))
    .add(new Vector3(0, -0.04, 0));

  return {
    heading,
    start,
    puffPosition,
    muzzlePosition,
    tubeSide,
    blendUntil: time + 0.34,
    showMuzzleEffect: true
  };
}

function applyServerTorpedoSnapshot(visual, snapshot) {
  visual.serverPosition = new Vector3(snapshot.x, 0.05, snapshot.z);
  visual.serverSnapshotTime = time;
  visual.heading = Number.isFinite(snapshot.heading) ? snapshot.heading : visual.heading;
  visual.forward = getForwardVector(visual.heading);
  visual.speed = Number.isFinite(snapshot.speed) ? snapshot.speed : visual.speed;

  if (!visual.root.rotationQuaternion) {
    visual.root.rotationQuaternion = Quaternion.FromEulerAngles(0, visual.heading, 0);
  }
  if (time >= (visual.launchBlendUntil ?? 0) && distance2D(visual.root.position, visual.serverPosition) > 45) {
    visual.root.position.copyFrom(visual.serverPosition);
  }
}

function updateServerTorpedoVisuals(system, dt, now) {
  system.serverVisuals.forEach((visual) => {
    const snapshotAge = Math.max(0, now - (visual.serverSnapshotTime ?? now));
    const forward = visual.forward;
    const projected = visual.serverPosition.add(forward.scale(visual.speed * snapshotAge));
    const step = visual.speed * dt;

    visual.root.position.addInPlace(forward.scale(step));
    visual.root.position.x += (projected.x - visual.root.position.x) * Math.min(1, dt * 4.5);
    visual.root.position.z += (projected.z - visual.root.position.z) * Math.min(1, dt * 4.5);
    visual.root.position.y = 0.05 + Math.sin(now * 7.5 + getNameSeed(visual.id)) * 0.012;
    visual.root.rotationQuaternion = Quaternion.FromEulerAngles(0, visual.heading, 0);
    visual.runDistance += step;
    updateTorpedoWake(visual, true, now);
  });
}

function disposeServerTorpedoVisual(visual) {
  visual.wake.forEach((segment) => segment.dispose());
  visual.root.getChildMeshes().forEach((mesh) => mesh.dispose());
  visual.root.dispose();
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

function updateTorpedoSystem(system, dt, time, enemyMotions, landZones, playerPosition) {
  let playerHit = 0;
  let playerHitPosition = null;

  system.hitEffects = system.hitEffects.filter((effect) => {
    effect.age += dt;
    const t = effect.age / effect.lifetime;
    if (t >= 1) {
      if (effect.light) effect.light.dispose();
      if (effect.mesh) {
        if (effect.disposeTexture && effect.texture) effect.texture.dispose();
        if (effect.disposeMaterial && effect.mesh.material) effect.mesh.material.dispose();
        effect.mesh.dispose();
      }
      return false;
    }

    const eased = easeOutCubic(t);
    if (effect.light) {
      const flash = Math.sin(Math.PI * t);
      effect.light.intensity = effect.intensity * flash * (1 - t * 0.35);
      effect.light.range = effect.range * (0.65 + eased * 0.7);
    }
    if (effect.skyFlash && effect.mesh) {
      const pulse = Math.sin(Math.PI * t);
      effect.mesh.position.copyFrom(effect.origin);
      effect.mesh.material.alpha = effect.alpha * pulse * (1 - t * 0.18);
      effect.mesh.scaling.x = effect.baseScale.x * (1 + eased * effect.grow.x);
      effect.mesh.scaling.y = effect.baseScale.y * (1 + eased * effect.grow.y);
      effect.mesh.scaling.z = effect.baseScale.z * (1 + eased * effect.grow.z);
      effect.mesh.setEnabled(t < 0.98);
      return true;
    }
    if (effect.mesh) {
      effect.mesh.position.x = effect.origin.x + effect.velocity.x * t;
      effect.mesh.position.z = effect.origin.z + effect.velocity.z * t;
      effect.mesh.position.y = effect.origin.y + effect.velocity.y * t - effect.gravity * t * t + Math.sin(time * 9 + effect.seed) * 0.01;
      effect.mesh.scaling.x = effect.baseScale.x * (1 + eased * effect.grow.x);
      effect.mesh.scaling.y = effect.baseScale.y * (1 + eased * effect.grow.y);
      effect.mesh.scaling.z = effect.baseScale.z * (1 + eased * effect.grow.z);
      effect.mesh.setEnabled(t < 0.96);
    }
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

    const hitEnemy = torpedo.owner === "player" ? getTorpedoEnemyHit(torpedo.root.position, enemyMotions) : null;
    if (!torpedo.hit && hitEnemy) {
      torpedo.hit = true;
      system.hits += 1;
      beginEnemySinking(hitEnemy, getEnemySinkSide(torpedo.root.position, hitEnemy), time);
      recordTorpedoEvent(system, torpedo, "enemy-hit", time, {
        enemyId: hitEnemy.id,
        enemyPosition: summarizeVector(hitEnemy.root.position)
      }, landZones);
      createHitChurn(system, torpedo.root.position, torpedo.heading);
      disposeTorpedo(torpedo);
      return false;
    }

    if (!torpedo.hit && torpedo.owner === "enemy" && torpedoHitsPlayer(torpedo.root.position, playerPosition)) {
      torpedo.hit = true;
      playerHit += 1;
      playerHitPosition = torpedo.root.position.clone();
      recordTorpedoEvent(system, torpedo, "player-hit", time, {
        playerPosition: summarizeVector(playerPosition)
      }, landZones);
      createHitChurn(system, torpedo.root.position, torpedo.heading);
      disposeTorpedo(torpedo);
      return false;
    }

    const landHit = getTorpedoLandHit(torpedo.root.position, landZones);
    if (!torpedo.hit && landHit) {
      torpedo.hit = true;
      system.hits += 1;
      recordTorpedoEvent(system, torpedo, "land-hit", time, { landHit }, landZones);
      createHitChurn(system, torpedo.root.position, torpedo.heading);
      disposeTorpedo(torpedo);
      return false;
    }

    if (torpedo.runDistance > torpedo.maxRange) {
      recordTorpedoEvent(system, torpedo, "range-expired", time, {}, landZones);
      disposeTorpedo(torpedo);
      return false;
    }

    return true;
  });

  return { playerHit, playerHitPosition };
}

function torpedoHitsLand(torpedoPosition, landZones) {
  return Boolean(getTorpedoLandHit(torpedoPosition, landZones));
}

function getTorpedoLandHit(torpedoPosition, landZones) {
  for (const zone of landZones) {
    if (isInLandWater(torpedoPosition, zone)) return null;

    const rx = getZoneVisualRx(zone) + 0.35;
    const rz = getZoneVisualRz(zone) + 0.35;
    const nx = (torpedoPosition.x - zone.x) / rx;
    const nz = (torpedoPosition.z - zone.z) / rz;
    const normalizedDistance = Math.sqrt(nx * nx + nz * nz);

    if (normalizedDistance <= 1) {
      return {
        zone: zone.name,
        kind: zone.kind,
        normalizedDistance: Number(normalizedDistance.toFixed(3)),
        visualRx: Number(getZoneVisualRx(zone).toFixed(2)),
        visualRz: Number(getZoneVisualRz(zone).toFixed(2)),
        localX: Number((torpedoPosition.x - zone.x).toFixed(2)),
        localZ: Number((torpedoPosition.z - zone.z).toFixed(2))
      };
    }
  }

  return null;
}

function recordTorpedoEvent(system, torpedo, reason, time, details = {}, landZones = []) {
  const snapshot = createTorpedoExplosionSnapshot(system, torpedo, reason, time, details, landZones);
  const log = window.__seaBattleTorpedoLog ?? [];
  log.push(snapshot);
  window.__seaBattleTorpedoLog = log.slice(-torpedoLogLimit);
  window.__seaBattleLastTorpedoSnapshot = snapshot;
  document.body.dataset.lastTorpedoEvent = JSON.stringify(snapshot);

  try {
    localStorage.setItem("seaBattle.lastTorpedoSnapshot", JSON.stringify(snapshot));
  } catch {
    // The in-memory log is enough if the browser disallows storage.
  }

  console.info("[sea-battle] torpedo snapshot", snapshot);
}

function createTorpedoExplosionSnapshot(system, torpedo, reason, time, details, landZones) {
  const entry = {
    reason,
    id: torpedo.id,
    owner: torpedo.owner,
    time: Number(time.toFixed(2)),
    age: Number(torpedo.age.toFixed(2)),
    runDistance: Number(torpedo.runDistance.toFixed(2)),
    speed: Number(torpedo.speed.toFixed(2)),
    heading: Number(torpedo.heading.toFixed(3)),
    position: summarizeVector(torpedo.root.position),
    player: {
      position: summarizeVector(boat.root.position),
      heading: Number(heading.toFixed(3)),
      speed: Number(speed.toFixed(2)),
      engineOrder: engineOrders[engineOrder]?.label ?? String(engineOrder),
      rudderDegrees: Number(rudderDegrees.toFixed(1)),
      damageState: playerDamageState
    },
    nearbyLand: getNearbyLandSnapshot(torpedo.root.position, landZones),
    activeTorpedoes: system.active.map((activeTorpedo) => ({
      id: activeTorpedo.id,
      owner: activeTorpedo.owner,
      age: Number(activeTorpedo.age.toFixed(2)),
      runDistance: Number(activeTorpedo.runDistance.toFixed(2)),
      position: summarizeVector(activeTorpedo.root.position)
    })),
    enemies: enemyMotions.map((motion) => ({
      id: motion.id,
      state: motion.state,
      position: summarizeVector(motion.root.position),
      heading: Number(motion.heading.toFixed(3)),
      speed: Number(motion.speed.toFixed(2)),
      engineOrder: engineOrders[motion.engineOrder]?.label ?? String(motion.engineOrder)
    })),
    details
  };

  return entry;
}

function getNearbyLandSnapshot(position, landZones) {
  return landZones
    .map((zone) => {
      const visualRx = getZoneVisualRx(zone);
      const visualRz = getZoneVisualRz(zone);
      const nx = (position.x - zone.x) / visualRx;
      const nz = (position.z - zone.z) / visualRz;
      const normalizedDistance = Math.sqrt(nx * nx + nz * nz);

      return {
        name: zone.name,
        kind: zone.kind,
        normalizedDistance: Number(normalizedDistance.toFixed(3)),
        centerDistance: Number(distance2D(position, zone).toFixed(2)),
        localX: Number((position.x - zone.x).toFixed(2)),
        localZ: Number((position.z - zone.z).toFixed(2)),
        inLandWater: isInLandWater(position, zone)
      };
    })
    .sort((a, b) => a.normalizedDistance - b.normalizedDistance)
    .slice(0, 5);
}

function summarizeVector(vector) {
  return {
    x: Number(vector.x.toFixed(2)),
    y: Number(vector.y.toFixed(2)),
    z: Number(vector.z.toFixed(2))
  };
}

function getPlayerRamHit(playerPosition, playerHeading, playerSpeed, enemyMotions, time) {
  if (time < nextRamHitTime || playerSpeed < 2.2) return null;

  const forward = getForwardVector(playerHeading);
  const right = getRightVector(playerHeading);
  const bowCenter = playerPosition.add(forward.scale(4.45));
  const bowProbePoints = [
    bowCenter,
    bowCenter.add(right.scale(0.34)),
    bowCenter.add(right.scale(-0.34))
  ];

  for (const enemyMotion of enemyMotions) {
    if (enemyMotion.teamId === playerTeamId) continue;
    const hitPoint = bowProbePoints.find((point) => pointHitsEnemyHull(point, enemyMotion, 0.16));
    if (!hitPoint) continue;

    const enemyLocalHit = getEnemyHitLocalPoint(hitPoint, enemyMotion.root.position, enemyMotion.heading);
    return {
      motion: enemyMotion,
      position: hitPoint,
      side: enemyLocalHit.right >= 0 ? -1 : 1
    };
  }

  return null;
}

function getRamShakeOffset(heading, strength, time) {
  if (strength <= 0.001) return Vector3.Zero();

  const right = getRightVector(heading);
  const pulse = Math.sin(time * 42) * strength;
  return right.scale(pulse * 0.08).add(new Vector3(0, strength * 0.035, 0));
}

function getTorpedoEnemyHit(torpedoPosition, enemyMotions) {
  return enemyMotions.find((enemyMotion) => (
    enemyMotion.teamId !== playerTeamId &&
    pointHitsEnemyHull(torpedoPosition, enemyMotion, 0.22)
  )) ?? null;
}

function torpedoHitsPlayer(torpedoPosition, playerPosition) {
  const dx = torpedoPosition.x - playerPosition.x;
  const dz = torpedoPosition.z - playerPosition.z;
  return dx * dx + dz * dz <= 1.9 * 1.9;
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

function getStableSinkSide(id) {
  const text = String(id ?? "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return hash % 2 === 0 ? 1 : -1;
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

function createRangeSplash(system, position, heading) {
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);

  for (let i = 0; i < 5; i += 1) {
    const patch = createJaggedSurfacePatch(`torpedo_range_splash_${system.hits}_${i}`, system.scene, 0.42 + i * 0.11, 0.28 + i * 0.06, i + 40);
    patch.parent = system.root;
    patch.material = system.materials.foam;
    patch.position.copyFrom(
      position
        .add(forward.scale((i - 2) * 0.06))
        .add(right.scale(((i % 3) - 1) * 0.08))
        .add(new Vector3(0, 0.048 + i * 0.002, 0))
    );
    patch.rotation.y = heading + i * 0.52;
    system.hitEffects.push({
      mesh: patch,
      age: 0,
      lifetime: 0.78 + i * 0.04,
      origin: patch.position.clone(),
      velocity: forward.scale(-0.025 * i).add(right.scale(((i % 2) * 2 - 1) * 0.035)).add(new Vector3(0, 0.01, 0)),
      gravity: 0.025,
      baseScale: patch.scaling.clone(),
      grow: new Vector3(1.1 + i * 0.12, 0.06, 0.78 + i * 0.08),
      seed: i + 40
    });
  }
}

function createHitChurn(system, position, heading) {
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);
  createExplosionLightFlash(system, position);
  createExplosionSkyFlash(system, position);

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

function createExplosionLightFlash(system, position) {
  if (isExplosionLightOccludedFromPlayer(position)) {
    return;
  }

  const activeFlashes = system.hitEffects.filter((effect) => effect.light);
  activeFlashes.slice(0, Math.max(0, activeFlashes.length - 2)).forEach((effect) => {
    effect.age = effect.lifetime;
  });

  const light = new PointLight(`torpedo_flash_${system.hits}`, position.add(new Vector3(0, 3.4, 0)), system.scene);
  light.diffuse = new Color3(1.0, 0.7, 0.38);
  light.specular = new Color3(1.0, 0.82, 0.5);
  light.intensity = 0;
  light.range = 115;
  system.hitEffects.push({
    light,
    age: 0,
    lifetime: 0.78,
    intensity: 4.8,
    range: 115
  });
}

function isExplosionLightOccludedFromPlayer(position) {
  const playerPosition = boat?.root?.position;
  if (!playerPosition) return false;
  const flashRange = 115;
  if (distance2D(position, playerPosition) > flashRange) return true;
  return isLineBlockedByLand(position, playerPosition, blockedWaters);
}

function createExplosionSkyFlash(system, position) {
  const activeSkyFlashes = system.hitEffects.filter((effect) => effect.skyFlash);
  activeSkyFlashes.slice(0, Math.max(0, activeSkyFlashes.length - 2)).forEach((effect) => {
    effect.age = effect.lifetime;
  });

  const texture = createRadialFlashTexture(system.scene, `torpedo_sky_flash_texture_${system.hits}`);
  const material = new StandardMaterial(`torpedo_sky_flash_material_${system.hits}`, system.scene);
  material.diffuseColor = new Color3(1.0, 0.62, 0.34);
  material.emissiveColor = new Color3(1.0, 0.46, 0.18);
  material.specularColor = Color3.Black();
  material.opacityTexture = texture;
  material.alpha = 0;
  material.disableLighting = true;
  material.fogEnabled = false;
  material.backFaceCulling = false;

  const flash = MeshBuilder.CreatePlane(`torpedo_sky_flash_${system.hits}`, { width: 170, height: 96 }, system.scene);
  flash.parent = system.root;
  flash.position.copyFrom(position.add(new Vector3(0, 68, 0)));
  flash.billboardMode = Mesh.BILLBOARDMODE_ALL;
  flash.material = material;
  flash.isPickable = false;

  const distanceToPlayer = distance2D(position, boat.root.position);
  const distanceAlpha = 0.62 + 0.38 * (1 - clamp(distanceToPlayer / 1200, 0, 1));

  system.hitEffects.push({
    mesh: flash,
    skyFlash: true,
    texture,
    disposeTexture: true,
    disposeMaterial: true,
    age: 0,
    lifetime: 0.95,
    origin: flash.position.clone(),
    baseScale: new Vector3(1, 1, 1),
    grow: new Vector3(0.55, 0.38, 0.55),
    alpha: 0.34 * distanceAlpha
  });
}

function createRadialFlashTexture(scene, name) {
  const size = 256;
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const center = size * 0.5;
  const gradient = context.createRadialGradient(center, center, size * 0.02, center, center, size * 0.48);
  gradient.addColorStop(0, "rgba(255, 232, 176, 1)");
  gradient.addColorStop(0.28, "rgba(255, 154, 72, 0.76)");
  gradient.addColorStop(0.58, "rgba(255, 102, 38, 0.28)");
  gradient.addColorStop(1, "rgba(255, 102, 38, 0)");
  context.clearRect(0, 0, size, size);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.hasAlpha = true;
  texture.update();
  return texture;
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
  shallow.diffuseColor = new Color3(0.03, 0.33, 0.48);
  shallow.emissiveColor = new Color3(0.0, 0.04, 0.055);
  shallow.specularColor = new Color3(0.55, 0.78, 0.9);
  shallow.alpha = 1;

  const rock = new StandardMaterial("rock_material", scene);
  rock.diffuseColor = new Color3(0.32, 0.34, 0.31);
  rock.specularColor = new Color3(0.03, 0.03, 0.03);

  const hull = new StandardMaterial("hull_material", scene);
  hull.diffuseColor = new Color3(0.18, 0.21, 0.21);
  hull.specularColor = new Color3(0.07, 0.08, 0.08);
  hull.backFaceCulling = false;

  const deck = new StandardMaterial("deck_material", scene);
  deck.diffuseColor = new Color3(0.15, 0.17, 0.17);
  deck.specularColor = new Color3(0.06, 0.07, 0.07);
  deck.backFaceCulling = false;

  const cabin = new StandardMaterial("cabin_material", scene);
  cabin.diffuseColor = new Color3(0.22, 0.25, 0.25);
  cabin.specularColor = new Color3(0.1, 0.12, 0.12);
  cabin.backFaceCulling = false;

  const funnel = new StandardMaterial("funnel_material", scene);
  funnel.diffuseColor = new Color3(0.16, 0.18, 0.18);
  funnel.specularColor = new Color3(0.05, 0.05, 0.05);
  funnel.backFaceCulling = false;

  const glass = new StandardMaterial("glass_material", scene);
  glass.diffuseColor = new Color3(0.18, 0.42, 0.54);
  glass.emissiveColor = new Color3(0.02, 0.08, 0.1);
  glass.specularColor = new Color3(0.7, 0.9, 1);

  const lightHull = new StandardMaterial("light_party_hull_material", scene);
  lightHull.diffuseColor = new Color3(0.43, 0.5, 0.51);
  lightHull.specularColor = new Color3(0.12, 0.14, 0.14);
  lightHull.backFaceCulling = false;

  const lightDeck = new StandardMaterial("light_party_deck_material", scene);
  lightDeck.diffuseColor = new Color3(0.48, 0.55, 0.56);
  lightDeck.specularColor = new Color3(0.13, 0.15, 0.15);
  lightDeck.backFaceCulling = false;

  const lightCabin = new StandardMaterial("light_party_cabin_material", scene);
  lightCabin.diffuseColor = new Color3(0.62, 0.68, 0.69);
  lightCabin.specularColor = new Color3(0.16, 0.18, 0.18);
  lightCabin.backFaceCulling = false;

  const lightFunnel = new StandardMaterial("light_party_funnel_material", scene);
  lightFunnel.diffuseColor = new Color3(0.5, 0.56, 0.57);
  lightFunnel.specularColor = new Color3(0.13, 0.15, 0.15);
  lightFunnel.backFaceCulling = false;

  const playerLightHull = new StandardMaterial("player_light_hull_material", scene);
  playerLightHull.diffuseColor = new Color3(0.32, 0.39, 0.4);
  playerLightHull.specularColor = new Color3(0.1, 0.12, 0.12);
  playerLightHull.backFaceCulling = false;

  const playerLightDeck = new StandardMaterial("player_light_deck_material", scene);
  playerLightDeck.diffuseColor = new Color3(0.34, 0.4, 0.41);
  playerLightDeck.specularColor = new Color3(0.1, 0.12, 0.12);
  playerLightDeck.backFaceCulling = false;

  const playerLightCabin = new StandardMaterial("player_light_cabin_material", scene);
  playerLightCabin.diffuseColor = new Color3(0.42, 0.48, 0.49);
  playerLightCabin.specularColor = new Color3(0.12, 0.14, 0.14);
  playerLightCabin.backFaceCulling = false;

  const playerLightFunnel = new StandardMaterial("player_light_funnel_material", scene);
  playerLightFunnel.diffuseColor = new Color3(0.34, 0.4, 0.41);
  playerLightFunnel.specularColor = new Color3(0.1, 0.12, 0.12);
  playerLightFunnel.backFaceCulling = false;

  const darkHull = new StandardMaterial("dark_party_hull_material", scene);
  darkHull.diffuseColor = new Color3(0.12, 0.14, 0.14);
  darkHull.specularColor = new Color3(0.05, 0.06, 0.06);
  darkHull.backFaceCulling = false;

  const darkDeck = new StandardMaterial("dark_party_deck_material", scene);
  darkDeck.diffuseColor = new Color3(0.1, 0.12, 0.12);
  darkDeck.specularColor = new Color3(0.04, 0.05, 0.05);
  darkDeck.backFaceCulling = false;

  const darkCabin = new StandardMaterial("dark_party_cabin_material", scene);
  darkCabin.diffuseColor = new Color3(0.17, 0.18, 0.18);
  darkCabin.specularColor = new Color3(0.08, 0.09, 0.09);
  darkCabin.backFaceCulling = false;

  const darkFunnel = new StandardMaterial("dark_party_funnel_material", scene);
  darkFunnel.diffuseColor = new Color3(0.1, 0.11, 0.11);
  darkFunnel.specularColor = new Color3(0.04, 0.04, 0.04);
  darkFunnel.backFaceCulling = false;

  const greenHull = new StandardMaterial("green_party_hull_material", scene);
  greenHull.diffuseColor = new Color3(0.18, 0.3, 0.23);
  greenHull.specularColor = new Color3(0.06, 0.08, 0.06);
  greenHull.backFaceCulling = false;

  const greenDeck = new StandardMaterial("green_party_deck_material", scene);
  greenDeck.diffuseColor = new Color3(0.2, 0.34, 0.25);
  greenDeck.specularColor = new Color3(0.06, 0.08, 0.06);
  greenDeck.backFaceCulling = false;

  const greenCabin = new StandardMaterial("green_party_cabin_material", scene);
  greenCabin.diffuseColor = new Color3(0.26, 0.4, 0.3);
  greenCabin.specularColor = new Color3(0.08, 0.1, 0.08);
  greenCabin.backFaceCulling = false;

  const greenFunnel = new StandardMaterial("green_party_funnel_material", scene);
  greenFunnel.diffuseColor = new Color3(0.15, 0.25, 0.19);
  greenFunnel.specularColor = new Color3(0.05, 0.06, 0.05);
  greenFunnel.backFaceCulling = false;

  const sandHull = new StandardMaterial("sand_party_hull_material", scene);
  sandHull.diffuseColor = new Color3(0.45, 0.39, 0.28);
  sandHull.specularColor = new Color3(0.1, 0.08, 0.05);
  sandHull.backFaceCulling = false;

  const sandDeck = new StandardMaterial("sand_party_deck_material", scene);
  sandDeck.diffuseColor = new Color3(0.5, 0.44, 0.31);
  sandDeck.specularColor = new Color3(0.1, 0.08, 0.05);
  sandDeck.backFaceCulling = false;

  const sandCabin = new StandardMaterial("sand_party_cabin_material", scene);
  sandCabin.diffuseColor = new Color3(0.58, 0.51, 0.37);
  sandCabin.specularColor = new Color3(0.12, 0.1, 0.06);
  sandCabin.backFaceCulling = false;

  const sandFunnel = new StandardMaterial("sand_party_funnel_material", scene);
  sandFunnel.diffuseColor = new Color3(0.42, 0.36, 0.26);
  sandFunnel.specularColor = new Color3(0.08, 0.07, 0.05);
  sandFunnel.backFaceCulling = false;

  const foam = new StandardMaterial("foam_material", scene);
  foam.diffuseColor = new Color3(0.9, 0.97, 0.96);
  foam.emissiveColor = new Color3(0.18, 0.22, 0.22);
  foam.specularColor = new Color3(0.05, 0.06, 0.06);

  const volcanicSmoke = new StandardMaterial("volcanic_smoke_material", scene);
  volcanicSmoke.diffuseColor = new Color3(0.19, 0.21, 0.2);
  volcanicSmoke.emissiveColor = new Color3(0.03, 0.035, 0.03);
  volcanicSmoke.specularColor = new Color3(0, 0, 0);
  volcanicSmoke.alpha = 0.42;
  volcanicSmoke.backFaceCulling = false;

  const volcanicSmokeWarm = new StandardMaterial("volcanic_smoke_warm_material", scene);
  volcanicSmokeWarm.diffuseColor = new Color3(0.25, 0.21, 0.18);
  volcanicSmokeWarm.emissiveColor = new Color3(0.08, 0.045, 0.025);
  volcanicSmokeWarm.specularColor = new Color3(0, 0, 0);
  volcanicSmokeWarm.alpha = 0.38;
  volcanicSmokeWarm.backFaceCulling = false;

  const volcanicGlow = new StandardMaterial("volcanic_glow_material", scene);
  volcanicGlow.diffuseColor = new Color3(1.0, 0.31, 0.06);
  volcanicGlow.emissiveColor = new Color3(1.0, 0.22, 0.02);
  volcanicGlow.specularColor = new Color3(0.15, 0.06, 0.02);
  volcanicGlow.alpha = 0.88;

  return {
    water,
    sand,
    grass,
    terrain,
    shallow,
    rock,
    hull,
    deck,
    cabin,
    funnel,
    glass,
    lightHull,
    lightDeck,
    lightCabin,
    lightFunnel,
    playerLightHull,
    playerLightDeck,
    playerLightCabin,
    playerLightFunnel,
    darkHull,
    darkDeck,
    darkCabin,
    darkFunnel,
    greenHull,
    greenDeck,
    greenCabin,
    greenFunnel,
    sandHull,
    sandDeck,
    sandCabin,
    sandFunnel,
    foam,
    volcanicSmoke,
    volcanicSmokeWarm,
    volcanicGlow
  };
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
  const windSpeed = 0.775;
  const waveTravelAngle = windAngle + Math.PI / 2;

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
      driftX: Math.sin(waveTravelAngle) * windSpeed + (seed.driftX - 0.5) * 0.28,
      driftZ: Math.cos(waveTravelAngle) * windSpeed + (seed.driftZ - 0.5) * 0.28,
      baseAngle: windAngle,
      baseLength: 1 + seed.length * 0.34,
      phase: seed.spin * Math.PI * 2
    });
  }

  return { area, patches };
}

function updateFoamPatches(foam, center, time) {
  const halfArea = foam.area / 2;

  foam.patches.forEach((patch) => {
    patch.mesh.position.x = center.x + wrapCentered(patch.x + time * patch.driftX - center.x, foam.area);
    patch.mesh.position.z = center.z + wrapCentered(patch.z + time * patch.driftZ - center.z, foam.area);
    const wave = Math.sin(time * 2.2 + patch.phase + patch.x * 0.07 + patch.z * 0.03);
    patch.mesh.position.y = 0.13 + wave * 0.014;
    patch.mesh.rotation.y = patch.baseAngle;
    patch.mesh.scaling.z = patch.baseLength * (0.82 + Math.max(0, wave) * 0.28);

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

function getShipTeamMaterials(materials, teamId) {
  const key = getTeamDefinition(teamId)?.id ?? "dark";
  const prefix = `${key[0].toUpperCase()}${key.slice(1)}`;
  return {
    hull: materials[`${key}Hull`] ?? materials[`player${prefix}Hull`] ?? materials.darkHull ?? materials.hull,
    deck: materials[`${key}Deck`] ?? materials[`player${prefix}Deck`] ?? materials.darkDeck ?? materials.deck,
    cabin: materials[`${key}Cabin`] ?? materials[`player${prefix}Cabin`] ?? materials.darkCabin ?? materials.cabin,
    funnel: materials[`${key}Funnel`] ?? materials[`player${prefix}Funnel`] ?? materials.darkFunnel ?? materials.funnel
  };
}

function getPlayerShipTeamMaterials(materials, teamId) {
  if (getTeamDefinition(teamId)?.id === "light") {
    return {
      hull: materials.playerLightHull ?? materials.lightHull ?? materials.hull,
      deck: materials.playerLightDeck ?? materials.lightDeck ?? materials.deck,
      cabin: materials.playerLightCabin ?? materials.lightCabin ?? materials.cabin,
      funnel: materials.playerLightFunnel ?? materials.lightFunnel ?? materials.funnel
    };
  }

  return getShipTeamMaterials(materials, teamId);
}

// Player ship is only the visible foredeck. It still uses absolute team colors,
// otherwise every client would incorrectly see its own party as the light one.
function createPlayerBow(scene, materials, name = "player_bow", teamId = "light") {
  const root = new TransformNode(name, scene);
  const teamMaterials = getPlayerShipTeamMaterials(materials, teamId);
  const hullMaterial = teamMaterials.hull;
  const deckMaterial = teamMaterials.deck;
  const tubeMaterial = teamMaterials.hull;

  const hull = createTaperedHull(`${name}_hull`, scene, [
    { z: -1.35, width: 1.7, top: 0.72, bottom: 0.12 },
    { z: 2.55, width: 1.18, top: 0.68, bottom: 0.02 },
    { z: 5.15, width: 0.16, top: 0.64, bottom: 0.0 }
  ]);
  hull.parent = root;
  hull.material = hullMaterial;

  const deck = createTaperedDeck(`${name}_foredeck`, scene, [
    { z: -1.08, width: 1.35, y: 0.78 },
    { z: 2.55, width: 0.96, y: 0.76 },
    { z: 4.75, width: 0.24, y: 0.72 }
  ]);
  deck.parent = root;
  deck.material = deckMaterial;

  const rearDeck = MeshBuilder.CreateBox(`${name}_rear_deck`, { width: 1.42, height: 0.12, depth: 0.72 }, scene);
  rearDeck.parent = root;
  rearDeck.position.y = 0.82;
  rearDeck.position.z = -1.02;
  rearDeck.material = deckMaterial;

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
    tube.material = tubeMaterial;

    for (let j = 0; j < 3; j += 1) {
      const saddle = MeshBuilder.CreateBox(`${name}_torpedo_saddle_${i}_${j}`, { width: 0.2, height: 0.08, depth: 0.12 }, scene);
      saddle.parent = root;
      saddle.position.x = tube.position.x;
      saddle.position.y = 0.755;
      saddle.position.z = 0.52 + j * 0.86;
      saddle.material = hullMaterial;
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
    cap.material = tubeMaterial;
  }

  createRailSegment(`${name}_deck_edge_left`, scene, hullMaterial, root, -0.58, -1.09, -0.58, 2.15, 0.76);
  createRailSegment(`${name}_deck_edge_right`, scene, hullMaterial, root, 0.58, -1.09, 0.58, 2.15, 0.76);

  createRailSegment(`${name}_bow_rail_left_a`, scene, hullMaterial, root, -0.58, 2.15, -0.46, 3.02, 0.76);
  createRailSegment(`${name}_bow_rail_left_b`, scene, hullMaterial, root, -0.2, 3.9, 0, 4.58, 0.76);
  createRailSegment(`${name}_bow_rail_right_a`, scene, hullMaterial, root, 0.58, 2.15, 0.46, 3.02, 0.76);
  createRailSegment(`${name}_bow_rail_right_b`, scene, hullMaterial, root, 0.2, 3.9, 0, 4.58, 0.76);

  const hatch = MeshBuilder.CreateBox(`${name}_deck_hatch`, { width: 0.46, height: 0.11, depth: 0.52 }, scene);
  hatch.parent = root;
  hatch.position.y = 0.91;
  hatch.position.z = -0.36;
  hatch.material = teamMaterials.cabin;

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
function createEnemyTorpedoBoat(scene, materials, name = "enemy_boat", teamId = "dark", designation = "") {
  const root = new TransformNode(name, scene);
  const teamMaterials = getShipTeamMaterials(materials, teamId);
  const hullMaterial = teamMaterials.hull;
  const cabinMaterial = teamMaterials.cabin;
  const funnelMaterial = teamMaterials.funnel;

  const body = createEnemyBoatBody(`${name}_body`, scene);
  body.parent = root;
  body.material = hullMaterial;

  const bridgeBase = MeshBuilder.CreateBox(`${name}_bridge_base`, { width: 0.96, height: 0.28, depth: 1.05 }, scene);
  bridgeBase.parent = root;
  bridgeBase.position.y = 0.75;
  bridgeBase.position.z = 0.55;
  bridgeBase.material = cabinMaterial;

  const bridge = MeshBuilder.CreateBox(`${name}_bridge`, { width: 0.74, height: 0.48, depth: 0.72 }, scene);
  bridge.parent = root;
  bridge.position.y = 1.06;
  bridge.position.z = 0.76;
  bridge.material = cabinMaterial;

  const window = MeshBuilder.CreateBox(`${name}_window`, { width: 0.58, height: 0.11, depth: 0.035 }, scene);
  window.parent = root;
  window.position.y = 1.17;
  window.position.z = 1.13;
  window.material = materials.glass;

  const funnelBase = MeshBuilder.CreateBox(`${name}_funnel_base`, { width: 0.72, height: 0.22, depth: 0.58 }, scene);
  funnelBase.parent = root;
  funnelBase.position.y = 0.76;
  funnelBase.position.z = 0.0;
  funnelBase.material = cabinMaterial;

  const funnel = MeshBuilder.CreateCylinder(`${name}_funnel`, {
    diameter: 0.36,
    height: 0.98,
    tessellation: 10
  }, scene);
  funnel.parent = root;
  funnel.position.y = 1.33;
  funnel.position.z = 0.0;
  funnel.material = funnelMaterial;

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
    tube.material = funnelMaterial;
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
  mast.material = funnelMaterial;

  if (designation) {
    createShipDesignationPlates(scene, root, name, designation);
  }

  const bowWake = createEnemyBowWake(scene, materials, root, name);

  return { root, bowWake };
}

function createShipDesignationPlates(scene, parent, name, designation) {
  [-1, 1].forEach((side) => {
    const material = createDesignationMaterial(scene, `${name}_designation_material_${side}`, designation, side < 0);
    const plate = MeshBuilder.CreatePlane(`${name}_designation_${side}`, {
      width: 1.18,
      height: 0.36
    }, scene);
    plate.parent = parent;
    plate.material = material;
    plate.position.x = side * 0.64;
    plate.position.y = 0.56;
    plate.position.z = 2.34;
    plate.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  });
}

function createDesignationMaterial(scene, name, designation, mirror = false) {
  const texture = new DynamicTexture(`${name}_texture`, { width: 256, height: 96 }, scene, true);
  const context = texture.getContext();
  context.clearRect(0, 0, 256, 96);
  context.save();
  if (mirror) {
    context.translate(256, 0);
    context.scale(-1, 1);
  }
  context.font = "900 60px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 10;
  context.strokeStyle = "rgba(4, 15, 20, 0.92)";
  context.strokeText(designation, 128, 50);
  context.fillStyle = "#f7fbff";
  context.fillText(designation, 128, 50);
  context.restore();
  texture.update();

  const material = new StandardMaterial(name, scene);
  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = new Color3(0.92, 0.97, 1);
  material.specularColor = new Color3(0, 0, 0);
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  return material;
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
      if (isVolcanicLandmass(land)) {
        volcanoPlumes.push(createVolcanoPlume(land, position, scene, materials, parent));
      }
    } else {
      createIsland(land, position, scene, materials, parent);
    }
  });
}

function isVolcanicLandmass(land) {
  return String(land.name ?? "").includes("volcano") || String(land.name ?? "") === "volcanic_highland";
}

function createVolcanoPlume(land, position, scene, materials, parent) {
  const root = new TransformNode(`${land.name}_volcano_plume`, scene);
  root.parent = parent;
  root.position = new Vector3(position.x, 0, position.z);

  const craterY = 38 + (land.peakBoost ?? 34) * 0.46;
  const craterRim = MeshBuilder.CreateCylinder(`${land.name}_crater_rim`, {
    diameterTop: 13,
    diameterBottom: 28,
    height: 8.5,
    tessellation: 14
  }, scene);
  craterRim.parent = root;
  craterRim.position.set(0, craterY - 2.6, 0);
  craterRim.scaling.z = 0.72;
  craterRim.material = materials.terrain;

  const glow = MeshBuilder.CreateSphere(`${land.name}_crater_glow`, {
    diameter: 17,
    segments: 12
  }, scene);
  glow.parent = root;
  glow.position.set(0, craterY + 0.45, 0);
  glow.scaling.set(1, 0.28, 0.72);
  glow.material = materials.volcanicGlow;

  const smoke = [];
  for (let i = 0; i < 9; i += 1) {
    const puff = MeshBuilder.CreateSphere(`${land.name}_smoke_${i}`, {
      segments: 7,
      diameter: 18 + i * 5.2
    }, scene);
    const angle = i * 1.72;
    puff.parent = root;
    puff.position.set(Math.cos(angle) * (3 + i * 1.8), craterY + 8 + i * 13, Math.sin(angle) * (2 + i * 1.3));
    puff.scaling.set(1.2 + i * 0.1, 0.62 + i * 0.04, 0.85 + i * 0.09);
    puff.rotation.y = angle;
    puff.material = i < 3 ? materials.volcanicSmokeWarm : materials.volcanicSmoke;
    smoke.push({
      mesh: puff,
      baseY: puff.position.y,
      baseX: puff.position.x,
      baseZ: puff.position.z,
      phase: i * 0.81
    });
  }

  return { root, glow, smoke };
}

function updateVolcanoPlumes(plumes, time) {
  plumes.forEach((plume) => {
    plume.glow.scaling.x = 1 + Math.sin(time * 2.2) * 0.08;
    plume.glow.scaling.z = 0.72 + Math.cos(time * 2.6) * 0.06;

    plume.smoke.forEach((puff, index) => {
      const drift = time * (0.12 + index * 0.01) + puff.phase;
      puff.mesh.position.x = puff.baseX + Math.sin(drift) * (2.8 + index * 0.55);
      puff.mesh.position.z = puff.baseZ + Math.cos(drift * 0.82) * (1.8 + index * 0.45);
      puff.mesh.position.y = puff.baseY + Math.sin(time * 0.34 + puff.phase) * 1.8;
      puff.mesh.rotation.y += 0.0015 + index * 0.0002;
    });
  });
}

function getLandZone(land) {
  return {
    x: land.x,
    z: land.z,
    rx: land.rx,
    rz: land.rz,
    visualRx: land.rx,
    visualRz: land.rz,
    name: land.name,
    kind: land.kind,
    coastRoughness: land.coastRoughness ?? 0.09,
    radarOcclusion: land.radarOcclusion ?? true,
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
    segment.material = materials.water;
  });

  (land.lakes ?? []).forEach((lake, index) => {
    const mesh = MeshBuilder.CreateCylinder(`${land.name}_lake_${index}`, {
      diameter: 2,
      height: 0.012,
      tessellation: 36
    }, scene);
    mesh.parent = parent;
    mesh.position = new Vector3(position.x + lake.x, 0.045, position.z + lake.z);
    mesh.scaling.x = lake.rx;
    mesh.scaling.z = lake.rz;
    mesh.material = materials.water;
  });
}

function createWaterwaySegment(name, waterway, scene) {
  const dx = waterway.to.x - waterway.from.x;
  const dz = waterway.to.z - waterway.from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const segment = MeshBuilder.CreateBox(name, {
    width: waterway.width,
    height: 0.012,
    depth: length
  }, scene);

  segment.position.x = (waterway.from.x + waterway.to.x) * 0.5;
  segment.position.y = 0.045;
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

  rings.forEach((ring) => {
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      const radiusFactor = getCoastRadiusFactor(angle, land);
      const localX = Math.cos(angle) * rx * ring * radiusFactor;
      const localZ = Math.sin(angle) * rz * ring * radiusFactor;
      const fjord = getFjordCarve(localX, localZ, rx, rz, land.fjords ?? []);
      const terrainFjord = fjord * smoothstep(0.62, 0.95, ring);
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
      const shoreBlend = 1 - smoothstep(0.9, 0.98, ring);
      const terrainHeight = 0.28 + shoreBlend * (
        0.2 + coast * (cliffLift + mountainLift + peakLift + roughness * 3.2) * (1 - terrainFjord * 0.25)
      );

      positions.push(
        localX,
        terrainHeight,
        localZ
      );
    }
  });

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let i = 0; i < samples; i += 1) {
      const next = (i + 1) % samples;
      const a = ring * samples + i;
      const b = ring * samples + next;
      const c = (ring + 1) * samples + i;
      const d = (ring + 1) * samples + next;

      indices.push(a, c, b);
      indices.push(b, c, d);
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
      const landWater = isInLocalLandWater(localX, localZ, land);
      const sandBand = 1 - smoothstep(0.78, 1.08, ring);
      const isSand = fjord <= 0.58 && !landWater;

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

function createIsland(land, position, scene, materials, parent) {
  const { name } = land;
  const rx = land.rx ?? land.radius ?? 20;
  const rz = land.rz ?? land.radius ?? 20;
  const radius = land.radius ?? Math.min(rx, rz);
  const heightScale = land.heightScale ?? 1;
  const steepRock = isSteepRockLand(land);
  const islandRoot = new TransformNode(name, scene);
  islandRoot.position = position;
  islandRoot.parent = parent;

  if (!steepRock) {
    createSmallIslandSurface(land, rx, rz, heightScale, scene, materials, islandRoot);
    return islandRoot;
  }

  const stackCount = Math.max(2, Math.min(3, Math.round(radius / 9)));
  for (let i = 0; i < stackCount; i += 1) {
    const angle = radius * 0.18 + i * 2.15;
    const distance = i === 0 ? 0 : 0.18 + i * 0.07;
    const rockHeightProfile = [0.34, 0.48, 0.39];
    const capProfile = [0.72, 0.48, 0.62];
    const height = radius * rockHeightProfile[i % rockHeightProfile.length] * heightScale;
    const baseDiameter = radius * (0.54 - i * 0.045);
    const stack = MeshBuilder.CreateCylinder(`${name}_rock_stack_${i}`, {
      diameterTop: baseDiameter * capProfile[i % capProfile.length],
      diameterBottom: baseDiameter,
      height,
      tessellation: 8
    }, scene);
    stack.parent = islandRoot;
    stack.position.x = Math.cos(angle) * rx * distance;
    stack.position.z = Math.sin(angle) * rz * distance * 0.82;
    stack.position.y = height * 0.5 - radius * 0.2;
    stack.rotation.x = Math.sin(angle) * 0.14;
    stack.rotation.z = Math.cos(angle) * 0.13;
    stack.rotation.y = angle * 0.92;
    stack.scaling.x = 0.72 + (i % 2) * 0.28;
    stack.scaling.z = 1.18 - (i % 2) * 0.24;
    stack.material = materials.rock;
    stack.receiveShadows = true;
  }

  return islandRoot;
}

function createSmallIslandSurface(land, rx, rz, heightScale, scene, materials, parent) {
  const beach = MeshBuilder.CreateCylinder(`${land.name}_island_beach`, {
    diameter: 2,
    height: 0.05,
    tessellation: 64
  }, scene);
  beach.parent = parent;
  beach.position.y = 0.045;
  beach.scaling.x = rx * 1.02;
  beach.scaling.z = rz * 1.02;
  beach.material = materials.sand;

  const terrain = MeshBuilder.CreateCylinder(`${land.name}_island_terrain`, {
    diameterTop: 1.55,
    diameterBottom: 1.96,
    height: Math.max(0.55, Math.min(2.2, Math.min(rx, rz) * 0.055 * heightScale)),
    tessellation: 64
  }, scene);
  terrain.parent = parent;
  terrain.position.y = 0.22;
  terrain.scaling.x = rx * 0.92;
  terrain.scaling.z = rz * 0.92;
  terrain.material = materials.terrain;
  terrain.receiveShadows = true;

  const hill = createSmallIslandHillMesh(`${land.name}_island_hill`, land, rx, rz, heightScale, scene);
  hill.parent = parent;
  hill.material = materials.terrain;
  hill.receiveShadows = true;
}

function createSmallIslandHillMesh(name, land, rx, rz, heightScale, scene) {
  const mesh = new Mesh(name, scene);
  const positions = [];
  const indices = [];
  const normals = [];
  const samples = 18;
  const rings = [0, 0.42, 0.76, 1.0];
  const seed = getNameSeed(land.name);
  const hillRx = rx * (0.72 + (seed % 5) * 0.018);
  const hillRz = rz * (0.62 + (seed % 7) * 0.014);
  const height = Math.max(1.1, Math.min(4.2, Math.min(rx, rz) * 0.15 * heightScale));
  const offsetX = rx * (0.01 + ((seed % 9) - 4) * 0.006);
  const offsetZ = rz * (-0.015 + ((seed % 11) - 5) * 0.005);
  const peakAngle = seed * 0.017;
  const peakX = Math.cos(peakAngle) * hillRx * 0.16;
  const peakZ = Math.sin(peakAngle) * hillRz * 0.16;

  rings.forEach((ring, ringIndex) => {
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      const uneven = 1
        + Math.sin(angle * 2.0 + seed * 0.021) * 0.12
        + Math.sin(angle * 5.0 - seed * 0.009) * 0.07;
      const localX = offsetX + peakX * (1 - ring) + Math.cos(angle) * hillRx * ring * uneven;
      const localZ = offsetZ + peakZ * (1 - ring) + Math.sin(angle) * hillRz * ring * (1.05 - (uneven - 1) * 0.35);
      const ridge = Math.sin(angle * 3.0 + seed * 0.013) * 0.1;
      const crown = Math.pow(1 - ring, 0.72);
      const shoulder = ringIndex === 1 ? 0.28 : 0;
      const shoreDrop = smoothstep(0.72, 1.0, ring);
      const y = 0.34 + height * (crown + shoulder + ridge * (1 - ring * 0.45)) * (1 - shoreDrop * 0.9);
      positions.push(localX, y, localZ);
    }
  });

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let i = 0; i < samples; i += 1) {
      const next = (i + 1) % samples;
      const a = ring * samples + i;
      const b = ring * samples + next;
      const c = (ring + 1) * samples + i;
      const d = (ring + 1) * samples + next;
      indices.push(a, c, b);
      indices.push(b, c, d);
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

function isSteepRockLand(land) {
  const name = land.name ?? "";
  return land.kind === "island"
    && (name.includes("rock")
      || name.includes("rocks")
      || name.includes("stack")
      || name.includes("needle")
      || name.includes("skerry")
      || name.includes("skerries"));
}

function createRockFoamRing(name, rx, rz, scene, materials, parent) {
  const ringCount = 8;
  const radius = Math.min(rx, rz);

  for (let i = 0; i < ringCount; i += 1) {
    const angle = (i / ringCount) * Math.PI * 2 + radius * 0.09;
    const foam = MeshBuilder.CreateBox(`${name}_${i}`, {
      width: radius * (0.24 + (i % 3) * 0.035),
      height: 0.012,
      depth: radius * 0.035
    }, scene);
    foam.parent = parent;
    foam.position.x = Math.cos(angle) * rx * (0.86 + (i % 2) * 0.05);
    foam.position.y = 0.035;
    foam.position.z = Math.sin(angle) * rz * (0.86 + (i % 2) * 0.05);
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
    const outerFade = 1 - smoothstep(1.02, 1.16, along);
    const innerFade = smoothstep(1 - reach, 1 - reach + 0.18, along);
    const channel = 1 - smoothstep(width * 0.45, width, across);

    carve = Math.max(carve, channel * outerFade * innerFade);
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
  drawInstrumentWaterways(ctx, zone, (point) => worldToMapPoint(point, bounds, width, height, scale), scale, "rgba(7, 31, 43, 0.94)");

  (zone.lakes ?? []).forEach((lake) => {
    const point = worldToMapPoint({ x: zone.x + lake.x, z: zone.z + lake.z }, bounds, width, height, scale);
    drawInstrumentEllipse(ctx, point.x, point.y, lake.rx * scale, lake.rz * scale, "rgba(7, 31, 43, 0.94)", "rgba(7, 31, 43, 0.72)");
  });
}

function drawRadarLandWater(ctx, zone, playerPosition, centerX, centerY, scale, heading) {
  drawInstrumentWaterways(ctx, zone, (point) => worldToRadarPoint(point, playerPosition, centerX, centerY, scale, heading), scale, "rgba(2, 22, 28, 0.94)");

  (zone.lakes ?? []).forEach((lake) => {
    const point = worldToRadarPoint({ x: zone.x + lake.x, z: zone.z + lake.z }, playerPosition, centerX, centerY, scale, heading);
    drawInstrumentEllipse(ctx, point.x, point.y, lake.rx * scale, lake.rz * scale, "rgba(2, 22, 28, 0.94)", "rgba(2, 22, 28, 0.72)", -heading);
  });
}

function drawInstrumentWaterways(ctx, zone, project, scale, strokeStyle) {
  ctx.strokeStyle = strokeStyle;
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

function getSignedAngularDistance(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function blendAngle(current, target, amount) {
  return current + getSignedAngularDistance(target, current) * clamp(amount, 0, 1);
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

// Navigation uses the same coastline shape as the rendered map/radar, so the
// ship does not run aground on invisible parts of a former coarse ellipse.
function getWaterSafety(position, zones) {
  for (const zone of zones) {
    const distance = getZoneShapeDistance(position, zone, zone.rx, zone.rz);
    const blockDistance = getZoneBlockDistance(zone);
    const landWater = isInLandWater(position, zone);

    if (distance < blockDistance && !landWater) {
      return { isBlocked: true, isShallow: true, shallowAmount: 1 };
    }
  }

  return { isBlocked: false, isShallow: false, shallowAmount: 0 };
}

function getShipWaterSafety(position, heading, zones) {
  let shallowAmount = 0;

  for (const sample of getShipNavigationSamples(position, heading)) {
    const safety = getWaterSafety(sample.point, zones);
    if (safety.isBlocked) {
      return { ...safety, blockedPoint: sample.point, blockedSample: sample };
    }
    shallowAmount = Math.max(shallowAmount, safety.shallowAmount);
  }

  return { isBlocked: false, isShallow: shallowAmount > 0, shallowAmount };
}

function getShipMovementWaterSafety(position, heading, speedValue, zones) {
  let shallowAmount = 0;
  const movementSign = Math.sign(speedValue);
  const samples = getShipNavigationSamples(position, heading)
    .filter((sample) => movementSign < 0 ? sample.forwardOffset <= 0.05 : sample.forwardOffset >= -0.05);

  for (const sample of samples) {
    const safety = getWaterSafety(sample.point, zones);
    if (safety.isBlocked) {
      return { ...safety, blockedPoint: sample.point, blockedSample: sample };
    }
    shallowAmount = Math.max(shallowAmount, safety.shallowAmount);
  }

  return { isBlocked: false, isShallow: shallowAmount > 0, shallowAmount };
}

function getShipNavigationSamples(position, heading) {
  const forward = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  const right = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
  const samples = [
    { z: 4.9, x: 0 },
    { z: 3.2, x: -0.62 },
    { z: 3.2, x: 0.62 },
    { z: 1.0, x: -0.74 },
    { z: 1.0, x: 0.74 },
    { z: -1.0, x: -0.62 },
    { z: -1.0, x: 0.62 },
    { z: 0, x: 0 }
  ];

  return samples.map((sample) => ({
    forwardOffset: sample.z,
    sideOffset: sample.x,
    point: position
      .add(forward.scale(sample.z))
      .add(right.scale(sample.x))
  }));
}

function getZoneShapeDistance(position, zone, rx, rz) {
  const localX = position.x - zone.x;
  const localZ = position.z - zone.z;
  const nx = localX / rx;
  const nz = localZ / rz;
  const distance = Math.sqrt(nx * nx + nz * nz);

  if (zone.kind !== "coastline") {
    return distance;
  }

  const angle = Math.atan2(nz, nx);
  return distance / getCoastRadiusFactor(angle, zone);
}

function getZoneBlockDistance(zone) {
  return 1;
}

function getWaterEscapeVector(position, zones) {
  let escape = new Vector3(0, 0, 0);

  for (const zone of zones) {
    const localX = position.x - zone.x;
    const localZ = position.z - zone.z;
    const nx = localX / zone.rx;
    const nz = localZ / zone.rz;
    const distance = getZoneShapeDistance(position, zone, zone.rx, zone.rz);
    const blockDistance = getZoneBlockDistance(zone);

    if (distance < blockDistance && !isInLandWater(position, zone)) {
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
  return false;
}

function isInLandWater(position, zone) {
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
