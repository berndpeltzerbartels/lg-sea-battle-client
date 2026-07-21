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
import "@babylonjs/core/Meshes/Builders/sphereBuilder";
import "@babylonjs/core/Meshes/Builders/torusBuilder";
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/depthBoxBlur.fragment";
import "@babylonjs/core/Shaders/postprocess.vertex";
import "@babylonjs/core/Materials/Textures/dynamicTexture";
import "./styles.css";

const canvas = document.getElementById("renderCanvas");
prepareGameFocus(canvas);
const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: false,
  antialias: true
});

const scene = new Scene(engine);
document.body.dataset.appStarted = "true";
const urlParams = new URLSearchParams(location.search);
let debugMapEnabled = urlParams.get("debug") === "1";
let debugMarkerMapEnabled = debugMapEnabled && urlParams.get("markers") === "1";
let bigMapEnabled = debugMapEnabled && urlParams.get("bigMap") !== "0";
const hideBeachDebug = urlParams.get("hide-beach") === "1";
document.body.classList.toggle("big-map", bigMapEnabled);
document.body.dataset.bigMap = String(bigMapEnabled);
document.body.classList.toggle("debug-marker-map", debugMarkerMapEnabled);
document.body.dataset.hideBeach = String(hideBeachDebug);
const torpedoBoatWaterlineY = -0.2;
const enemyTorpedoBoatBobAmplitude = 0.025;
const enemyBowWakeSurfaceY = -torpedoBoatWaterlineY + 0.018;
scene.clearColor = new Color4(0.38, 0.5, 0.6, 1);
scene.fogMode = Scene.FOGMODE_LINEAR;
scene.fogColor = new Color3(0.35, 0.46, 0.54);
scene.fogStart = 82;
scene.fogEnd = 650;

const speedValue = document.getElementById("speedValue");
const altitudeValue = document.getElementById("altitudeValue");
const altimeterHundredsHand = document.getElementById("altimeterHundredsHand");
const altimeterThousandsHand = document.getElementById("altimeterThousandsHand");
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
const debugMapMarkerPanel = document.getElementById("debugMapMarkerPanel");
const debugMapMarkerOutput = document.getElementById("debugMapMarkerOutput");
const copyDebugMapMarkersButton = document.getElementById("copyDebugMapMarkersButton");
const undoDebugMapMarkerButton = document.getElementById("undoDebugMapMarkerButton");
const clearDebugMapMarkersButton = document.getElementById("clearDebugMapMarkersButton");
const radarCanvas = document.getElementById("radarCanvas");
const radarStatus = document.getElementById("radarStatus");
const rudderIndicator = document.getElementById("rudderIndicator");
const rudderValue = document.getElementById("rudderValue");
const sinkingWaterOverlay = document.getElementById("sinkingWaterOverlay");
const fleetStatusRows = document.getElementById("fleetStatusRows");
const torpedoStockValue = document.getElementById("torpedoStockValue");
const playerListRows = document.getElementById("playerListRows");
const resetGameButton = document.getElementById("resetGameButton");
const mobileFireButton = document.getElementById("mobileFireButton");
const clientVersionValue = document.getElementById("clientVersionValue");
const serverVersionValue = document.getElementById("serverVersionValue");

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
const enemyTargetingRange = 945;
const engineHoldInitialDelaySeconds = 0.22;
const engineHoldRepeatSeconds = 0.1;
const mouseWheelEngineStep = 100;
const scoutPlaneSetupId = "scout-plane";
const scoutPlaneCruiseAltitude = 22;
const scoutPlaneMinAltitude = 5;
const scoutPlaneMaxAltitude = 80;
const scoutPlaneCruiseSpeed = 14.5;
const scoutPlaneMinSpeed = 7.5;
const scoutPlaneMaxSpeed = 19.5;
const scoutPlaneSpeedStep = 1.5;
const scoutPlaneMaxClimbRate = 8.5;
const scoutPlaneMaxPitch = 0.22;
const bombGravity = 14.0;
const bombDropForwardOffset = 2.6;
const bombsPerDrop = 8;
const bombReleaseIntervalSeconds = 0.28;
const scoutPlaneExperimentShowAllFlak = true;
const scoutPlaneExperimentFlakDemo = urlParams.get("flak-demo") === "1";
const playerSternFlakZ = -2.92;
const remoteSternFlakZ = -2.92;
const flakMinPitch = -0.12;
const flakMaxPitch = 0.92;
const flakPitchStepRadians = 0.05;
const flakFireCooldownSeconds = 0.22;
const flakProjectileSpeed = 115;
const flakProjectileGravity = 18;
const flakProjectileLifetime = 2.2;
const flakDemoFireIntervalSeconds = 0.25;
const flakBarrelLength = 1.62;
const flakBarrelCenterZ = 0.22;
const playerSternFlakScale = 0.54;
const playerFlakSightYOffset = 0.14 * playerSternFlakScale;
const playerFlakEyeZ = -0.34 * playerSternFlakScale;
const testPlayerInvulnerable = false;
const openSeaFoamEnabled = true;
const performanceLoggingEnabled = urlParams.get("perf-log") === "1";
const centerPeakLighthouseLandNames = new Set(["far_east_bank", "north_watch_bank", "south_watch_bank", "eastern_delta_coast", "blackwater_basin"]);
const lighthouseHeightOffsets = new Map([
  ["blackwater_basin", -1.2],
  ["eastern_delta_coast", -0.45]
]);
let lastMapViewport = null;
let debugRespawnCandidates = [];
let debugRespawnCandidatesLoaded = false;
let debugMapMarkers = [];
let debugMapMarkersEdited = false;
const clientBuildInfo = window.__SEA_BATTLE_CLIENT_VERSION__ ?? { version: "dev", commit: "local" };
updateBuildInfoPanel(clientBuildInfo, null);
loadServerBuildInfo()
  .then((serverBuildInfo) => updateBuildInfoPanel(clientBuildInfo, serverBuildInfo))
  .catch((error) => updateBuildInfoPanel(clientBuildInfo, { version: "unavailable", commit: error.message }));
const playerLogin = await requirePlayerLogin();
const playerInitials = playerLogin.initials;
await requireRegisteredGameSession(playerLogin.playerId);
const worldLandmasses = await loadWorldLandmasses();
document.body.dataset.worldSource = "server";
document.body.dataset.worldLandmasses = String(worldLandmasses.length);
const gameState = await loadGameState();
document.body.dataset.gameStateSource = "server";
document.body.dataset.serverGameState = gameState.state;
document.body.dataset.serverShips = String(gameState.ships.length);
document.body.dataset.serverTorpedoes = String(gameState.torpedoes.length);
document.body.dataset.serverBombs = String(Array.isArray(gameState.bombs) ? gameState.bombs.length : 0);
const selectedVehicleType = urlParams.get("vehicle") ?? readStoredValue("vehicleType");
const scoutPlaneMode = gameState.sessionId === scoutPlaneSetupId || selectedVehicleType === "scout-plane";
if (scoutPlaneMode) {
  scene.fogStart = 180;
  scene.fogEnd = 1800;
}
const playerId = playerLogin.playerId;
const playerTeamId = getRequestedPlayerTeamId(gameState.ships, playerLogin.teamId);
const playerShips = getTeamShips(gameState.ships, playerTeamId);
const enemyShips = getEnemyShips(gameState.ships, playerTeamId);
const initialPlayerSpawn = createPlayerSpawn(playerShips, playerId);
let playerServerShipId = initialPlayerSpawn.shipId;
let playerBearingPosition = initialPlayerSpawn.position;
let heading = initialPlayerSpawn.heading;
let fleetTotals = getFleetCounts(gameState.ships);
let playerTorpedoesRemaining = Number.isFinite(initialPlayerSpawn.torpedoesRemaining)
  ? initialPlayerSpawn.torpedoesRemaining
  : null;
document.body.dataset.playerTeam = playerTeamId;
document.body.dataset.playerId = playerId;
document.body.dataset.playerInitials = playerInitials;
document.body.dataset.playerVehicle = scoutPlaneMode ? "scout-plane" : "torpedo-boat";
document.body.dataset.flakView = "bridge";
document.body.dataset.bombBayView = "off";
document.body.dataset.playerShipId = playerServerShipId ?? "pending";
document.body.dataset.serverOwnShips = String(playerShips.length);
document.body.dataset.serverEnemyShips = String(enemyShips.length);
document.body.dataset.testPlayerInvulnerable = String(testPlayerInvulnerable);
document.body.dataset.openSeaFoam = String(openSeaFoamEnabled);
document.body.dataset.performanceLogging = String(performanceLoggingEnabled);
document.body.dataset.debugMap = String(debugMapEnabled);
document.body.dataset.debugMarkerMap = String(debugMarkerMapEnabled);
updateFleetStatus(gameState.ships, gameState.destroyedShipsByTeam);
updatePlayerList(gameState.ships);
updatePlayerTorpedoStock(playerTorpedoesRemaining);
setupResetGameControl(resetGameButton);
setupMapZoomControl(mapZoom);
setupDebugMapMarkerPanel();
setupDebugMapTeleport(mapCanvas);
updateDebugMapMarkerPanel();
if (debugMapEnabled) {
  loadDebugRespawnCandidates();
}

const clientCapability = createClientCapabilitySnapshot(engine, canvas);
const renderQuality = applyRenderQuality(engine, clientCapability);
document.body.dataset.clientCapability = clientCapability.performanceClass;
document.body.dataset.hardwareScalingLevel = renderQuality.hardwareScalingLevel.toFixed(2);
document.body.dataset.visualEffects = renderQuality.visualEffects;

const materials = createMaterials(scene);
const world = new TransformNode("world", scene);

const sun = new DirectionalLight("sun", new Vector3(-0.45, -0.9, 0.32), scene);
sun.position = new Vector3(35, 80, -45);
sun.intensity = 0.94;
sun.diffuse = new Color3(0.66, 0.74, 0.82);
sun.specular = new Color3(0.38, 0.48, 0.58);

const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
ambient.intensity = 0.34;
ambient.diffuse = new Color3(0.48, 0.58, 0.68);
ambient.groundColor = new Color3(0.14, 0.17, 0.19);

const worldLimit = 5000;
const ocean = MeshBuilder.CreateGround("ocean", { width: 2300, height: 2300, subdivisions: 160 }, scene);
ocean.material = materials.water;
ocean.parent = world;
const foam = createFoamPatches(scene, materials, world);
const volcanoPlumes = [];
const navigationLights = [];

const blockedWaters = worldLandmasses.map(getLandZone);
createWorldLandmasses(worldLandmasses, scene, materials, world);
if (renderQuality.visualEffects !== "low") {
  navigationLights.push(...createNavigationLights(worldLandmasses, scene, materials, world, renderQuality.visualEffects));
}

const boat = scoutPlaneMode
  ? createScoutPlane(scene, materials, "player_scout_plane", playerTeamId, true)
  : createPlayerBow(scene, materials, "player_bow", playerTeamId);
boat.root.position.copyFrom(initialPlayerSpawn.position);
if (scoutPlaneMode) {
  boat.root.position.y = scoutPlaneCruiseAltitude;
}

// Until SSE arrives, backend ships seed the visual fleet and local motion keeps them inspectable.
const enemyMotions = createEnemyFleet(scene, materials, getOtherServerShips(gameState.ships, playerServerShipId));
const flakDemoMotions = scoutPlaneMode && scoutPlaneExperimentFlakDemo
  ? createStaticFlakDemoFleet(scene, materials, world, boat.root.position, heading)
  : [];
document.body.dataset.flakDemo = scoutPlaneMode && scoutPlaneExperimentFlakDemo ? "1" : "0";
document.body.dataset.flakDemoStaticBoats = String(flakDemoMotions.length);
document.body.dataset.meshCount = String(scene.meshes.length);

const camera = new FreeCamera("follow_camera", new Vector3(0, 7, -13), scene);
camera.minZ = 0.2;
camera.maxZ = 4200;
camera.fov = scoutPlaneMode ? 1.02 : 0.78;
scene.activeCamera = camera;

window.addEventListener("keydown", (event) => {
  if (isHudControlEvent(event)) return;
  document.body.dataset.lastKey = formatInputEvent(event);
  const playerActive = playerDamageState === "active";

  if (playerActive && isFlakViewToggleKey(event) && !event.repeat) {
    toggleFlakView();
    event.preventDefault();
    return;
  }
  if (playerActive && isBombBayViewToggleKey(event) && !event.repeat) {
    toggleBombBayView();
    event.preventDefault();
    return;
  }
  if (playerActive && isInputKey(event, "up")) {
    if (flakViewActive) {
      heldFlakPitchDirection = 1;
      if (!event.repeat) {
        changeFlakPitch(1);
      }
      event.preventDefault();
      return;
    }
    if (scoutPlaneMode) {
      if (event.shiftKey) {
        if (!event.repeat) {
          changeScoutPlaneTargetSpeed(1);
        }
      } else {
        heldElevatorDirection = 1;
      }
    } else {
      heldEngineDirection = 1;
      if (!event.repeat) {
        changeEngineOrder(1);
        nextEngineHoldChangeTime = time + engineHoldInitialDelaySeconds;
      }
    }
    event.preventDefault();
  }
  if (playerActive && isInputKey(event, "down")) {
    if (flakViewActive) {
      heldFlakPitchDirection = -1;
      if (!event.repeat) {
        changeFlakPitch(-1);
      }
      event.preventDefault();
      return;
    }
    if (scoutPlaneMode) {
      if (event.shiftKey) {
        if (!event.repeat) {
          changeScoutPlaneTargetSpeed(-1);
        }
      } else {
        heldElevatorDirection = -1;
      }
    } else {
      heldEngineDirection = -1;
      if (!event.repeat) {
        changeEngineOrder(-1);
        nextEngineHoldChangeTime = time + engineHoldInitialDelaySeconds;
      }
    }
    event.preventDefault();
  }
  if (playerActive && isInputKey(event, "left")) {
    if (flakViewActive) {
      heldFlakDirection = -1;
      event.preventDefault();
      return;
    }
    heldRudderDirection = -1;
    if (!event.repeat) {
      rudderDegrees = stepRudderDegrees(rudderDegrees, -1);
      nextRudderHoldChangeTime = time + rudderHoldInitialDelaySeconds;
    } else {
      nextRudderHoldChangeTime = Math.min(nextRudderHoldChangeTime, time);
    }
    event.preventDefault();
  }
  if (playerActive && isInputKey(event, "right")) {
    if (flakViewActive) {
      heldFlakDirection = 1;
      event.preventDefault();
      return;
    }
    heldRudderDirection = 1;
    if (!event.repeat) {
      rudderDegrees = stepRudderDegrees(rudderDegrees, 1);
      nextRudderHoldChangeTime = time + rudderHoldInitialDelaySeconds;
    } else {
      nextRudderHoldChangeTime = Math.min(nextRudderHoldChangeTime, time);
    }
    event.preventDefault();
  }
  if (playerActive && isTorpedoFireKey(event) && !event.repeat) {
    if (flakViewActive) {
      heldFlakFire = true;
      firePlayerFlak();
      event.preventDefault();
      return;
    }
    requestPlayerWeaponFire();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (isHudControlEvent(event)) return;
  if (isInputKey(event, "up") && heldEngineDirection > 0) {
    heldEngineDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "up") && heldFlakPitchDirection > 0) {
    heldFlakPitchDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "up") && heldElevatorDirection > 0) {
    heldElevatorDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "down") && heldEngineDirection < 0) {
    heldEngineDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "down") && heldFlakPitchDirection < 0) {
    heldFlakPitchDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "down") && heldElevatorDirection < 0) {
    heldElevatorDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "left") && heldRudderDirection < 0) {
    heldRudderDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "left") && heldFlakDirection < 0) {
    heldFlakDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "right") && heldRudderDirection > 0) {
    heldRudderDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "right") && heldFlakDirection > 0) {
    heldFlakDirection = 0;
    event.preventDefault();
  }
  if (isTorpedoFireKey(event) && heldFlakFire) {
    heldFlakFire = false;
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
  focusGameCanvas();
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
  heldElevatorDirection = 0;
});

window.addEventListener("blur", () => {
  mouseButtonMask = 0;
  rightMouseRudderActive = false;
  heldElevatorDirection = 0;
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
  if (scoutPlaneMode) {
    event.preventDefault();
    return;
  }

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

window.addEventListener("pageshow", focusGameCanvas);
window.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    focusGameCanvas();
  }
});

function prepareGameFocus(renderCanvas) {
  if (!renderCanvas) return;
  renderCanvas.tabIndex = -1;
  requestAnimationFrame(focusGameCanvas);
  setTimeout(focusGameCanvas, 0);
}

function focusGameCanvas() {
  if (!canvas || document.hidden) return;
  const active = document.activeElement;
  if (active && active !== document.body && active !== canvas && isTextEditingElement(active)) {
    return;
  }
  canvas.focus({ preventScroll: true });
}

function isTextEditingElement(element) {
  return element instanceof HTMLInputElement
      || element instanceof HTMLTextAreaElement
      || element instanceof HTMLSelectElement
      || element.isContentEditable;
}

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
let speed = scoutPlaneMode ? scoutPlaneCruiseSpeed : 0;
let scoutPlaneTargetSpeed = scoutPlaneCruiseSpeed;
let engineOrder = scoutPlaneMode ? 7 : 2;
let turnVelocity = 0;
let rudderDegrees = 0;
let heldEngineDirection = 0;
let heldElevatorDirection = 0;
let scoutPlaneAltitude = scoutPlaneCruiseAltitude;
let scoutPlaneVerticalSpeed = 0;
let scoutPlanePitch = 0;
let nextEngineHoldChangeTime = 0;
let heldRudderDirection = 0;
let nextRudderHoldChangeTime = 0;
let flakViewActive = false;
let bombBayViewActive = false;
let flakYaw = 0;
let flakPitch = 0;
let heldFlakDirection = 0;
let heldFlakPitchDirection = 0;
let heldFlakFire = false;
let mouseButtonMask = 0;
let mouseWheelEngineAccumulator = 0;
let measuredSpeedSample = {
  time: 0,
  x: initialPlayerSpawn.position.x,
  z: initialPlayerSpawn.position.z,
  speed: 0
};
let performanceTelemetry = createPerformanceTelemetry();
let httpRequestsInFlight = 0;
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
const clientRadarRange = 945;
const scoutPlaneRadarRangeFactor = 1.5;
const bombBayRadarRangeFactor = 0.58;
let serverShipsById = indexShipsById(gameState.ships);
let serverClockOffset = Number.isFinite(gameState.t) ? -gameState.t : null;
let gameEventSource = null;
let gameEventSourceReady = false;
let lastGameStreamMessageAt = 0;
let debugTeleportPending = false;
let fireTorpedoRequestInFlight = false;
let dropBombRequestInFlight = false;
const maxRudderDegrees = 35;
const rudderStepDegrees = 3;
const rudderHoldInitialDelaySeconds = 0.22;
const rudderHoldDegreesPerSecond = 60;
const maxSimulationFrameSeconds = 0.12;
boat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
const playerRespawnPoints = createPlayerRespawnPoints(playerShips, initialPlayerSpawn);
const torpedoLaunchDefaults = {
  tubeX: 0.66,
  startZ: 2.45,
  startY: 0.6
};
const torpedoSystem = createTorpedoSystem(scene, materials, world);
const bombSystem = createBombSystem(scene, materials, world);
const flakSystem = createFlakSystem(scene, materials, world);
connectGameEventStream();

const telegraphSteps = createTelegraphSteps(engineOrders, telegraphScale);
setupTelegraphDragControl(telegraphScale);
setupRudderDragControl(document.querySelector(".rudder-gauge"));
setupMobileFireButton(mobileFireButton);
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
  recordPerformanceFrame(rawFrameSeconds, dt);
  const playerActive = playerDamageState === "active";

  if (playerActive && heldRudderDirection !== 0 && time >= nextRudderHoldChangeTime) {
    rudderDegrees = clamp(
      rudderDegrees + heldRudderDirection * rudderHoldDegreesPerSecond * dt,
      -maxRudderDegrees,
      maxRudderDegrees
    );
  }
  if (playerActive && flakViewActive && heldFlakDirection !== 0) {
    flakYaw = normalizeAngle(flakYaw + heldFlakDirection * 1.35 * dt);
  }
  if (playerActive && flakViewActive && heldFlakPitchDirection !== 0) {
    flakPitch = clamp(flakPitch + heldFlakPitchDirection * 0.72 * dt, flakMinPitch, flakMaxPitch);
  }
  if (playerActive && flakViewActive && heldFlakFire) {
    firePlayerFlak();
  }
  updatePlayerFlakMount();

  if (!scoutPlaneMode && playerActive && heldEngineDirection !== 0 && time >= nextEngineHoldChangeTime) {
    changeEngineOrder(heldEngineDirection);
    nextEngineHoldChangeTime = time + engineHoldRepeatSeconds;
  }

  // Heavy ship feel: the selected telegraph order is a target, and speed eases toward it.
  const waterSafety = getShipWaterSafety(boat.root.position, heading, blockedWaters);
  let forward = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  let nextWaterSafety = waterSafety;

  if (playerActive) {
    if (scoutPlaneMode) {
      engineOrder = 7;
    }
    const maxForwardSpeed = scoutPlaneMode ? scoutPlaneMaxSpeed : 12.4;
    const engineTargetSpeed = engineOrders[engineOrder].speed;
    const targetSpeed = scoutPlaneMode
      ? scoutPlaneTargetSpeed
      : engineTargetSpeed > 0
      ? Math.min(engineTargetSpeed, maxForwardSpeed)
      : engineTargetSpeed;
    const response = scoutPlaneMode ? 1.1 : (Math.abs(targetSpeed) > Math.abs(speed) ? 0.45 : 0.75);
    speed += (targetSpeed - speed) * Math.min(1, dt * response);

    const turnStrength = scoutPlaneMode ? 0.18 : (speed >= 0 ? 0.24 : -0.16);
    const rudderGrip = scoutPlaneMode ? clamp(Math.abs(speed) / 8.5, 0.18, 1) : clamp(Math.abs(speed) / 4.2, 0, 1);
    const steer = rudderDegrees / maxRudderDegrees;
    const targetTurnVelocity = steer * turnStrength * rudderGrip;
    turnVelocity += (targetTurnVelocity - turnVelocity) * Math.min(1, dt * (scoutPlaneMode ? 1.35 : 2.0));
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
    if (!scoutPlaneMode && movementSafety.isBlocked) {
      boat.root.position.copyFrom(previousPosition);

      // Grounding stops the ship, but a tiny escape nudge prevents numeric edge-locking.
      const groundedSafety = getShipWaterSafety(boat.root.position, heading, blockedWaters);
      if (groundedSafety.isBlocked) {
        boat.root.position.addInPlace(getWaterEscapeVector(groundedSafety.blockedPoint ?? boat.root.position, blockedWaters).scale(0.18));
      }

      speed = engineOrders[engineOrder].speed < 0 ? Math.min(speed, -1.2) : 0;
      turnVelocity *= 0.4;
    }

    if (scoutPlaneMode) {
      const targetPitch = -heldElevatorDirection * scoutPlaneMaxPitch;
      scoutPlanePitch += (targetPitch - scoutPlanePitch) * Math.min(1, dt * 2.4);
      const targetVerticalSpeed = heldElevatorDirection * scoutPlaneMaxClimbRate;
      scoutPlaneVerticalSpeed += (targetVerticalSpeed - scoutPlaneVerticalSpeed) * Math.min(1, dt * 1.35);
      scoutPlaneAltitude = clamp(
        scoutPlaneAltitude + scoutPlaneVerticalSpeed * dt,
        scoutPlaneMinAltitude,
        scoutPlaneMaxAltitude
      );
      if (
        (scoutPlaneAltitude <= scoutPlaneMinAltitude && scoutPlaneVerticalSpeed < 0) ||
        (scoutPlaneAltitude >= scoutPlaneMaxAltitude && scoutPlaneVerticalSpeed > 0)
      ) {
        scoutPlaneVerticalSpeed = 0;
      }
    }
  } else {
    heldRudderDirection = 0;
    heldElevatorDirection = 0;
    heldFlakDirection = 0;
    heldFlakPitchDirection = 0;
    engineOrder = 2;
    speed *= Math.max(0, 1 - dt * 1.7);
    turnVelocity *= Math.max(0, 1 - dt * 2.0);
    rudderDegrees += (0 - rudderDegrees) * Math.min(1, dt * 1.8);
    scoutPlaneVerticalSpeed *= Math.max(0, 1 - dt * 2.0);
    scoutPlanePitch += (0 - scoutPlanePitch) * Math.min(1, dt * 2.2);
  }

  const bob = Math.sin(time * 2.1) * 0.08 + Math.sin(time * 3.8 + 1.6) * 0.035;
  if (playerActive) {
    boat.root.position.y = scoutPlaneMode
      ? scoutPlaneAltitude + Math.sin(time * 1.1) * 0.22
      : torpedoBoatWaterlineY + bob;
    boat.root.rotationQuaternion = Quaternion.FromEulerAngles(
      scoutPlaneMode ? scoutPlanePitch + Math.sin(time * 1.15) * 0.018 : Math.sin(time * 2.6) * 0.025,
      heading,
      scoutPlaneMode ? -turnVelocity * 2.8 : -turnVelocity * 0.5 + Math.sin(time * 1.9) * 0.018
    );
    if (scoutPlaneMode) {
      updateScoutPlaneVisual(boat, speed, time);
    }
  } else {
    updatePlayerSinking(boat, time);
  }
  ocean.position.x = boat.root.position.x;
  ocean.position.z = boat.root.position.z;

  materials.water.diffuseTexture.uOffset += dt * 0.01;
  materials.water.diffuseTexture.vOffset += dt * 0.018;
  if (openSeaFoamEnabled) {
    updateFoamPatches(foam, boat.root.position, time, blockedWaters);
  }
  updateVolcanoPlumes(volcanoPlumes, time);
  updateNavigationLights(navigationLights, time, boat.root.position);
  enemyMotions.forEach((enemyMotion) => updateEnemyMotion(enemyMotion, dt, time, boat.root.position, blockedWaters));
  updateScoutPlaneFlakDemo(enemyMotions.concat(flakDemoMotions), time);
  updateEnemyFireControl(torpedoSystem, enemyMotions, boat.root.position, blockedWaters, time);
  updateServerTorpedoVisuals(torpedoSystem, dt, time);
  updateServerBombVisuals(bombSystem, dt, time);
  updateBombSightMarker(bombSystem, forward);
  updateFlakSystem(flakSystem, dt, time);
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

  const cameraSetup = getPlayerCameraSetup(forward);
  const desiredCameraPosition = cameraSetup.position;
  const desiredTarget = cameraSetup.target;
  const shakeOffset = getRamShakeOffset(heading, ramShake, time);
  ramShake = Math.max(0, ramShake - dt * 2.6);

  camera.minZ = flakViewActive ? 0.03 : (bombBayViewActive ? 0.2 : (scoutPlaneMode ? 1.5 : 0.2));
  camera.fov = bombBayViewActive ? 0.92 : (scoutPlaneMode ? 1.02 : 0.78);
  cameraPosition.copyFrom(desiredCameraPosition.add(shakeOffset));
  cameraTarget.copyFrom(desiredTarget);
  camera.position.copyFrom(cameraPosition);
  camera.setTarget(desiredTarget);
  if (!scoutPlaneMode && !flakViewActive) {
    camera.rotation.x = -Math.abs(camera.rotation.x);
  }
  boat.flakDeckView?.setEnabled(flakViewActive);
  document.body.dataset.camera = `${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}`;
  document.body.dataset.frameMs = (rawFrameSeconds * 1000).toFixed(1);
  document.body.dataset.simulationMs = (dt * 1000).toFixed(1);
  document.body.dataset.cameraRotation = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)},${camera.rotation.z.toFixed(2)}`;
  document.body.dataset.activeCamera = scene.activeCamera?.name ?? "none";
  document.body.dataset.boat = `${boat.root.position.x.toFixed(1)},${boat.root.position.y.toFixed(1)},${boat.root.position.z.toFixed(1)}`;
  document.body.dataset.scoutPlaneAltitude = scoutPlaneMode ? scoutPlaneAltitude.toFixed(1) : "";
  document.body.dataset.scoutPlaneTargetSpeed = scoutPlaneMode ? scoutPlaneTargetSpeed.toFixed(1) : "";
  document.body.dataset.scoutPlanePitch = scoutPlaneMode ? scoutPlanePitch.toFixed(3) : "";
  document.body.dataset.scoutPlaneVerticalSpeed = scoutPlaneMode ? scoutPlaneVerticalSpeed.toFixed(2) : "";
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
  updateAltimeter(scoutPlaneAltitude);
  engineValue.textContent = engineOrders[engineOrder].label;
  updateTelegraphSteps(telegraphSteps, engineOrder);
  updateMeasuredSpeed(boat.root.position, time);
  depthValue.textContent = scoutPlaneMode ? "Air" : (nextWaterSafety.isBlocked ? "Ground" : "Sea");
  depthGauge?.style.setProperty("--depth-ratio", scoutPlaneMode ? "0" : "1");
  document.body.dataset.measuredSpeed = measuredSpeedSample.speed.toFixed(2);
  compassPointer?.style.setProperty("transform", `translate(-50%, -50%) rotate(${heading}rad)`);
  if (compassHeading) compassHeading.textContent = `HDG ${formatHeadingDegrees(heading)}`;
  updateRudderGauge(rudderIndicator, rudderValue, rudderDegrees);
  const radarHeading = flakViewActive ? normalizeAngle(heading + flakYaw) : heading;
  updateNavigationInstruments(mapCanvas, radarCanvas, radarStatus, boat.root.position, getRadarContacts(enemyMotions), blockedWaters, heading, radarHeading);
  flushPerformanceTelemetry(time);
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

function isFlakViewToggleKey(event) {
  return !scoutPlaneMode && (event.code === "KeyF" || event.key === "f" || event.key === "F");
}

function isBombBayViewToggleKey(event) {
  return scoutPlaneMode && (event.code === "KeyB" || event.key === "b" || event.key === "B");
}

function toggleFlakView() {
  flakViewActive = !flakViewActive;
  heldFlakDirection = 0;
  heldFlakPitchDirection = 0;
  heldFlakFire = false;
  heldRudderDirection = 0;
  heldEngineDirection = 0;
  heldElevatorDirection = 0;
  rightMouseRudderActive = false;
  document.body.dataset.flakView = flakViewActive ? "active" : "bridge";
}

function toggleBombBayView() {
  bombBayViewActive = !bombBayViewActive;
  heldElevatorDirection = 0;
  rightMouseRudderActive = false;
  document.body.dataset.bombBayView = bombBayViewActive ? "active" : "off";
}

function changeScoutPlaneTargetSpeed(direction) {
  scoutPlaneTargetSpeed = clamp(
    scoutPlaneTargetSpeed + direction * scoutPlaneSpeedStep,
    scoutPlaneMinSpeed,
    scoutPlaneMaxSpeed
  );
  document.body.dataset.scoutPlaneTargetSpeed = scoutPlaneTargetSpeed.toFixed(1);
}

function updatePlayerFlakMount() {
  if (!boat.sternFlak?.mount) return;
  boat.sternFlak.mount.rotation.y = flakYaw;
  if (boat.sternFlak.elevationRoot) {
    boat.sternFlak.elevationRoot.rotation.x = -flakPitch;
  }
  document.body.dataset.flakYaw = String(Math.round(normalizeAngle(flakYaw) * 180 / Math.PI));
  document.body.dataset.flakPitch = String(Math.round(flakPitch * 180 / Math.PI));
}

function changeFlakPitch(direction) {
  flakPitch = clamp(flakPitch + direction * flakPitchStepRadians, flakMinPitch, flakMaxPitch);
}

function getPlayerCameraSetup(forward) {
  if (scoutPlaneMode && bombBayViewActive) {
    const position = boat.root.position
      .add(forward.scale(0.7))
      .add(new Vector3(0, -0.55 - Math.sin(time * 1.1) * 0.22, 0));
    const target = position
      .add(forward.scale(26 + Math.max(0, speed) * 0.9))
      .add(new Vector3(0, -90, 0));
    return { position, target };
  }

  if (!scoutPlaneMode && flakViewActive) {
    const elevationRoot = boat.sternFlak?.elevationRoot;
    if (!elevationRoot) {
      return { position: camera.position.clone(), target: cameraTarget.clone() };
    }
    const worldMatrix = elevationRoot.computeWorldMatrix(true);
    const position = Vector3.TransformCoordinates(
      new Vector3(0, playerFlakSightYOffset, playerFlakEyeZ),
      worldMatrix
    );
    const target = Vector3.TransformCoordinates(
      new Vector3(0, playerFlakSightYOffset, 72),
      worldMatrix
    );
    return {
      position,
      target
    };
  }

  // Fixed bridge camera for ships; oblique chase camera for the scout-plane perspective test.
  const cameraDistance = scoutPlaneMode ? 24.0 : -0.2;
  const cameraHeight = scoutPlaneMode ? 9.5 - scoutPlanePitch * 10 : 1.22;
  const position = boat.root.position
    .subtract(forward.scale(cameraDistance))
    .add(new Vector3(0, cameraHeight, 0));
  const planeLookDown = scoutPlaneMode ? -8.0 - scoutPlanePitch * 42 : 0.78;
  const target = boat.root.position
    .add(forward.scale(scoutPlaneMode ? 90.0 : 24.0))
    .add(new Vector3(0, planeLookDown, 0));
  return { position, target };
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

function setupDebugMapTeleport(canvas) {
  if (!canvas) return;

  canvas.addEventListener("pointerdown", (event) => {
    if (!debugMapEnabled || event.button !== 0 || !lastMapViewport) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.clientWidth / rect.width);
    const y = (event.clientY - rect.top) * (canvas.clientHeight / rect.height);
    const target = mapPointToWorld(x, y, lastMapViewport);

    if (debugMarkerMapEnabled) {
      addDebugMapMarker(target);
      teleportPlayerToDebugMapPosition(target);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    teleportPlayerToDebugMapPosition(target);
    event.stopPropagation();
    event.preventDefault();
  });
}

function teleportPlayerToDebugMapPosition(target) {
    boat.root.position.x = target.x;
    boat.root.position.z = target.z;
    playerBearingPosition = new Vector3(target.x, boat.root.position.y, target.z);
    speed = 0;
    engineOrder = 2;
    turnVelocity = 0;
    playerServerTarget = null;
    playerServerPositionCorrection = Vector3.Zero();
    playerServerHeadingCorrection = 0;
    playerServerTurnRateCorrection = 0;
    debugTeleportPending = true;
    nextPlayerStateSendTime = 0;
    if (!playerStateRequestInFlight) {
      sendPlayerState();
    }
    document.body.dataset.debugTeleport = `${Math.round(target.x)},${Math.round(target.z)}`;
    document.body.dataset.debugTeleportVector = `new Vector2(${Math.round(target.x)}, ${Math.round(target.z)})`;
    console.info("[sea-battle] debug map position", {
      x: Math.round(target.x),
      z: Math.round(target.z),
      vector: document.body.dataset.debugTeleportVector
    });
}

function setupDebugMapMarkerPanel() {
  debugMapMarkerOutput?.addEventListener("input", () => {
    debugMapMarkersEdited = true;
    debugMapMarkers = parseDebugMapMarkers(debugMapMarkerOutput.value);
    document.body.dataset.debugMapMarkers = String(debugMapMarkers.length);
  });

  copyDebugMapMarkersButton?.addEventListener("click", () => {
    const text = formatDebugMapMarkers();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        if (debugMapMarkerOutput) debugMapMarkerOutput.select();
      });
    } else if (debugMapMarkerOutput) {
      debugMapMarkerOutput.select();
    }
  });

  undoDebugMapMarkerButton?.addEventListener("click", () => {
    debugMapMarkersEdited = true;
    debugMapMarkers = debugMapMarkers.slice(0, -1);
    updateDebugMapMarkerPanel();
  });

  clearDebugMapMarkersButton?.addEventListener("click", () => {
    debugMapMarkersEdited = true;
    debugMapMarkers = [];
    updateDebugMapMarkerPanel();
  });
}

function addDebugMapMarker(position) {
  debugMapMarkersEdited = true;
  const marker = {
    x: Math.round(position.x),
    z: Math.round(position.z)
  };
  debugMapMarkers = [...debugMapMarkers, marker];
  document.body.dataset.debugMapMarkerLast = `new Vector2(${marker.x}, ${marker.z})`;
  console.info("[sea-battle] debug map marker", document.body.dataset.debugMapMarkerLast);
  updateDebugMapMarkerPanel();
}

function updateDebugMapMarkerPanel() {
  if (debugMapMarkerPanel) {
    debugMapMarkerPanel.hidden = !debugMarkerMapEnabled;
  }
  if (debugMapMarkerOutput) {
    debugMapMarkerOutput.value = formatDebugMapMarkers();
  }
  document.body.dataset.debugMapMarkers = String(debugMapMarkers.length);
}

function formatDebugMapMarkers() {
  return debugMapMarkers
    .map((marker) => `new Vector2(${marker.x}, ${marker.z})`)
    .join("\n");
}

function parseDebugMapMarkers(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/-?\d+(?:\.\d+)?/g);
      if (!match || match.length < 2) return null;
      const x = Number(match[0]);
      const z = Number(match[1]);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
      return {
        x: Math.round(x),
        z: Math.round(z)
      };
    })
    .filter(Boolean);
}

function setupTelegraphDragControl(scale) {
  if (!scale) return;
  let activePointerId = null;

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
    activePointerId = event.pointerId;
    setOrderFromPointer(event);
    scale.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  });
  scale.addEventListener("pointermove", (event) => {
    if (activePointerId !== event.pointerId && (event.buttons & 1) === 0) return;
    setOrderFromPointer(event);
    event.stopPropagation();
    event.preventDefault();
  });
  scale.addEventListener("pointerup", (event) => {
    if (activePointerId === event.pointerId) activePointerId = null;
  });
  scale.addEventListener("pointercancel", () => {
    activePointerId = null;
  });
}

function setupRudderDragControl(gauge) {
  if (!gauge) return;
  let activePointerId = null;

  const setRudderFromPointer = (event) => {
    if (playerDamageState !== "active") return;
    const rect = gauge.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    rudderDegrees = clamp((ratio * 2 - 1) * maxRudderDegrees, -maxRudderDegrees, maxRudderDegrees);
  };

  gauge.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    activePointerId = event.pointerId;
    setRudderFromPointer(event);
    gauge.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  });
  gauge.addEventListener("pointermove", (event) => {
    if (activePointerId !== event.pointerId && (event.buttons & 1) === 0) return;
    setRudderFromPointer(event);
    event.stopPropagation();
    event.preventDefault();
  });
  gauge.addEventListener("pointerup", (event) => {
    if (activePointerId === event.pointerId) activePointerId = null;
  });
  gauge.addEventListener("pointercancel", () => {
    activePointerId = null;
  });
}

function setupMobileFireButton(button) {
  if (!button) return;

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (flakViewActive) {
      firePlayerFlak();
    } else {
      requestPlayerWeaponFire();
    }
    event.stopPropagation();
    event.preventDefault();
  });
}

function updateMeasuredSpeed(position, now) {
  const elapsed = now - measuredSpeedSample.time;
  if (elapsed < 1) return;
  const dx = position.x - measuredSpeedSample.x;
  const dz = position.z - measuredSpeedSample.z;
  measuredSpeedSample = {
    time: now,
    x: position.x,
    z: position.z,
    speed: Math.sqrt(dx * dx + dz * dz) / elapsed
  };
}

function createPerformanceTelemetry() {
  return {
    startedAt: 0,
    lastFlushAt: 0,
    startedWallTime: Date.now(),
    frames: 0,
    frameMsTotal: 0,
    frameMsMax: 0,
    simulationMsTotal: 0,
    simulationMsMax: 0,
    slowFrames50: 0,
    slowFrames80: 0,
    clampedFrames: 0,
    httpRequests: 0,
    httpTotalMs: 0,
    httpMaxMs: 0,
    httpInFlightMax: 0,
    playerStateHttpRequests: 0,
    playerStateHttpTotalMs: 0,
    playerStateHttpMaxMs: 0,
    fireTorpedoHttpRequests: 0,
    fireTorpedoHttpTotalMs: 0,
    fireTorpedoHttpMaxMs: 0,
    dropBombHttpRequests: 0,
    dropBombHttpTotalMs: 0,
    dropBombHttpMaxMs: 0,
    performanceHttpRequests: 0,
    performanceHttpTotalMs: 0,
    performanceHttpMaxMs: 0
  };
}

function recordPerformanceFrame(rawFrameSeconds, simulationSeconds) {
  if (!performanceLoggingEnabled) return;
  const frameMs = rawFrameSeconds * 1000;
  const simulationMs = simulationSeconds * 1000;
  performanceTelemetry.frames += 1;
  performanceTelemetry.frameMsTotal += frameMs;
  performanceTelemetry.frameMsMax = Math.max(performanceTelemetry.frameMsMax, frameMs);
  performanceTelemetry.simulationMsTotal += simulationMs;
  performanceTelemetry.simulationMsMax = Math.max(performanceTelemetry.simulationMsMax, simulationMs);
  if (frameMs >= 50) performanceTelemetry.slowFrames50 += 1;
  if (frameMs >= 80) performanceTelemetry.slowFrames80 += 1;
  if (simulationSeconds < rawFrameSeconds) performanceTelemetry.clampedFrames += 1;
}

function beginHttpRequest() {
  httpRequestsInFlight += 1;
  performanceTelemetry.httpInFlightMax = Math.max(performanceTelemetry.httpInFlightMax, httpRequestsInFlight);
  return performance.now();
}

function finishHttpRequest(kind, startedAt) {
  const elapsedMs = Math.max(0, performance.now() - startedAt);
  httpRequestsInFlight = Math.max(0, httpRequestsInFlight - 1);
  performanceTelemetry.httpRequests += 1;
  performanceTelemetry.httpTotalMs += elapsedMs;
  performanceTelemetry.httpMaxMs = Math.max(performanceTelemetry.httpMaxMs, elapsedMs);

  const keyPrefix = kind === "playerState"
    ? "playerStateHttp"
    : kind === "fireTorpedo"
      ? "fireTorpedoHttp"
      : kind === "dropBomb"
        ? "dropBombHttp"
        : kind === "performance"
          ? "performanceHttp"
          : "";
  if (!keyPrefix) return;
  performanceTelemetry[`${keyPrefix}Requests`] += 1;
  performanceTelemetry[`${keyPrefix}TotalMs`] += elapsedMs;
  performanceTelemetry[`${keyPrefix}MaxMs`] = Math.max(performanceTelemetry[`${keyPrefix}MaxMs`], elapsedMs);
}

function flushPerformanceTelemetry(now) {
  if (!performanceLoggingEnabled || performanceTelemetry.frames === 0) return;
  if (performanceTelemetry.startedAt === 0) {
    performanceTelemetry.startedAt = now;
    performanceTelemetry.lastFlushAt = now;
    return;
  }
  if (now - performanceTelemetry.lastFlushAt < 2) return;

  const elapsed = Math.max(0.001, now - performanceTelemetry.lastFlushAt);
  const reportStartedWallTime = performanceTelemetry.startedWallTime;
  const reportEndedWallTime = Date.now();
  const report = {
    playerId,
    teamId: playerTeamId,
    shipId: playerServerShipId ?? "",
    setupId: "server",
    userAgent: navigator.userAgent,
    platform: clientCapability.platform,
    vendor: clientCapability.vendor,
    hardwareConcurrency: clientCapability.hardwareConcurrency,
    deviceMemory: clientCapability.deviceMemory,
    maxTouchPoints: clientCapability.maxTouchPoints,
    devicePixelRatio: clientCapability.devicePixelRatio,
    screenWidth: clientCapability.screenWidth,
    screenHeight: clientCapability.screenHeight,
    viewportWidth: canvas.clientWidth,
    viewportHeight: canvas.clientHeight,
    webglVendor: clientCapability.webglVendor,
    webglRenderer: clientCapability.webglRenderer,
    performanceClass: clientCapability.performanceClass,
    hardwareScalingLevel: renderQuality.hardwareScalingLevel,
    startedAt: new Date(reportStartedWallTime).toISOString(),
    endedAt: new Date(reportEndedWallTime).toISOString(),
    frames: performanceTelemetry.frames,
    seconds: Number(elapsed.toFixed(2)),
    avgFrameMs: Number((performanceTelemetry.frameMsTotal / performanceTelemetry.frames).toFixed(2)),
    maxFrameMs: Number(performanceTelemetry.frameMsMax.toFixed(2)),
    avgSimulationMs: Number((performanceTelemetry.simulationMsTotal / performanceTelemetry.frames).toFixed(2)),
    maxSimulationMs: Number(performanceTelemetry.simulationMsMax.toFixed(2)),
    slowFrames50: performanceTelemetry.slowFrames50,
    slowFrames80: performanceTelemetry.slowFrames80,
    clampedFrames: performanceTelemetry.clampedFrames,
    measuredSpeed: Number(measuredSpeedSample.speed.toFixed(2)),
    x: Number(boat.root.position.x.toFixed(2)),
    z: Number(boat.root.position.z.toFixed(2)),
    heading: Number(heading.toFixed(4)),
    selectedSpeed: Number(speed.toFixed(2)),
    speed: Number(speed.toFixed(2)),
    turnVelocity: Number(turnVelocity.toFixed(4)),
    engineOrder,
    rudderDegrees: Number(rudderDegrees.toFixed(1)),
    playerDamageState,
    playerTorpedoesRemaining: Number.isFinite(playerTorpedoesRemaining) ? playerTorpedoesRemaining : -1,
    localTorpedoCount: torpedoSystem.active.length,
    serverTorpedoes: readDatasetInt("serverTorpedoes"),
    serverTorpedoVisuals: readDatasetInt("serverTorpedoVisuals"),
    serverBombs: readDatasetInt("serverBombs"),
    serverBombVisuals: readDatasetInt("serverBombVisuals"),
    fireTorpedoSync: document.body.dataset.fireTorpedoSync ?? "",
    fireTorpedoSyncError: document.body.dataset.fireTorpedoSyncError ?? "",
    dropBombSync: document.body.dataset.dropBombSync ?? "",
    dropBombSyncError: document.body.dataset.dropBombSyncError ?? "",
    playerStateSync: document.body.dataset.playerStateSync ?? "",
    playerStateSyncError: document.body.dataset.playerStateSyncError ?? "",
    gameEventSource: document.body.dataset.gameEventSource ?? "",
    lastKey: document.body.dataset.lastKey ?? "",
    ownServerTorpedoLaunch: document.body.dataset.ownServerTorpedoLaunch ?? "",
    sessionExpired: document.body.dataset.sessionExpired ?? "",
    meshCount: scene.meshes.length,
    visibleMeshCount: scene.meshes.filter((mesh) => mesh.isEnabled() && mesh.isVisible).length,
    enemyCount: enemyMotions.filter((motion) => motion.root.isEnabled()).length,
    foamCount: foam?.patches?.length ?? 0,
    torpedoCount: torpedoSystem.active.length,
    serverShips: serverShipsById.size,
    gameEventSourceReady,
    gameStreamAgeSeconds: lastGameStreamMessageAt > 0 ? Number((time - lastGameStreamMessageAt).toFixed(2)) : -1,
    httpRequests: performanceTelemetry.httpRequests,
    avgHttpMs: averageMs(performanceTelemetry.httpTotalMs, performanceTelemetry.httpRequests),
    maxHttpMs: Number(performanceTelemetry.httpMaxMs.toFixed(2)),
    httpInFlightMax: performanceTelemetry.httpInFlightMax,
    playerStateHttpRequests: performanceTelemetry.playerStateHttpRequests,
    avgPlayerStateHttpMs: averageMs(performanceTelemetry.playerStateHttpTotalMs, performanceTelemetry.playerStateHttpRequests),
    maxPlayerStateHttpMs: Number(performanceTelemetry.playerStateHttpMaxMs.toFixed(2)),
    fireTorpedoHttpRequests: performanceTelemetry.fireTorpedoHttpRequests,
    avgFireTorpedoHttpMs: averageMs(performanceTelemetry.fireTorpedoHttpTotalMs, performanceTelemetry.fireTorpedoHttpRequests),
    maxFireTorpedoHttpMs: Number(performanceTelemetry.fireTorpedoHttpMaxMs.toFixed(2)),
    dropBombHttpRequests: performanceTelemetry.dropBombHttpRequests,
    avgDropBombHttpMs: averageMs(performanceTelemetry.dropBombHttpTotalMs, performanceTelemetry.dropBombHttpRequests),
    maxDropBombHttpMs: Number(performanceTelemetry.dropBombHttpMaxMs.toFixed(2)),
    performanceHttpRequests: performanceTelemetry.performanceHttpRequests,
    avgPerformanceHttpMs: averageMs(performanceTelemetry.performanceHttpTotalMs, performanceTelemetry.performanceHttpRequests),
    maxPerformanceHttpMs: Number(performanceTelemetry.performanceHttpMaxMs.toFixed(2))
  };

  sendPerformanceReport(report);
  performanceTelemetry = createPerformanceTelemetry();
  performanceTelemetry.startedAt = now;
  performanceTelemetry.lastFlushAt = now;
}

function sendPerformanceReport(report) {
  const requestStartedAt = beginHttpRequest();
  const finishPerformanceRequest = () => finishHttpRequest("performance", requestStartedAt);
  fetch(gameEndpoint("/game/client-performance"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
    keepalive: true
  }).then(
    finishPerformanceRequest,
    (error) => {
      document.body.dataset.performanceLogError = error.message;
      finishPerformanceRequest();
    }
  );
}

function averageMs(totalMs, count) {
  return count > 0 ? Number((totalMs / count).toFixed(2)) : 0;
}

function readDatasetInt(name) {
  const value = Number.parseInt(document.body.dataset[name] ?? "", 10);
  return Number.isFinite(value) ? value : -1;
}

function createClientCapabilitySnapshot(engineInstance, renderCanvas) {
  const gl = engineInstance?._gl ?? null;
  const debugInfo = gl?.getExtension?.("WEBGL_debug_renderer_info");
  const webglVendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "";
  const webglRenderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 0;
  const deviceMemory = navigator.deviceMemory ?? 0;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const performanceClass = estimateInitialPerformanceClass({
    hardwareConcurrency,
    deviceMemory,
    devicePixelRatio,
    maxTouchPoints,
    webglRenderer,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0
  });

  return {
    platform: navigator.platform ?? "",
    vendor: navigator.vendor ?? "",
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints,
    devicePixelRatio,
    screenWidth: window.screen?.width ?? renderCanvas.clientWidth,
    screenHeight: window.screen?.height ?? renderCanvas.clientHeight,
    webglVendor: String(webglVendor ?? ""),
    webglRenderer: String(webglRenderer ?? ""),
    performanceClass
  };
}

function applyRenderQuality(engineInstance, capability) {
  const hardwareScalingLevel = chooseHardwareScalingLevel();
  engineInstance.setHardwareScalingLevel(hardwareScalingLevel);
  return {
    hardwareScalingLevel,
    visualEffects: chooseVisualEffectsLevel(capability)
  };
}

function chooseHardwareScalingLevel() {
  const urlValue = Number(new URLSearchParams(location.search).get("scale"));
  if (Number.isFinite(urlValue) && urlValue >= 1 && urlValue <= 3) {
    return urlValue;
  }
  return 1;
}

function chooseVisualEffectsLevel(capability) {
  const params = new URLSearchParams(location.search);
  const requested = String(params.get("effects") ?? params.get("quality") ?? "").toLowerCase();
  if (["off", "low", "tv"].includes(requested)) return "low";
  if (["high", "full"].includes(requested)) return "high";
  if (["software", "low"].includes(capability.performanceClass)) return "low";
  return "standard";
}

function estimateInitialPerformanceClass(capability) {
  const renderer = String(capability.webglRenderer ?? "").toLowerCase();
  if (renderer.includes("swiftshader")) return "software";
  if (capability.hardwareConcurrency > 0 && capability.hardwareConcurrency <= 2) return "low";
  if (capability.devicePixelRatio >= 2.5 && capability.maxTouchPoints > 0) return "mobile-high-dpi";
  if (capability.screenWidth >= 3000 || capability.screenHeight >= 1800) return "large-screen";
  return "standard";
}

function isTorpedoFireKey(event) {
  const keyCode = event.keyCode ?? event.which;
  const code = event.code;
  const key = event.key;

  return (
    code === "Space" ||
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

function updateAltimeter(altitudeUnits) {
  if (!altitudeValue || !altimeterHundredsHand || !altimeterThousandsHand) return;

  const altitudeMeters = Math.max(0, Math.round(altitudeUnits * worldMetersPerUnit));
  altitudeValue.textContent = String(altitudeMeters);
  altimeterHundredsHand.style.transform = `translate(-50%, -100%) rotate(${(altitudeMeters % 1000) / 1000}turn)`;
  altimeterThousandsHand.style.transform = `translate(-50%, -100%) rotate(${altitudeMeters / 10000}turn)`;
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
  if (playerDamageState !== "active" || flakViewActive || event.button !== 2) return false;
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
  if (!isMouseTorpedoButton(button) || playerDamageState !== "active" || flakViewActive) return false;
  requestPlayerWeaponFire();
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

  return gameEndpoint("/game/world");
}

async function loadDebugRespawnCandidates() {
  if (debugRespawnCandidatesLoaded) return;
  debugRespawnCandidatesLoaded = true;
  const endpoint = getDebugRespawnCandidatesEndpoint();
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    const payload = await response.json();
    debugRespawnCandidates = Array.isArray(payload)
      ? payload
          .map((point) => ({ x: Number(point.x), z: Number(point.z) }))
          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.z))
      : [];
    document.body.dataset.debugRespawnCandidates = String(debugRespawnCandidates.length);
  } catch (error) {
    debugRespawnCandidatesLoaded = false;
    document.body.dataset.debugRespawnCandidates = "error";
    console.warn("[sea-battle] respawn candidate debug layer unavailable", error);
  }
}

function getDebugRespawnCandidatesEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/debug/respawn-candidates`;
  }

  return gameEndpoint("/game/debug/respawn-candidates");
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

  return gameEndpoint("/game/state");
}

async function loadServerBuildInfo() {
  const response = await fetch(getServerBuildInfoEndpoint(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`status ${response.status}`);
  }
  return response.json();
}

function getServerBuildInfoEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/version`;
  }

  return gameEndpoint("/game/version");
}

function updateBuildInfoPanel(clientBuild, serverBuild) {
  if (clientVersionValue) {
    clientVersionValue.textContent = formatBuildInfo(clientBuild);
  }
  if (serverVersionValue) {
    serverVersionValue.textContent = serverBuild ? formatBuildInfo(serverBuild) : "pending";
  }
  document.body.dataset.clientBuild = formatBuildInfo(clientBuild);
  document.body.dataset.serverBuild = serverBuild ? formatBuildInfo(serverBuild) : "pending";
}

function formatBuildInfo(info) {
  if (!info) return "unknown";
  const version = info.version ?? "unknown";
  const commit = info.commit ? ` ${info.commit}` : "";
  const buildTime = info.buildTime ? ` ${info.buildTime}` : "";
  return `${version}${commit}${buildTime}`;
}

function getPlayerStateEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/player-state`;
  }

  return gameEndpoint("/game/player-state");
}

function getFireTorpedoEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/fire-torpedo`;
  }

  return gameEndpoint("/game/fire-torpedo");
}

function getDropBombEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/drop-bomb`;
  }

  return gameEndpoint("/game/drop-bomb");
}

function getFireFlakEndpoint() {
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/fire-flak`;
  }

  return gameEndpoint("/game/fire-flak");
}

function getGameEventsEndpoint() {
  const safePlayerId = encodeURIComponent(playerId);
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/events/${safePlayerId}`;
  }

  return gameEndpoint(`/game/events/${safePlayerId}`);
}

async function requirePlayerLogin() {
  const accountId = readStoredValue("accountId");
  if (!accountId.trim()) {
    window.location.replace(startPageUrl());
    return new Promise(() => {});
  }

  const response = await fetch(getPlayerSessionByAccountEndpoint(accountId), { cache: "no-store" });
  if (!response.ok) {
    localStorage.removeItem("seaBattlePlayerId");
    localStorage.removeItem("seaBattlePlayerInitials");
    localStorage.removeItem("seaBattlePlayerTeamId");
    window.location.replace(startPageUrl());
    return new Promise(() => {});
  }

  const session = await response.json();
  const playerId = String(session.playerId ?? "");
  const initials = sanitizeInitials(session.initials);
  const teamId = sanitizeTeamId(session.teamId);
  if (playerId.startsWith(`player-${initials}-`) && initials && teamId) {
    return { playerId, initials, teamId };
  }

  window.location.replace(startPageUrl());
  return new Promise(() => {});
}

async function requireRegisteredGameSession(playerId) {
  const response = await fetch(getPlayerSessionEndpoint(playerId), { cache: "no-store" });
  if (response.ok) {
    return;
  }
  expireActiveLogin(`session-check-${response.status}`);
  await new Promise(() => {});
}

function getPlayerSessionEndpoint(playerId) {
  const safePlayerId = encodeURIComponent(playerId);
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/session/${safePlayerId}`;
  }
  return gameEndpoint(`/game/session/${safePlayerId}`);
}

function getPlayerSessionByAccountEndpoint(accountId) {
  const safeAccountId = encodeURIComponent(accountId);
  if (location.port === "5173" || location.port === "4173") {
    return `${location.protocol}//${location.hostname}/game/session/account/${safeAccountId}`;
  }
  return gameEndpoint(`/game/session/account/${safeAccountId}`);
}

function gameEndpoint(path) {
  return `${serverPathPrefix()}${path}`;
}

function startPageUrl() {
  return `${serverPathPrefix()}/start.html`;
}

function serverPathPrefix() {
  return location.pathname === "/sea-battle" || location.pathname.startsWith("/sea-battle/")
    ? "/sea-battle"
    : "";
}

function expireActiveLogin(reason) {
  document.body.dataset.sessionExpired = reason;
  localStorage.removeItem("seaBattlePlayerId");
  localStorage.removeItem("seaBattlePlayerInitials");
  localStorage.removeItem("seaBattlePlayerTeamId");
  window.location.replace(startPageUrl());
}

function readStoredValue(key) {
  const raw = localStorage.getItem(key) ?? "";
  if (!raw.trim()) {
    return "";
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "value" in parsed) {
      return String(parsed.value ?? "");
    }
  } catch (ignored) {
    // Existing Sea Battle values were stored as plain strings. Keep supporting them.
  }
  return raw;
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

function getRequestedPlayerTeamId(ships, selectedTeamId = "") {
  const requestedTeamId = selectedTeamId;
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
    openHostSpecialMenu();
  });
}

function openHostSpecialMenu() {
  const debugLabel = debugMapEnabled ? "Debug-Karte aus" : "Debug-Karte an";
  const markerLabel = debugMarkerMapEnabled ? "Marker-Karte aus" : "Marker-Karte an";
  const choice = window.prompt(`Spezialmenue: 1 = ${debugLabel}, 2 = Spiel neu starten, 3 = ${markerLabel}`, "1");
  if (choice === null) return;
  const normalized = choice.trim().toLowerCase();
  if (normalized === "1" || normalized === "debug" || normalized === "karte") {
    toggleDebugMap();
    return;
  }
  if (normalized === "2" || normalized === "reset" || normalized === "restart" || normalized === "neu") {
    requestHostGameReset();
    return;
  }
  if (normalized === "3" || normalized === "marker" || normalized === "punkte") {
    toggleDebugMarkerMap();
  }
}

function toggleDebugMap() {
  debugMapEnabled = !debugMapEnabled;
  if (!debugMapEnabled) {
    debugMarkerMapEnabled = false;
  }
  bigMapEnabled = debugMapEnabled;
  document.body.dataset.debugMap = String(debugMapEnabled);
  document.body.dataset.debugMarkerMap = String(debugMarkerMapEnabled);
  document.body.classList.toggle("big-map", bigMapEnabled);
  document.body.classList.toggle("debug-marker-map", debugMarkerMapEnabled);
  document.body.dataset.bigMap = String(bigMapEnabled);
  const url = new URL(location.href);
  if (debugMapEnabled) {
    url.searchParams.set("debug", "1");
    if (debugMarkerMapEnabled) {
      url.searchParams.set("markers", "1");
    } else {
      url.searchParams.delete("markers");
    }
    url.searchParams.delete("bigMap");
    loadDebugRespawnCandidates();
  } else {
    url.searchParams.delete("debug");
    url.searchParams.delete("bigMap");
    url.searchParams.delete("markers");
    document.body.dataset.debugMapShips = "0";
    document.body.dataset.debugRespawnCandidates = "0";
  }
  updateDebugMapMarkerPanel();
  if (mapCanvas && boat?.root?.position) {
    drawMapInstrument(mapCanvas, boat.root.position, blockedWaters, mapZoom, heading);
  }
  if (history.replaceState) {
    history.replaceState(null, "", url);
  }
}

function toggleDebugMarkerMap() {
  debugMarkerMapEnabled = !debugMarkerMapEnabled;
  debugMapEnabled = debugMarkerMapEnabled || debugMapEnabled;
  bigMapEnabled = debugMapEnabled;
  document.body.dataset.debugMap = String(debugMapEnabled);
  document.body.dataset.debugMarkerMap = String(debugMarkerMapEnabled);
  document.body.classList.toggle("big-map", bigMapEnabled);
  document.body.classList.toggle("debug-marker-map", debugMarkerMapEnabled);
  document.body.dataset.bigMap = String(bigMapEnabled);
  const url = new URL(location.href);
  if (debugMapEnabled) {
    url.searchParams.set("debug", "1");
    url.searchParams.delete("bigMap");
    loadDebugRespawnCandidates();
  } else {
    url.searchParams.delete("debug");
    url.searchParams.delete("bigMap");
  }
  if (debugMarkerMapEnabled) {
    url.searchParams.set("markers", "1");
  } else {
    url.searchParams.delete("markers");
  }
  updateDebugMapMarkerPanel();
  if (mapCanvas && boat?.root?.position) {
    drawMapInstrument(mapCanvas, boat.root.position, blockedWaters, mapZoom, heading);
  }
  if (history.replaceState) {
    history.replaceState(null, "", url);
  }
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
  const defaultChoice = "1";
  const choice = window.prompt("World: 1 = Dense land, 2 = Islands, 3 = Escort debug, 4 = Landmark tour, 5 = Dense land crowded, 6 = Dense land crowded reverse, 7 = Scout plane", defaultChoice);
  if (choice === null) return null;
  const normalized = choice.trim().toLowerCase();
  if (normalized === "2" || normalized === "islands" || normalized === "island") return "islands";
  if (normalized === "3" || normalized === "escort-debug" || normalized === "escort") return "escort-debug";
  if (normalized === "4" || normalized === "landmark-tour" || normalized === "tour") return "landmark-tour";
  if (normalized === "5" || normalized === "fleet-clash" || normalized === "clash" || normalized === "crowded") return "dense-land-crowded";
  if (normalized === "6" || normalized === "fleet-clash-reverse" || normalized === "clash-reverse" || normalized === "crowded-reverse") return "dense-land-crowded-reverse";
  if (normalized === "7" || normalized === "scout-plane" || normalized === "plane" || normalized === "flugzeug" || normalized === "aufklaerer") return scoutPlaneSetupId;
  return "dense-land";
}

function getResetGameEndpoint() {
  if (location.protocol === "file:") {
    return "http://127.0.0.1:9090/game/reset";
  }
  return gameEndpoint("/game/reset");
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
  const activeTeamIds = new Set([
    ...Object.keys(activeCounts).filter((teamId) => activeCounts[teamId] > 0),
    ...Object.keys(destroyedShipsByTeam ?? {})
  ]);
  fleetStatusRows.innerHTML = "";

  teamDefinitions.filter((team) => activeTeamIds.has(team.id)).forEach((team) => {
    const active = activeCounts[team.id] ?? 0;
    const lost = Number.isFinite(destroyedShipsByTeam[team.id]) ? destroyedShipsByTeam[team.id] : 0;
    const observedTotal = active + lost;
    fleetTotals[team.id] = Math.max(fleetTotals[team.id] ?? 0, observedTotal);
    const total = fleetTotals[team.id] ?? active;
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
    kills.textContent = String(Number.isFinite(killsByPlayer?.[ship.controlledBy]) ? killsByPlayer[ship.controlledBy] : 0);

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
  const requestStartedAt = beginHttpRequest();
  const debugTeleport = debugTeleportPending;
  try {
    const response = await fetch(getPlayerStateEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        teamId: playerTeamId,
        x: boat.root.position.x,
        y: scoutPlaneMode ? boat.root.position.y : 0,
        z: boat.root.position.z,
        heading,
        speed,
        turnVelocity,
        engineOrder,
        rudderDegrees: Math.round(rudderDegrees),
        clientTime: performance.now() / 1000,
        debugTeleport,
        vehicleType: scoutPlaneMode ? "scout-plane" : "torpedo-boat"
      })
    });
    if (!response.ok) {
      if (response.status === 403) {
        expireActiveLogin("player-state-403");
        return;
      }
      throw new Error(`Player state request failed with ${response.status}`);
    }
    await response.json();
    if (debugTeleport) {
      debugTeleportPending = false;
    }
    document.body.dataset.playerStateSync = "command-ok";
  } catch (error) {
    document.body.dataset.playerStateSync = "error";
    document.body.dataset.playerStateSyncError = error.message;
  } finally {
    finishHttpRequest("playerState", requestStartedAt);
    playerStateRequestInFlight = false;
  }
}

function requestPlayerWeaponFire() {
  return scoutPlaneMode ? requestPlayerBombDrop() : requestPlayerTorpedoFire();
}

async function requestPlayerTorpedoFire() {
  if (fireTorpedoRequestInFlight || playerDamageState !== "active") return;
  if (scoutPlaneMode) {
    document.body.dataset.fireTorpedoSync = "ignored-scout-plane";
    return;
  }

  fireTorpedoRequestInFlight = true;
  const requestStartedAt = beginHttpRequest();
  try {
    const response = await fetch(getFireTorpedoEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        teamId: playerTeamId,
        vehicleType: scoutPlaneMode ? "scout-plane" : "torpedo-boat"
      })
    });
    if (!response.ok) {
      if (response.status === 403) {
        expireActiveLogin("fire-torpedo-403");
        return;
      }
      throw new Error(`Fire torpedo request failed with ${response.status}`);
    }
    applyServerGameSnapshot(await response.json());
    document.body.dataset.fireTorpedoSync = "ok";
  } catch (error) {
    document.body.dataset.fireTorpedoSync = "error";
    document.body.dataset.fireTorpedoSyncError = error.message;
  } finally {
    finishHttpRequest("fireTorpedo", requestStartedAt);
    fireTorpedoRequestInFlight = false;
  }
}

async function requestPlayerBombDrop() {
  if (dropBombRequestInFlight || playerDamageState !== "active") return;
  if (!scoutPlaneMode) return;

  dropBombRequestInFlight = true;
  const requestStartedAt = beginHttpRequest();
  try {
    const response = await fetch(getDropBombEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        teamId: playerTeamId,
        x: boat.root.position.x,
        y: boat.root.position.y,
        z: boat.root.position.z,
        heading,
        speed,
        vehicleType: "scout-plane"
      })
    });
    if (!response.ok) {
      if (response.status === 403) {
        expireActiveLogin("drop-bomb-403");
        return;
      }
      throw new Error(`Drop bomb request failed with ${response.status}`);
    }
    applyServerGameSnapshot(await response.json());
    document.body.dataset.dropBombSync = "ok";
  } catch (error) {
    document.body.dataset.dropBombSync = "error";
    document.body.dataset.dropBombSyncError = error.message;
  } finally {
    finishHttpRequest("dropBomb", requestStartedAt);
    dropBombRequestInFlight = false;
  }
}

function applyServerGameSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.ships)) return;
  const snapshotClientTime = getSnapshotClientTime(snapshot);
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
    Array.isArray(snapshot.torpedoImpacts) ? snapshot.torpedoImpacts : [],
    snapshotClientTime
  );
  syncServerBombs(
    Array.isArray(snapshot.bombs) ? snapshot.bombs : [],
    Array.isArray(snapshot.bombImpacts) ? snapshot.bombImpacts : [],
    snapshotClientTime
  );
  syncServerFlakProjectiles(
    Array.isArray(snapshot.flakProjectiles) ? snapshot.flakProjectiles : [],
    snapshotClientTime
  );
  document.body.dataset.remoteShips = String(snapshot.ships.length);
  document.body.dataset.serverTorpedoes = String(Array.isArray(snapshot.torpedoes) ? snapshot.torpedoes.length : 0);
  document.body.dataset.serverBombs = String(Array.isArray(snapshot.bombs) ? snapshot.bombs.length : 0);
  document.body.dataset.serverFlakProjectiles = String(Array.isArray(snapshot.flakProjectiles) ? snapshot.flakProjectiles.length : 0);
  document.body.dataset.playerStateSync = "ok";
}

function getSnapshotClientTime(snapshot) {
  if (!Number.isFinite(snapshot?.t)) return time;

  const observedOffset = time - snapshot.t;
  serverClockOffset = serverClockOffset === null
    ? observedOffset
    : Math.min(serverClockOffset, observedOffset);
  document.body.dataset.serverClockOffset = serverClockOffset.toFixed(3);
  return snapshot.t + serverClockOffset;
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
  lastGameStreamMessageAt = time;
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
  document.body.dataset.gameEventSource = gameEventSourceReady ? "open" : "message";
  document.body.dataset.gameEventTime = String(message.state?.t ?? "");
}

function updateOrCreateRemoteShip(ship) {
  const existing = enemyMotions.find((motion) => motion.id === ship.id);
  if (existing) {
    if (existing.vehicleType === getShipVehicleType(ship)) {
      applyServerShipSnapshot(existing, ship);
      return existing;
    }
    disposeRemoteMotion(existing);
    enemyMotions.splice(enemyMotions.indexOf(existing), 1);
  }

  const boatModel = createRemoteVehicleModel(scene, materials, `server_ship_${ship.id}`, ship);
  const headingValue = Number.isFinite(ship.heading) ? ship.heading : 0;
  boatModel.root.position = new Vector3(ship.x, remoteVehicleY(ship), ship.z);
  boatModel.root.rotationQuaternion = Quaternion.FromEulerAngles(0, headingValue, 0);
  boatModel.root.metadata = {
    serverShipId: ship.id,
    teamId: ship.teamId,
    controlledBy: ship.controlledBy,
    vehicleType: getShipVehicleType(ship)
  };
  const motion = createEnemyMotion(boatModel, headingValue, ship.engineOrder ?? 2, enemyMotions.length, ship);
  enemyMotions.push(motion);
  return motion;
}

function disposeRemoteMotion(motion) {
  motion.timers?.forEach((timer) => window.clearTimeout(timer));
  motion.root?.getChildMeshes?.().forEach((mesh) => mesh.dispose());
  motion.root?.dispose?.();
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

  const wasInactive = motion.state === "sunk" || motion.serverState === "sunk" || !motion.root.isEnabled();
  const correctionDistance = distance2D(motion.root.position, { x: ship.x, z: ship.z });
  remoteCorrectionSamples += 1;
  remoteCorrectionTotal += correctionDistance;
  remoteCorrectionMax = Math.max(remoteCorrectionMax, correctionDistance);
  document.body.dataset.remoteCorrection = correctionDistance.toFixed(2);
  document.body.dataset.remoteCorrectionAvg = (remoteCorrectionTotal / remoteCorrectionSamples).toFixed(2);
  document.body.dataset.remoteCorrectionMax = remoteCorrectionMax.toFixed(2);

  motion.teamId = ship.teamId;
  motion.controlledBy = ship.controlledBy;
  motion.vehicleType = getShipVehicleType(ship);
  motion.serverState = ship.state;
  motion.serverPosition.x = Number.isFinite(ship.x) ? ship.x : motion.serverPosition.x;
  motion.serverPosition.y = remoteVehicleY(ship);
  motion.serverPosition.z = Number.isFinite(ship.z) ? ship.z : motion.serverPosition.z;
  motion.serverHeading = Number.isFinite(ship.heading) ? ship.heading : motion.serverHeading;
  motion.serverSpeed = Number.isFinite(ship.speed) ? ship.speed : motion.serverSpeed;
  motion.serverSnapshotTime = time;
  motion.heading = Number.isFinite(ship.heading) ? blendAngle(motion.heading, ship.heading, 0.18) : motion.heading;
  motion.speed = Number.isFinite(ship.speed) ? motion.speed + (ship.speed - motion.speed) * 0.18 : motion.speed;
  motion.engineOrder = Number.isInteger(ship.engineOrder) ? ship.engineOrder : motion.engineOrder;
  motion.rudder = Number.isFinite(ship.rudderDegrees) ? clamp(ship.rudderDegrees / maxRudderDegrees, -1, 1) : motion.rudder;
  if (wasInactive && correctionDistance > 55) {
    motion.root.position.x = motion.serverPosition.x;
    motion.root.position.y = motion.serverPosition.y;
    motion.root.position.z = motion.serverPosition.z;
  }
  motion.root.setEnabled(true);
  motion.state = "active";
  motion.root.metadata = {
    ...motion.root.metadata,
    teamId: ship.teamId,
    controlledBy: ship.controlledBy,
    vehicleType: motion.vehicleType
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

function updateNavigationInstruments(mapCanvas, radarCanvas, radarStatus, playerPosition, radarContacts, landZones, heading, radarHeading = heading) {
  drawMapInstrument(mapCanvas, playerPosition, landZones, mapZoom, heading);
  const radarRange = bombBayViewActive
    ? clientRadarRange * bombBayRadarRangeFactor
    : (scoutPlaneMode || flakViewActive ? clientRadarRange * scoutPlaneRadarRangeFactor : clientRadarRange);
  drawRadarInstrument(radarCanvas, radarStatus, playerPosition, radarContacts, landZones, radarHeading, radarRange, {
    ignoreLandShadows: scoutPlaneMode || flakViewActive
  });
  document.body.dataset.radarHeading = String(Math.round(normalizeAngle(radarHeading) * 180 / Math.PI));
}

function drawMapInstrument(canvas, playerPosition, landZones, zoomControl, heading) {
  if (!canvas) return;

  const ctx = prepareInstrumentCanvas(canvas);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!ctx || width < 2 || height < 2) return;
  const zoomIndex = clamp(Number(zoomControl?.value ?? 1), 0, mapZoomScales.length - 1);
  const zoomScale = mapZoomScales[zoomIndex];
  const tile = getMapTile(playerPosition, zoomScale);
  const bounds = getMapTileBounds(tile, zoomScale);
  const scale = Math.min(width / (bounds.maxX - bounds.minX), height / (bounds.maxZ - bounds.minZ));
  lastMapViewport = { bounds, width, height, scale };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(7, 31, 43, 0.78)";
  ctx.fillRect(0, 0, width, height);

  drawMapSectorGrid(ctx, bounds, width, height, scale);

  const visibleLandZones = landZones.filter((zone) => zoneIntersectsBounds(zone, bounds));
  drawMapLandUnion(ctx, visibleLandZones, bounds, width, height, scale);
  if (debugMapEnabled) {
    drawDebugMapHeightOverlay(ctx, visibleLandZones, bounds, width, height, scale);
  }
  if (!debugMarkerMapEnabled) {
    drawMapLandLabels(ctx, visibleLandZones, bounds, width, height, scale);
  }
  drawMapLandmarkMarkers(ctx, landZones, bounds, width, height, scale);

  if (debugMapEnabled) {
    drawDebugRespawnCandidates(ctx, bounds, width, height, scale);
    drawDebugMapMarkers(ctx, bounds, width, height, scale);
    drawDebugMapShips(ctx, bounds, width, height, scale);
  }

  const playerPoint = clampInstrumentPoint(worldToMapPoint(playerPosition, bounds, width, height, scale), width, height, 6);
  drawMapShipMarker(ctx, playerPoint.x, playerPoint.y, "#f7fbff", heading);

  if (mapSectorValue) mapSectorValue.textContent = formatMapSector(playerPosition);
  if (mapCoordinateValue) mapCoordinateValue.textContent = `${formatWorldCoordinate(playerPosition)}\n${formatMapBounds(bounds)}\nZoom x${zoomScale}`;
  updateMapGridEdgeLabels(bounds, width, height, scale);
}

function drawDebugRespawnCandidates(ctx, bounds, width, height, scale) {
  if (!debugRespawnCandidates.length) return;

  let visibleCandidates = 0;
  ctx.save();
  ctx.font = bigMapEnabled ? "800 11px Inter, sans-serif" : "800 8px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  debugRespawnCandidates.forEach((position, index) => {
    if (position.x < bounds.minX || position.x > bounds.maxX || position.z < bounds.minZ || position.z > bounds.maxZ) {
      return;
    }
    const point = worldToMapPoint(position, bounds, width, height, scale);
    const radius = bigMapEnabled ? 7 : 5;
    ctx.fillStyle = "rgba(7, 31, 43, 0.82)";
    ctx.strokeStyle = "rgba(171, 255, 245, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(211, 255, 250, 0.98)";
    ctx.fillText(String(index + 1), point.x, point.y + 0.5);
    visibleCandidates += 1;
  });
  ctx.restore();
  document.body.dataset.debugRespawnCandidatesVisible = String(visibleCandidates);
}

function drawDebugMapMarkers(ctx, bounds, width, height, scale) {
  if (!debugMarkerMapEnabled || !debugMapMarkers.length) return;

  ctx.save();
  ctx.font = bigMapEnabled ? "900 12px Inter, sans-serif" : "900 9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  debugMapMarkers.forEach((marker, index) => {
    if (marker.x < bounds.minX || marker.x > bounds.maxX || marker.z < bounds.minZ || marker.z > bounds.maxZ) {
      return;
    }
    const point = worldToMapPoint(marker, bounds, width, height, scale);
    const radius = bigMapEnabled ? 8 : 5.5;
    ctx.fillStyle = "rgba(255, 44, 44, 0.88)";
    ctx.strokeStyle = "rgba(255, 245, 245, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
    ctx.fillText(String(index + 1), point.x, point.y + 0.5);
  });
  ctx.restore();
}

function drawDebugMapShips(ctx, bounds, width, height, scale) {
  let visibleShips = 0;
  for (const ship of serverShipsById.values()) {
    if (!ship || ship.state !== "active") continue;
    if (!Number.isFinite(ship.x) || !Number.isFinite(ship.z)) continue;
    const position = { x: ship.x, z: ship.z };
    if (position.x < bounds.minX || position.x > bounds.maxX || position.z < bounds.minZ || position.z > bounds.maxZ) {
      continue;
    }
    const point = worldToMapPoint(position, bounds, width, height, scale);
    drawMapShipMarker(ctx, point.x, point.y, mapShipColor(ship), Number.isFinite(ship.heading) ? ship.heading : 0, 5.5);
    drawMapShipLabel(ctx, createShipDesignation(ship), point.x + 7, point.y, mapShipColor(ship));
    visibleShips += 1;
  }
  document.body.dataset.debugMapShips = String(visibleShips);
}

function drawDebugMapHeightOverlay(ctx, zones, bounds, width, height, scale) {
  if (zones.length === 0) return;

  const step = bigMapEnabled ? 3 : 7;
  const maxHeight = 24;

  ctx.save();
  zones.forEach((zone) => {
    const minPoint = worldToMapPoint(
      { x: zone.x - getZoneVisualRx(zone), z: zone.z + getZoneVisualRz(zone) },
      bounds,
      width,
      height,
      scale
    );
    const maxPoint = worldToMapPoint(
      { x: zone.x + getZoneVisualRx(zone), z: zone.z - getZoneVisualRz(zone) },
      bounds,
      width,
      height,
      scale
    );
    const minX = Math.max(0, Math.floor(Math.min(minPoint.x, maxPoint.x)));
    const maxX = Math.min(width, Math.ceil(Math.max(minPoint.x, maxPoint.x)));
    const minY = Math.max(0, Math.floor(Math.min(minPoint.y, maxPoint.y)));
    const maxY = Math.min(height, Math.ceil(Math.max(minPoint.y, maxPoint.y)));

    for (let y = minY; y <= maxY; y += step) {
      for (let x = minX; x <= maxX; x += step) {
        const world = mapPointToWorld(x + step * 0.5, y + step * 0.5, { bounds, width, height, scale });
        if (getZoneShapeDistance(world, zone, zone.rx, zone.rz) > 0.98 || isInLandWater(world, zone)) continue;

        const heightValue = clamp(getLandSurfaceHeightAt(zone, world.x, world.z), 0, maxHeight);
        const t = Math.sqrt(heightValue / maxHeight);
        const band = Math.floor(heightValue * 1.4) % 2;
        const red = Math.round(48 + t * 185 + band * 12);
        const green = Math.round(88 + t * 145 + band * 10);
        const blue = Math.round(58 - t * 18);
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.56)`;
        ctx.fillRect(x, y, step + 0.5, step + 0.5);
      }
    }
  });
  ctx.restore();
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

function drawRadarInstrument(canvas, statusElement, playerPosition, radarContacts, landZones, heading, range = 360, options = {}) {
  if (!canvas) return;

  const ctx = prepareInstrumentCanvas(canvas);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!ctx || width < 18 || height < 18) return;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radius = Math.max(1, Math.min(width, height) * 0.46);
  const radarRange = range;
  const ignoreLandShadows = options.ignoreLandShadows === true;
  const scale = radius / radarRange;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(2, 22, 28, 0.86)";
  ctx.fillRect(0, 0, width, height);

  drawRadarRangeRings(ctx, centerX, centerY, radius);
  if (!ignoreLandShadows) {
    landZones.forEach((zone) => drawRadarShadow(ctx, zone, playerPosition, heading, centerX, centerY, radius, radarRange));
  }

  drawRadarLandUnion(ctx, landZones, playerPosition, centerX, centerY, scale, heading, width, height);

  const contacts = radarContacts
    .map((contact) => ({
      ...contact,
      distance: Number.isFinite(contact.distance) ? contact.distance : distance2D(playerPosition, contact.position),
      blocked: ignoreLandShadows || contact.serverVisible ? false : isLineBlockedByLand(playerPosition, contact.position, landZones)
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
  if (width < 1 || height < 1) return null;
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

function mapPointToWorld(x, y, viewport) {
  const { bounds, width, height, scale } = viewport;
  const mapWidth = (bounds.maxX - bounds.minX) * scale;
  const mapHeight = (bounds.maxZ - bounds.minZ) * scale;
  const insetX = (width - mapWidth) * 0.5;
  const insetY = (height - mapHeight) * 0.5;

  return {
    x: bounds.minX + (x - insetX) / scale,
    z: bounds.maxZ - (y - insetY) / scale
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
  const minArea = bigMapEnabled ? 700 : 3300;
  const minWidth = bigMapEnabled ? 12 : 28;
  const minHeight = bigMapEnabled ? 8 : 16;
  if (area < minArea || screenWidth < minWidth || screenHeight < minHeight) return;

  const label = getLandDisplayName(zone);
  const point = worldToMapPoint(zone, bounds, width, height, scale);
  if (point.x < 18 || point.x > width - 18 || point.y < 18 || point.y > height - 40) return;

  ctx.save();
  ctx.font = bigMapEnabled ? "800 13px Inter, sans-serif" : "800 9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = bigMapEnabled ? 4 : 3;
  ctx.strokeStyle = "rgba(5, 27, 40, 0.88)";
  ctx.fillStyle = bigMapEnabled ? "rgba(247, 251, 255, 0.9)" : "rgba(247, 251, 255, 0.76)";
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
    const minArea = bigMapEnabled ? 700 : 3300;
    const minWidth = bigMapEnabled ? 12 : 28;
    const minHeight = bigMapEnabled ? 8 : 16;
    if (area < minArea || screenWidth < minWidth || screenHeight < minHeight) return;

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

function drawMapLandmarkMarkers(ctx, zones, bounds, width, height, scale) {
  const lighthouseLands = chooseNavigationLighthouseLandmasses(zones, 3);
  const lighthouseNames = new Set(lighthouseLands.map((zone) => zone.name));

  lighthouseLands.forEach((zone, index) => {
    const position = getLighthousePosition(zone, index);
    drawMapLightMarker(ctx, position, bounds, width, height, scale, "lighthouse");
    if (debugMapEnabled && !debugMarkerMapEnabled) {
      drawMapLighthouseDebugLabel(ctx, zone, position, bounds, width, height, scale);
    }
  });
  zones
    .filter((zone) => isVolcanicLandmass(zone))
    .filter((zone) => !lighthouseNames.has(zone.name))
    .forEach((zone) => drawMapVolcanoMarker(ctx, { x: zone.x, z: zone.z }, bounds, width, height, scale));
}

function drawMapLighthouseDebugLabel(ctx, zone, position, bounds, width, height, scale) {
  if (!position || position.x < bounds.minX || position.x > bounds.maxX || position.z < bounds.minZ || position.z > bounds.maxZ) return;

  const point = worldToMapPoint(position, bounds, width, height, scale);
  const label = `${zone.name}\n${formatMapSector(position)} ${formatWorldCoordinate(position)}`;
  const lines = label.split("\n");
  const x = clamp(point.x + 10, 48, width - 118);
  const y = clamp(point.y - 18, 16, height - 34);

  ctx.save();
  ctx.font = bigMapEnabled ? "800 11px Inter, sans-serif" : "800 8px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(5, 27, 40, 0.95)";
  ctx.fillStyle = "rgba(255, 250, 214, 0.96)";
  lines.forEach((line, index) => {
    const lineY = y + index * (bigMapEnabled ? 13 : 10);
    ctx.strokeText(line, x, lineY);
    ctx.fillText(line, x, lineY);
  });
  ctx.restore();
}

function drawMapLightMarker(ctx, position, bounds, width, height, scale, kind) {
  if (!position || position.x < bounds.minX || position.x > bounds.maxX || position.z < bounds.minZ || position.z > bounds.maxZ) return;
  const point = worldToMapPoint(position, bounds, width, height, scale);

  ctx.save();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = "rgba(255, 246, 184, 0.92)";
  ctx.fillStyle = "rgba(255, 250, 214, 0.95)";
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMapVolcanoMarker(ctx, position, bounds, width, height, scale) {
  if (!position || position.x < bounds.minX || position.x > bounds.maxX || position.z < bounds.minZ || position.z > bounds.maxZ) return;
  const point = worldToMapPoint(position, bounds, width, height, scale);

  ctx.save();
  ctx.fillStyle = "rgba(238, 87, 55, 0.88)";
  ctx.strokeStyle = "rgba(5, 27, 40, 0.72)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(point.x, point.y - 6);
  ctx.lineTo(point.x + 5, point.y + 4);
  ctx.lineTo(point.x - 5, point.y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMapLandLabelAt(ctx, label, position, bounds, width, height) {
  const point = worldToMapPoint(position, bounds, width, height, Math.min(width / (bounds.maxX - bounds.minX), height / (bounds.maxZ - bounds.minZ)));
  if (point.x < 18 || point.x > width - 18 || point.y < 18 || point.y > height - 40) return;

  ctx.save();
  ctx.font = bigMapEnabled ? "800 13px Inter, sans-serif" : "800 9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = bigMapEnabled ? 4 : 3;
  ctx.strokeStyle = "rgba(5, 27, 40, 0.88)";
  ctx.fillStyle = bigMapEnabled ? "rgba(247, 251, 255, 0.9)" : "rgba(247, 251, 255, 0.76)";
  ctx.strokeText(label, point.x, point.y);
  ctx.fillText(label, point.x, point.y);
  ctx.restore();
}

function getLandDisplayName(zone) {
  return String(zone.name ?? "")
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

  const points = getCoastContourPoints(zone, 80, "radar").map((point) => worldToRadarPoint(point, playerPosition, centerX, centerY, scale, heading));
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
    const points = getCoastContourPoints(zone, 80, "radar").map((point) => worldToRadarPoint(point, playerPosition, centerX, centerY, scale, heading));
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

function getCoastContourPoints(zone, samples, boundary = "visual") {
  const points = [];
  const boundaryDistance = getZoneBoundaryDistance(zone, boundary);

  for (let i = 0; i < samples; i += 1) {
    const angle = (i / samples) * Math.PI * 2;
    const factor = getCoastRadiusFactor(angle, zone);
    points.push({
      x: zone.x + Math.cos(angle) * getZoneVisualRx(zone) * boundaryDistance * factor,
      z: zone.z + Math.sin(angle) * getZoneVisualRz(zone) * boundaryDistance * factor
    });
  }

  return points;
}

function drawInstrumentMarker(ctx, x, y, color, radius) {
  if (!Number.isFinite(radius) || radius <= 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawMapShipMarker(ctx, x, y, color, markerHeading, size = 7) {
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

function drawMapShipLabel(ctx, label, x, y, color) {
  ctx.save();
  ctx.font = "800 8px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(2, 16, 21, 0.88)";
  ctx.fillStyle = color;
  ctx.strokeText(label, x, y);
  ctx.fillText(label, x, y);
  ctx.restore();
}

function mapShipColor(ship) {
  if (ship.controlledBy === playerId) return "#f7fbff";
  if (ship.teamId === playerTeamId) return "#7fd7ff";
  return "#ff6b4a";
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
  const labelRadius = Math.max(1, radius * 0.86);

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
  if (!Number.isFinite(radius) || radius <= 0) return;
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
  if (!Number.isFinite(radius) || radius <= 0) return;

  const dx = zone.x - playerPosition.x;
  const dz = zone.z - playerPosition.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const centerAngle = Math.atan2(dx, dz) - heading;
  let halfAngle = 0;
  let shadowStartDistance = Number.POSITIVE_INFINITY;

  for (const point of getCoastContourPoints(zone, 40, "radar")) {
    const pointDx = point.x - playerPosition.x;
    const pointDz = point.z - playerPosition.z;
    const pointDistance = Math.sqrt(pointDx * pointDx + pointDz * pointDz);
    const pointAngle = Math.atan2(pointDx, pointDz) - heading;
    halfAngle = Math.max(halfAngle, Math.abs(normalizeAngle(pointAngle - centerAngle)));
    shadowStartDistance = Math.min(shadowStartDistance, pointDistance);
  }

  if (distance < 1 || shadowStartDistance <= 0 || shadowStartDistance > radarRange || halfAngle <= 0.01) return;

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
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length <= 0.001) return false;

  const samples = Math.max(1, Math.ceil(length / 8));
  for (let i = 1; i < samples; i += 1) {
    const t = i / samples;
    const sample = new Vector3(from.x + dx * t, 0, from.z + dz * t);
    if (isRadarBlockedAt(sample, landZones)) {
      return true;
    }
  }
  return false;
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
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
  return getZoneVisualRx(zone) * getZoneBoundaryDistance(zone, "radar");
}

function getZoneRadarRz(zone) {
  return getZoneVisualRz(zone) * getZoneBoundaryDistance(zone, "radar");
}

function getZoneBoundaryDistance(zone, boundary) {
  if (boundary === "radar") {
    if (zone.kind === "coastline") return 0.86;
    return isSteepRockZone(zone) ? 1 : 0.92;
  }
  if (boundary === "navigation") {
    if (zone.kind === "coastline") return 1.06;
    return isSteepRockZone(zone) ? 1 : 1.02;
  }
  return 1;
}

function isSteepRockZone(zone) {
  const name = String(zone.name ?? "");
  return zone.kind === "island" && (
    name.includes("rock") ||
    name.includes("rocks") ||
    name.includes("stack") ||
    name.includes("needle") ||
    name.includes("skerry") ||
    name.includes("skerries")
  );
}

function createShipDesignation(ship) {
  const controlledBy = ship?.controlledBy ?? "bot";
  if (controlledBy && controlledBy !== "bot") {
    return getPlayerInitials(controlledBy);
  }
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

function updateScoutPlaneFlakDemo(motions, now) {
  if (!scoutPlaneMode || !scoutPlaneExperimentFlakDemo || playerDamageState !== "active") return;
  if (now < (flakSystem.nextDemoFireTime ?? 0)) return;

  const flakMotions = motions
    .filter((motion) => motion.boat?.sternFlak?.elevationRoot)
    .sort((a, b) => distance2D(a.root.position, boat.root.position) - distance2D(b.root.position, boat.root.position));
  if (!flakMotions.length) return;

  const motion = flakMotions[flakSystem.nextDemoMotionIndex % flakMotions.length];
  flakSystem.nextDemoMotionIndex = (flakSystem.nextDemoMotionIndex + 1) % flakMotions.length;

  const target = boat.root.position
    .add(getForwardVector(heading).scale(Math.max(0, speed) * 0.25))
    .add(new Vector3(0, 0.7, 0));
  aimDemoFlakAtTarget(motion.boat, target);

  const shot = getFlakShotFromElevationRoot(motion.boat.sternFlak?.elevationRoot, 0.75, target, getForwardVector(motion.heading).scale(motion.speed ?? 0));
  if (!shot) return;

  flakSystem.nextDemoFireTime = now + flakDemoFireIntervalSeconds;
  createFlakProjectile(flakSystem, shot.position, shot.velocity, shot.direction);
  createFlakMuzzleFlash(flakSystem, shot.position, shot.direction);
  document.body.dataset.flakDemoFire = "ok";
  document.body.dataset.flakDemoBoats = String(flakMotions.length);
}

function createStaticFlakDemoFleet(scene, materials, parent, playerPosition, playerHeading) {
  const forward = getForwardVector(playerHeading);
  const right = getRightVector(playerHeading);
  const placements = [
    { f: 145, r: -70 },
    { f: 165, r: 55 },
    { f: 230, r: -10 },
    { f: 105, r: 95 }
  ];

  return placements.map((placement, index) => {
    const demoBoat = createEnemyTorpedoBoat(scene, materials, `flak_demo_boat_${index + 1}`, "dark", `F${index + 1}`, true);
    demoBoat.root.parent = parent;
    demoBoat.root.position = playerPosition
      .add(forward.scale(placement.f))
      .add(right.scale(placement.r));
    demoBoat.root.position.y = remoteVehicleY({ vehicleType: "torpedo-boat" });
    const demoHeading = Math.atan2(playerPosition.x - demoBoat.root.position.x, playerPosition.z - demoBoat.root.position.z);
    demoBoat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, demoHeading, 0);
    return {
      id: `flak-demo-${index + 1}`,
      numericIndex: index + 1,
      teamId: "demo",
      controlledBy: "flak-demo",
      vehicleType: "torpedo-boat",
      serverState: "active",
      root: demoBoat.root,
      boat: demoBoat,
      heading: demoHeading,
      speed: 0,
      state: "active"
    };
  });
}

function aimDemoFlakAtTarget(demoBoat, target) {
  const mount = demoBoat.sternFlak?.mount;
  const elevationRoot = demoBoat.sternFlak?.elevationRoot;
  if (!mount || !elevationRoot || !mount.parent) return;

  const parentMatrix = mount.parent.computeWorldMatrix(true).clone();
  parentMatrix.invert();
  const localTarget = Vector3.TransformCoordinates(target, parentMatrix).subtract(mount.position);
  const yaw = Math.atan2(localTarget.x, localTarget.z);
  const horizontalDistance = Math.hypot(localTarget.x, localTarget.z);
  const pitch = clamp(Math.atan2(localTarget.y - elevationRoot.position.y, horizontalDistance), flakMinPitch, flakMaxPitch);
  mount.rotation.y = yaw;
  elevationRoot.rotation.x = -pitch;
}

function createEnemyFleet(scene, materials, serverShips) {
  return serverShips.map((ship, index) => {
    const enemyBoat = createRemoteVehicleModel(scene, materials, `server_ship_${ship.id}`, ship);
    const heading = Number.isFinite(ship.heading) ? ship.heading : 0;
    const engineOrder = Number.isInteger(ship.engineOrder) ? ship.engineOrder : 2;
    enemyBoat.root.position = new Vector3(ship.x, remoteVehicleY(ship), ship.z);
    enemyBoat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
    enemyBoat.root.metadata = {
      serverShipId: ship.id,
      teamId: ship.teamId,
      controlledBy: ship.controlledBy,
      vehicleType: getShipVehicleType(ship)
    };
    return createEnemyMotion(enemyBoat, heading, engineOrder, index, ship);
  });
}

function createRemoteVehicleModel(scene, materials, name, ship) {
  return isScoutPlaneShip(ship)
    ? createScoutPlane(scene, materials, name, ship.teamId, false)
    : createEnemyTorpedoBoat(
      scene,
      materials,
      name,
      ship.teamId,
      createShipDesignation(ship),
      scoutPlaneExperimentShowAllFlak || isHumanController(ship?.controlledBy)
    );
}

function getShipVehicleType(ship) {
  return ship?.vehicleType === "scout-plane" ? "scout-plane" : "torpedo-boat";
}

function isScoutPlaneShip(ship) {
  return getShipVehicleType(ship) === "scout-plane";
}

function isScoutPlaneMotion(motion) {
  return motion?.vehicleType === "scout-plane";
}

function remoteVehicleY(ship) {
  if (!isScoutPlaneShip(ship)) return 0.26;
  return Number.isFinite(ship?.y) ? ship.y : scoutPlaneCruiseAltitude;
}

function createEnemyMotion(vehicle, heading, engineOrder, index = 0, serverShip = null) {
  const root = vehicle.root;
  return {
    id: serverShip?.id ?? `local-${index + 1}`,
    numericIndex: index + 1,
    teamId: serverShip?.teamId ?? "unknown",
    controlledBy: serverShip?.controlledBy ?? "local",
    vehicleType: getShipVehicleType(serverShip),
    serverState: serverShip?.state ?? "active",
    root,
    bowWake: vehicle.bowWake,
    propellerRoot: vehicle.propellerRoot,
    shadow: vehicle.shadow,
    heading,
    speed: serverShip?.speed ?? 0,
    isServerControlled: Boolean(serverShip),
    boat: vehicle,
    serverPosition: new Vector3(serverShip?.x ?? root.position.x, remoteVehicleY(serverShip), serverShip?.z ?? root.position.z),
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
  motion.root.position.y = torpedoBoatWaterlineY + Math.sin(time * 1.6 + 1.9) * enemyTorpedoBoatBobAmplitude;
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
  motion.root.position.y += (motion.serverPosition.y - motion.root.position.y) * Math.min(1, dt * 2.6);
  motion.root.position.z += (projectedServerPosition.z - motion.root.position.z) * Math.min(1, dt * correctionStrength);
  if (isScoutPlaneMotion(motion)) {
    motion.root.position.y += Math.sin(time * 0.85 + motion.numericIndex) * 0.018;
    motion.root.rotationQuaternion = Quaternion.FromEulerAngles(
      Math.sin(time * 0.7 + motion.numericIndex) * 0.025,
      motion.heading,
      -motion.turnVelocity * 0.55 + Math.sin(time * 0.9 + motion.numericIndex) * 0.045
    );
    updateScoutPlaneVisual(motion, Math.max(6, Math.abs(motion.speed)), time);
  } else {
    motion.root.position.y = torpedoBoatWaterlineY + Math.sin(time * 1.6 + 1.9) * enemyTorpedoBoatBobAmplitude;
    motion.root.rotationQuaternion = Quaternion.FromEulerAngles(
      Math.sin(time * 1.9 + 0.8) * 0.015,
      motion.heading,
      Math.sin(time * 1.4) * 0.01
    );
    updateEnemyBowWake(motion.bowWake, motion.speed, time);
  }

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
  return getSnapshotRadarContacts();
}

function getSnapshotRadarContacts() {
  const contacts = [];
  for (const ship of serverShipsById.values()) {
    if (!ship || ship.state !== "active") continue;
    if (ship.id === playerServerShipId || ship.id === pendingPlayerServerShip?.id) continue;
    if (!Number.isFinite(ship.x) || !Number.isFinite(ship.z)) continue;
    contacts.push({
      id: `radar-${ship.id}`,
      shipId: ship.id,
      team: ship.teamId === playerTeamId ? "light" : "dark",
      teamId: ship.teamId,
      controlledBy: ship.controlledBy ?? "bot",
      label: createRadarContactLabel(ship),
      position: new Vector3(ship.x, 0.28, ship.z),
      heading: Number.isFinite(ship.heading) ? ship.heading : 0,
      serverVisible: false
    });
  }
  document.body.dataset.radarStateSync = "client-snapshot";
  document.body.dataset.radarContacts = String(contacts.length);
  return contacts;
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
    segment.position.y = enemyBowWakeSurfaceY + Math.sin(time * 2.8 + index) * 0.005;
  });

  wake.churn.forEach((patch, index) => {
    const pulse = 0.75 + Math.sin(time * 4.1 + index * 1.7) * 0.16;
    patch.scaling.x = (0.65 + strength * 1.05) * pulse;
    patch.scaling.z = 0.55 + strength * 1.2;
    patch.position.y = enemyBowWakeSurfaceY + Math.sin(time * 3.6 + index) * 0.006;
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

function createBombSystem(scene, materials, parent) {
  const root = new TransformNode("bombs", scene);
  root.parent = parent;
  const sightMarker = createBombSightMarker(scene, materials, root);

  return {
    root,
    scene,
    materials,
    sightMarker,
    serverVisuals: new Map(),
    serverImpactIds: new Set(),
    hits: 0
  };
}

function createBombSightMarker(scene, materials, parent) {
  const root = new TransformNode("bomb_sight_marker", scene);
  root.parent = parent;
  root.setEnabled(false);

  const lineParts = [];
  ["upper", "lower"].forEach((part) => {
    const line = MeshBuilder.CreateBox(`bomb_sight_marker_center_${part}`, {
      width: 0.13,
      height: 0.045,
      depth: 1
    }, scene);
    line.parent = root;
    line.material = materials.beaconGlow;
    lineParts.push({ mesh: line, part });
  });

  const impactTicks = [];
  for (let index = 0; index < bombsPerDrop; index += 1) {
    const tick = MeshBuilder.CreateBox(`bomb_sight_marker_tick_${index}`, {
      width: 0.95,
      height: 0.05,
      depth: 0.09
    }, scene);
    tick.parent = root;
    tick.position.x = -1.35;
    tick.material = materials.beaconGlow;
    impactTicks.push({ mesh: tick, index });
  }

  root.metadata = {
    lineParts,
    impactTicks
  };

  return root;
}

function createFlakSystem(scene, materials, parent) {
  const root = new TransformNode("flak_projectiles", scene);
  root.parent = parent;

  return {
    root,
    scene,
    materials,
    active: [],
    flashes: [],
    serverVisuals: new Map(),
    nextFireTime: 0,
    nextDemoMotionIndex: 0,
    nextId: 1
  };
}

function firePlayerFlak() {
  if (!flakViewActive || playerDamageState !== "active" || time < flakSystem.nextFireTime) return;
  const shot = getPlayerFlakShot();
  if (!shot) return;

  flakSystem.nextFireTime = time + flakFireCooldownSeconds;
  createFlakProjectile(flakSystem, shot.position, shot.velocity, shot.direction);
  createFlakMuzzleFlash(flakSystem, shot.position, shot.direction);
  reportPlayerFlakShot(shot);
  document.body.dataset.flakFire = "ok";
  document.body.dataset.flakShots = String(flakSystem.nextId - 1);
}

async function reportPlayerFlakShot(shot) {
  if (!playerServerShipId || !playerId || !playerTeamId || !shot) return;
  try {
    const response = await fetch(getFireFlakEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        teamId: playerTeamId,
        shipId: playerServerShipId,
        x: shot.position.x,
        y: shot.position.y,
        z: shot.position.z,
        vx: shot.velocity.x,
        vy: shot.velocity.y,
        vz: shot.velocity.z
      })
    });
    if (response.status === 403) {
      expireActiveLogin("fire-flak-403");
      return;
    }
    document.body.dataset.flakFireSync = response.ok ? "ok" : `http-${response.status}`;
  } catch (error) {
    document.body.dataset.flakFireSync = "error";
    document.body.dataset.flakFireSyncError = error.message;
  }
}

function getPlayerFlakShot() {
  return getFlakShotFromElevationRoot(
    boat.sternFlak?.elevationRoot,
    playerSternFlakScale,
    null,
    getForwardVector(heading).scale(speed)
  );
}

function getFlakShotFromElevationRoot(elevationRoot, scale, target, baseVelocity) {
  if (!elevationRoot) return null;

  const worldMatrix = elevationRoot.computeWorldMatrix(true);
  const muzzleZ = (flakBarrelCenterZ + flakBarrelLength * 0.5) * scale;
  const barrelY = 0;
  const muzzle = Vector3.TransformCoordinates(new Vector3(0, barrelY, muzzleZ), worldMatrix);
  const aimTarget = target ?? Vector3.TransformCoordinates(new Vector3(0, barrelY, 14), worldMatrix);
  const direction = aimTarget.subtract(muzzle).normalize();

  return {
    position: muzzle.add(direction.scale(0.08)),
    muzzle,
    direction,
    velocity: direction.scale(flakProjectileSpeed).add(baseVelocity ?? Vector3.Zero())
  };
}

function createFlakProjectile(system, position, velocity, direction) {
  const id = system.nextId;
  system.nextId += 1;

  const root = new TransformNode(`flak_shell_${id}`, system.scene);
  root.parent = system.root;
  root.position.copyFrom(position);

  const core = MeshBuilder.CreateSphere(`${root.name}_core`, {
    diameter: 0.13,
    segments: 10
  }, system.scene);
  core.parent = root;
  core.material = system.materials.flakTracer;

  const trail = [];
  for (let i = 0; i < 6; i += 1) {
    const segment = MeshBuilder.CreateBox(`${root.name}_trail_${i}`, {
      width: 0.055 + i * 0.007,
      height: 0.055 + i * 0.006,
      depth: 0.5 + i * 0.14
    }, system.scene);
    segment.parent = system.root;
    segment.material = system.materials.flakTracerTrail;
    segment.position.copyFrom(position.add(direction.scale(-0.1 - i * 0.22)));
    trail.push(segment);
  }

  const light = new PointLight(`${root.name}_light`, position, system.scene);
  light.diffuse = new Color3(0.96, 0.98, 1.0);
  light.specular = new Color3(0.9, 0.96, 1.0);
  light.intensity = 0.95;
  light.range = 24;

  system.active.push({
    root,
    core,
    trail,
    light,
    position: position.clone(),
    previousPosition: position.subtract(direction.scale(0.55)),
    velocity,
    age: 0,
    lifetime: flakProjectileLifetime,
    direction: direction.clone(),
    samplePositions: Array.from({ length: 6 }, (_, index) => position.add(direction.scale(-0.12 - index * 0.24)))
  });
  return system.active[system.active.length - 1];
}

function createFlakMuzzleFlash(system, position, direction) {
  const flash = MeshBuilder.CreateSphere(`flak_muzzle_flash_${system.nextId}`, {
    diameter: 0.14,
    segments: 10
  }, system.scene);
  flash.parent = system.root;
  flash.material = system.materials.flakFlash;
  flash.position.copyFrom(position.add(direction.scale(0.08)));

  const light = new PointLight(`${flash.name}_light`, flash.position.clone(), system.scene);
  light.diffuse = new Color3(1.0, 0.76, 0.42);
  light.specular = new Color3(1.0, 0.78, 0.5);
  light.intensity = 0.85;
  light.range = 14;

  system.flashes.push({
    mesh: flash,
    light,
    origin: flash.position.clone(),
    age: 0,
    lifetime: 0.12,
    direction: direction.clone()
  });
}

function updateFlakSystem(system, dt, now) {
  system.active = system.active.filter((projectile) => {
    projectile.age += dt;
    if (projectile.age >= projectile.lifetime) {
      disposeFlakProjectile(projectile);
      return false;
    }

    projectile.previousPosition.copyFrom(projectile.position);
    projectile.velocity.y -= flakProjectileGravity * dt;
    projectile.position.addInPlace(projectile.velocity.scale(dt));
    projectile.root.position.copyFrom(projectile.position);
    projectile.direction = projectile.position.subtract(projectile.previousPosition).normalize();

    const pulse = 0.72 + Math.sin(now * 80 + projectile.age * 13) * 0.18;
    projectile.core.visibility = pulse;
    projectile.samplePositions.unshift(projectile.position.clone());
    projectile.samplePositions = projectile.samplePositions.slice(0, projectile.trail.length + 1);
    projectile.trail.forEach((segment, index) => {
      const start = projectile.samplePositions[index + 1] ?? projectile.previousPosition;
      const end = projectile.samplePositions[index] ?? projectile.position;
      const midpoint = Vector3.Center(start, end);
      const segmentDirection = end.subtract(start);
      const segmentLength = Math.max(0.08, segmentDirection.length());
      segment.position.copyFrom(midpoint);
      segment.scaling.y = segmentLength / (0.42 + index * 0.12);
      segment.rotationQuaternion = Quaternion.FromLookDirectionLH(segmentDirection.normalize(), Vector3.Up());
      segment.visibility = Math.max(0.18, pulse - index * 0.11);
    });
    projectile.light.position.copyFrom(projectile.position);
    projectile.light.intensity = 0.45 + pulse * 0.45;
    return true;
  });
  system.serverVisuals.forEach((projectile, id) => {
    if (projectile.disposed) {
      system.serverVisuals.delete(id);
    }
  });

  system.flashes = system.flashes.filter((flash) => {
    flash.age += dt;
    const t = flash.age / flash.lifetime;
    if (t >= 1) {
      flash.light.dispose();
      flash.mesh.dispose();
      return false;
    }
    const fade = 1 - t;
    flash.mesh.visibility = fade;
    flash.mesh.scaling.setAll(1 + t * 1.6);
    flash.mesh.position.copyFrom(flash.origin.add(flash.direction.scale(t * 0.35)));
    flash.light.position.copyFrom(flash.mesh.position);
    flash.light.intensity = 0.85 * fade;
    return true;
  });

  document.body.dataset.flakProjectiles = String(system.active.length);
}

function disposeFlakProjectile(projectile) {
  projectile.disposed = true;
  projectile.light.dispose();
  projectile.trail.forEach((segment) => segment.dispose());
  projectile.root.getChildMeshes().forEach((mesh) => mesh.dispose());
  projectile.root.dispose();
}

function syncServerFlakProjectiles(projectiles, snapshotClientTime = time) {
  const activeIds = new Set();
  projectiles
    .filter((snapshot) => snapshot.shipId !== playerServerShipId)
    .forEach((snapshot) => {
      activeIds.add(snapshot.id);
      const visual = flakSystem.serverVisuals.get(snapshot.id) ?? createServerFlakProjectile(flakSystem, snapshot, snapshotClientTime);
      applyServerFlakProjectileSnapshot(visual, snapshot, snapshotClientTime);
    });

  flakSystem.serverVisuals.forEach((visual, id) => {
    if (!activeIds.has(id)) {
      disposeFlakProjectile(visual);
      flakSystem.serverVisuals.delete(id);
    }
  });
}

function createServerFlakProjectile(system, snapshot, snapshotClientTime = time) {
  const position = new Vector3(
    Number.isFinite(snapshot.x) ? snapshot.x : 0,
    Number.isFinite(snapshot.y) ? snapshot.y : 0,
    Number.isFinite(snapshot.z) ? snapshot.z : 0
  );
  const velocity = new Vector3(
    Number.isFinite(snapshot.vx) ? snapshot.vx : 0,
    Number.isFinite(snapshot.vy) ? snapshot.vy : 0,
    Number.isFinite(snapshot.vz) ? snapshot.vz : 1
  );
  const direction = velocity.lengthSquared() > 0.0001 ? velocity.normalizeToNew() : Vector3.Forward();
  const visual = createFlakProjectile(system, position, velocity, direction);
  visual.serverId = snapshot.id;
  visual.age = Math.max(0, snapshotClientTime - (Number.isFinite(snapshot.firedAt) ? snapshot.firedAt : snapshotClientTime));
  system.serverVisuals.set(snapshot.id, visual);
  return visual;
}

function applyServerFlakProjectileSnapshot(visual, snapshot, snapshotClientTime = time) {
  if (!visual || visual.disposed) return;
  visual.position.set(
    Number.isFinite(snapshot.x) ? snapshot.x : visual.position.x,
    Number.isFinite(snapshot.y) ? snapshot.y : visual.position.y,
    Number.isFinite(snapshot.z) ? snapshot.z : visual.position.z
  );
  visual.previousPosition.copyFrom(visual.position);
  visual.velocity.set(
    Number.isFinite(snapshot.vx) ? snapshot.vx : visual.velocity.x,
    Number.isFinite(snapshot.vy) ? snapshot.vy : visual.velocity.y,
    Number.isFinite(snapshot.vz) ? snapshot.vz : visual.velocity.z
  );
  if (visual.velocity.lengthSquared() > 0.0001) {
    visual.direction = visual.velocity.normalizeToNew();
  }
  visual.age = Math.max(0, snapshotClientTime - (Number.isFinite(snapshot.firedAt) ? snapshot.firedAt : snapshotClientTime));
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
  if (scoutPlaneMode) return;
  enemyMotions.forEach((motion) => {
    if (motion.state !== "active") return;
    if (motion.isServerControlled) return;
    if (isScoutPlaneMotion(motion)) return;
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

function syncServerTorpedoes(torpedoes, impacts = [], snapshotClientTime = time) {
  const activeIds = new Set();

  torpedoes.forEach((snapshot) => {
    activeIds.add(snapshot.id);
    const visual = torpedoSystem.serverVisuals.get(snapshot.id) ?? createServerTorpedoVisual(torpedoSystem, snapshot, snapshotClientTime);
    applyServerTorpedoSnapshot(visual, snapshot, snapshotClientTime);
  });

  renderServerTorpedoImpacts(impacts);

  torpedoSystem.serverVisuals.forEach((visual, id) => {
    if (activeIds.has(id)) return;

    disposeServerTorpedoVisual(visual);
    torpedoSystem.serverVisuals.delete(id);
  });
  document.body.dataset.serverTorpedoVisuals = String(torpedoSystem.serverVisuals.size);
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

function createServerTorpedoVisual(system, snapshot, snapshotClientTime = time) {
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
    serverSnapshotTime: snapshotClientTime,
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
  const serverPosition = new Vector3(snapshot.x, 0.05, snapshot.z);
  const isOwnTorpedo = snapshot.shipId && snapshot.shipId === playerServerShipId;

  if (isOwnTorpedo && boat?.root?.position && distance2D(boat.root.position, serverPosition) < 35) {
    const tubeSide = system.nextTube === 0 ? -1 : 1;
    system.nextTube = 1 - system.nextTube;

    const launchHeading = Number.isFinite(heading) ? heading : 0;
    const forward = getForwardVector(launchHeading);
    const right = getRightVector(launchHeading);
    const tuning = torpedoLaunchDefaults;
    const tubeX = tubeSide * tuning.tubeX;
    const muzzleEffectX = tubeSide * 0.32;
    const tubeStartZ = tuning.startZ;
    const muzzleZ = 3.05;
    const start = boat.root.position
      .add(right.scale(tubeX))
      .add(forward.scale(tubeStartZ))
      .add(new Vector3(0, tuning.startY, 0));
    const puffPosition = boat.root.position
      .add(right.scale(muzzleEffectX))
      .add(forward.scale(muzzleZ + 0.4))
      .add(new Vector3(0, -0.04, 0));
    const muzzlePosition = boat.root.position
      .add(right.scale(muzzleEffectX))
      .add(forward.scale(tubeStartZ))
      .add(new Vector3(0, tuning.startY, 0));

    document.body.dataset.ownServerTorpedoLaunch = "local";
    return {
      heading: launchHeading,
      start,
      puffPosition,
      muzzlePosition,
      tubeSide,
      blendUntil: time + 0.35,
      showMuzzleEffect: true
    };
  }

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

function applyServerTorpedoSnapshot(visual, snapshot, snapshotClientTime = time) {
  visual.serverPosition = new Vector3(snapshot.x, 0.05, snapshot.z);
  visual.serverSnapshotTime = snapshotClientTime;
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
    visual.root.position.y = 0.05;
    visual.root.rotationQuaternion = Quaternion.FromEulerAngles(0, visual.heading, 0);
    visual.runDistance += step;
    updateTorpedoWake(visual, true, now);
  });
}

function syncServerBombs(bombs, impacts = [], snapshotClientTime = time) {
  const activeIds = new Set();

  bombs.forEach((snapshot) => {
    activeIds.add(snapshot.id);
    const visual = bombSystem.serverVisuals.get(snapshot.id) ?? createServerBombVisual(bombSystem, snapshot, snapshotClientTime);
    applyServerBombSnapshot(visual, snapshot, snapshotClientTime);
  });

  renderServerBombImpacts(impacts);

  bombSystem.serverVisuals.forEach((visual, id) => {
    if (activeIds.has(id)) return;

    disposeServerBombVisual(visual);
    bombSystem.serverVisuals.delete(id);
  });
  document.body.dataset.serverBombVisuals = String(bombSystem.serverVisuals.size);
}

function createServerBombVisual(system, snapshot, snapshotClientTime = time) {
  const root = new TransformNode(`server_bomb_${snapshot.id}`, system.scene);
  root.parent = system.root;
  root.position = new Vector3(
    Number.isFinite(snapshot.x) ? snapshot.x : 0,
    Number.isFinite(snapshot.y) ? snapshot.y : 0,
    Number.isFinite(snapshot.z) ? snapshot.z : 0
  );
  root.rotationQuaternion = Quaternion.FromEulerAngles(Math.PI / 2, Number.isFinite(snapshot.heading) ? snapshot.heading : 0, 0);

  const body = MeshBuilder.CreateCylinder(`${root.name}_body`, {
    diameter: 0.3,
    height: 1.15,
    tessellation: 12
  }, system.scene);
  body.parent = root;
  body.rotation.x = Math.PI / 2;
  body.material = system.materials.funnel;

  const nose = MeshBuilder.CreateCylinder(`${root.name}_nose`, {
    diameterTop: 0,
    diameterBottom: 0.3,
    height: 0.3,
    tessellation: 12
  }, system.scene);
  nose.parent = root;
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.72;
  nose.material = system.materials.funnel;

  const fin = MeshBuilder.CreateBox(`${root.name}_fin`, { width: 0.5, height: 0.07, depth: 0.19 }, system.scene);
  fin.parent = root;
  fin.position.z = -0.62;
  fin.material = system.materials.funnel;

  const visual = {
    id: snapshot.id,
    root,
    body,
    nose,
    fin,
    heading: Number.isFinite(snapshot.heading) ? snapshot.heading : 0,
    speed: Number.isFinite(snapshot.speed) ? snapshot.speed : 0,
    verticalSpeed: 0,
    serverPosition: root.position.clone(),
    serverSnapshotTime: snapshotClientTime
  };
  system.serverVisuals.set(snapshot.id, visual);
  return visual;
}

function applyServerBombSnapshot(visual, snapshot, snapshotClientTime = time) {
  const previousPosition = visual.serverPosition;
  const previousSnapshotTime = visual.serverSnapshotTime ?? snapshotClientTime;
  const nextServerPosition = new Vector3(
    Number.isFinite(snapshot.x) ? snapshot.x : visual.serverPosition.x,
    Number.isFinite(snapshot.y) ? snapshot.y : visual.serverPosition.y,
    Number.isFinite(snapshot.z) ? snapshot.z : visual.serverPosition.z
  );
  const snapshotDelta = snapshotClientTime - previousSnapshotTime;
  if (snapshotDelta > 0.001 && previousPosition && Number.isFinite(nextServerPosition.y) && Number.isFinite(previousPosition.y)) {
    const measuredVerticalSpeed = (nextServerPosition.y - previousPosition.y) / snapshotDelta;
    if (Number.isFinite(measuredVerticalSpeed)) {
      visual.verticalSpeed = Number.isFinite(visual.verticalSpeed)
        ? visual.verticalSpeed + (measuredVerticalSpeed - visual.verticalSpeed) * 0.45
        : measuredVerticalSpeed;
    }
  }
  visual.serverPosition = nextServerPosition;
  visual.serverSnapshotTime = snapshotClientTime;
  visual.heading = Number.isFinite(snapshot.heading) ? snapshot.heading : visual.heading;
  visual.speed = Number.isFinite(snapshot.speed) ? snapshot.speed : visual.speed;
  if (!visual.root.rotationQuaternion) {
    visual.root.rotationQuaternion = Quaternion.FromEulerAngles(Math.PI / 2, visual.heading, 0);
  }
}

function updateServerBombVisuals(system, dt, now) {
  system.serverVisuals.forEach((visual) => {
    const forward = getForwardVector(visual.heading);
    const snapshotAge = Math.max(0, now - (visual.serverSnapshotTime ?? now));
    const projected = visual.serverPosition.add(forward.scale(visual.speed * snapshotAge));
    const projectedY = visual.serverPosition.y + (Number.isFinite(visual.verticalSpeed) ? visual.verticalSpeed * snapshotAge : 0);

    visual.root.position.addInPlace(forward.scale(visual.speed * dt));
    if (Number.isFinite(visual.verticalSpeed)) {
      visual.root.position.y += visual.verticalSpeed * dt;
    }
    visual.root.position.x += (projected.x - visual.root.position.x) * Math.min(1, dt * 4.5);
    visual.root.position.y += (projectedY - visual.root.position.y) * Math.min(1, dt * 2);
    visual.root.position.z += (projected.z - visual.root.position.z) * Math.min(1, dt * 4.5);
    visual.root.position.y = Math.max(0, visual.root.position.y);
    visual.root.rotationQuaternion = Quaternion.FromEulerAngles(Math.PI / 2, visual.heading, 0);
  });
}

function updateBombSightMarker(system, forward) {
  if (!system.sightMarker) return;
  if (!scoutPlaneMode || !bombBayViewActive || playerDamageState !== "active") {
    system.sightMarker.setEnabled(false);
    document.body.dataset.bombSight = "off";
    return;
  }

  const dropAltitude = clamp(boat.root.position.y, 1, 120);
  const fallSeconds = Math.sqrt((2 * dropAltitude) / bombGravity);
  const horizontalSpeed = clamp(speed * 0.92, 4, 22);
  const lead = bombDropForwardOffset + horizontalSpeed * fallSeconds;
  const impactSpacing = horizontalSpeed * bombReleaseIntervalSeconds;
  const patternLength = impactSpacing * (bombsPerDrop - 1);
  const impact = boat.root.position.add(forward.scale(lead));
  system.sightMarker.position.set(impact.x, 0.2, impact.z);
  system.sightMarker.rotation.y = heading;
  updateBombSightPattern(system.sightMarker, patternLength, impactSpacing);
  system.sightMarker.setEnabled(true);
  document.body.dataset.bombSight = `${impact.x.toFixed(1)},${impact.z.toFixed(1)}`;
}

function updateBombSightPattern(marker, patternLength, impactSpacing) {
  const parts = marker.metadata ?? {};
  const visualLength = Math.max(4.2, patternLength * 0.72);
  const gap = Math.max(2.1, Math.min(5.2, patternLength * 0.36));
  const lowerCenter = -gap * 0.5 - visualLength * 0.5;
  const upperCenter = patternLength + gap * 0.5 + visualLength * 0.5;
  (parts.lineParts ?? []).forEach(({ mesh, part }) => {
    mesh.scaling.z = visualLength;
    mesh.position.x = 0;
    mesh.position.z = part === "upper" ? upperCenter : lowerCenter;
  });
  (parts.impactTicks ?? []).forEach(({ mesh, index }) => {
    mesh.position.x = -1.35;
    mesh.position.z = index * impactSpacing;
  });
}

function renderServerBombImpacts(impacts) {
  impacts.forEach((impact) => {
    const key = `${impact.id}:${impact.reason}:${impact.t}`;
    if (bombSystem.serverImpactIds.has(key)) return;
    bombSystem.serverImpactIds.add(key);

    const position = new Vector3(
      Number.isFinite(impact.x) ? impact.x : 0,
      0.05,
      Number.isFinite(impact.z) ? impact.z : 0
    );
    bombSystem.hits += 1;
    torpedoSystem.hits += 1;
    createHitChurn(torpedoSystem, position, heading);
  });

  if (bombSystem.serverImpactIds.size > 120) {
    bombSystem.serverImpactIds = new Set(Array.from(bombSystem.serverImpactIds).slice(-80));
  }
}

function disposeServerBombVisual(visual) {
  visual.root.getChildMeshes().forEach((mesh) => mesh.dispose());
  visual.root.dispose();
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
    if (effect.coreFlash && effect.mesh) {
      const pulse = Math.sin(Math.PI * t);
      effect.mesh.visibility = effect.alpha * pulse * (1 - t * 0.12);
      effect.mesh.position.copyFrom(effect.origin);
      effect.mesh.scaling.x = effect.baseScale.x * (1 + eased * effect.grow.x);
      effect.mesh.scaling.y = effect.baseScale.y * (1 + eased * effect.grow.y);
      effect.mesh.scaling.z = effect.baseScale.z * (1 + eased * effect.grow.z);
      effect.mesh.setEnabled(t < 0.96);
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
    torpedo.root.position.y = 0.05;
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

    const normalizedDistance = getZoneShapeDistance(torpedoPosition, zone, zone.rx, zone.rz);
    const navigationBoundary = getZoneBlockDistance(zone, "navigation");

    if (normalizedDistance <= navigationBoundary) {
      return {
        zone: zone.name,
        kind: zone.kind,
        normalizedDistance: Number(normalizedDistance.toFixed(3)),
        navigationBoundary: Number(navigationBoundary.toFixed(3)),
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
  if (scoutPlaneMode) return null;
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
    if (isScoutPlaneMotion(enemyMotion)) continue;
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
    !isScoutPlaneMotion(enemyMotion) &&
    pointHitsEnemyHull(torpedoPosition, enemyMotion, 0.22)
  )) ?? null;
}

function torpedoHitsPlayer(torpedoPosition, playerPosition) {
  if (scoutPlaneMode) return false;
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
  createExplosionCoreFlash(system, position);

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

function createExplosionCoreFlash(system, position) {
  const core = MeshBuilder.CreateSphere(`torpedo_hit_core_${system.hits}`, {
    diameter: 0.62,
    segments: 10
  }, system.scene);
  core.parent = system.root;
  core.material = system.materials.explosionCore;
  core.position.copyFrom(position.add(new Vector3(0, 0.08, 0)));
  core.isPickable = false;
  core.visibility = 0;
  system.hitEffects.push({
    mesh: core,
    coreFlash: true,
    age: 0,
    lifetime: 0.42,
    origin: core.position.clone(),
    baseScale: new Vector3(1, 1, 1),
    grow: new Vector3(1.05, 0.38, 1.05),
    alpha: 0.98,
    seed: 72 + system.hits
  });
}

function createExplosionLightFlash(system, position) {
  if (isExplosionLightOccludedFromPlayer(position)) {
    return;
  }

  const activeFlashes = system.hitEffects.filter((effect) => effect.light);
  activeFlashes.slice(0, Math.max(0, activeFlashes.length - 2)).forEach((effect) => {
    effect.age = effect.lifetime;
  });

  const light = new PointLight(`torpedo_flash_${system.hits}`, position.add(new Vector3(0, 3.8, 0)), system.scene);
  light.diffuse = new Color3(0.82, 0.92, 1.0);
  light.specular = new Color3(0.88, 0.96, 1.0);
  light.intensity = 0;
  light.range = 145;
  system.hitEffects.push({
    light,
    age: 0,
    lifetime: 0.86,
    intensity: 5.4,
    range: 145
  });
}

function isExplosionLightOccludedFromPlayer(position) {
  const playerPosition = boat?.root?.position;
  if (!playerPosition) return false;
  const flashRange = 145;
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
  material.diffuseColor = new Color3(0.84, 0.93, 1.0);
  material.emissiveColor = new Color3(0.72, 0.88, 1.0);
  material.specularColor = Color3.Black();
  material.opacityTexture = texture;
  material.alpha = 0;
  material.disableLighting = true;
  material.fogEnabled = false;
  material.backFaceCulling = false;

  const flash = MeshBuilder.CreatePlane(`torpedo_sky_flash_${system.hits}`, { width: 210, height: 118 }, system.scene);
  flash.parent = system.root;
  flash.position.copyFrom(position.add(new Vector3(0, 68, 0)));
  flash.billboardMode = Mesh.BILLBOARDMODE_ALL;
  flash.material = material;
  flash.isPickable = false;

  const distanceToPlayer = distance2D(position, boat.root.position);
  const distanceAlpha = 0.52 + 0.48 * (1 - clamp(distanceToPlayer / 1800, 0, 1));

  system.hitEffects.push({
    mesh: flash,
    skyFlash: true,
    texture,
    disposeTexture: true,
    disposeMaterial: true,
    age: 0,
    lifetime: 1.02,
    origin: flash.position.clone(),
    baseScale: new Vector3(1, 1, 1),
    grow: new Vector3(0.62, 0.42, 0.62),
    alpha: 0.42 * distanceAlpha
  });
}

function createRadialFlashTexture(scene, name) {
  const size = 256;
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const center = size * 0.5;
  const gradient = context.createRadialGradient(center, center, size * 0.02, center, center, size * 0.48);
  gradient.addColorStop(0, "rgba(255, 248, 214, 1)");
  gradient.addColorStop(0.2, "rgba(255, 194, 92, 0.82)");
  gradient.addColorStop(0.56, "rgba(255, 114, 42, 0.3)");
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
  water.diffuseColor = new Color3(0.18, 0.36, 0.4);
  water.specularColor = new Color3(0.68, 0.74, 0.75);
  water.emissiveColor = new Color3(0.025, 0.075, 0.08);
  water.alpha = 1;
  water.diffuseTexture = createWaterTexture(scene);
  water.diffuseTexture.uScale = 34;
  water.diffuseTexture.vScale = 34;

  const sand = new StandardMaterial("sand_material", scene);
  sand.diffuseColor = new Color3(0.58, 0.58, 0.5);
  sand.specularColor = new Color3(0.035, 0.038, 0.035);
  sand.zOffset = -2;

  const grass = new StandardMaterial("grass_material", scene);
  grass.diffuseColor = new Color3(0.19, 0.38, 0.29);
  grass.specularColor = new Color3(0.03, 0.05, 0.03);

  const terrain = new StandardMaterial("terrain_material", scene);
  terrain.diffuseColor = new Color3(0.22, 0.34, 0.3);
  terrain.specularColor = new Color3(0.03, 0.04, 0.04);

  const shallow = new StandardMaterial("shallow_water_material", scene);
  shallow.diffuseColor = new Color3(0.18, 0.36, 0.4);
  shallow.emissiveColor = new Color3(0.025, 0.075, 0.08);
  shallow.specularColor = new Color3(0.64, 0.71, 0.73);
  shallow.alpha = 1;

  const rock = new StandardMaterial("rock_material", scene);
  rock.diffuseColor = new Color3(0.29, 0.31, 0.31);
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
  glass.emissiveColor = new Color3(0.025, 0.09, 0.12);
  glass.specularColor = new Color3(0.7, 0.9, 1);
  glass.alpha = 0.42;
  glass.backFaceCulling = false;

  const lightHull = new StandardMaterial("light_party_hull_material", scene);
  lightHull.diffuseColor = new Color3(0.47, 0.47, 0.47);
  lightHull.specularColor = new Color3(0.12, 0.14, 0.14);
  lightHull.backFaceCulling = false;

  const lightDeck = new StandardMaterial("light_party_deck_material", scene);
  lightDeck.diffuseColor = new Color3(0.52, 0.52, 0.52);
  lightDeck.specularColor = new Color3(0.13, 0.15, 0.15);
  lightDeck.backFaceCulling = false;

  const lightCabin = new StandardMaterial("light_party_cabin_material", scene);
  lightCabin.diffuseColor = new Color3(0.64, 0.64, 0.64);
  lightCabin.specularColor = new Color3(0.16, 0.18, 0.18);
  lightCabin.backFaceCulling = false;

  const lightFunnel = new StandardMaterial("light_party_funnel_material", scene);
  lightFunnel.diffuseColor = new Color3(0.53, 0.53, 0.53);
  lightFunnel.specularColor = new Color3(0.13, 0.15, 0.15);
  lightFunnel.backFaceCulling = false;

  const playerLightHull = new StandardMaterial("player_light_hull_material", scene);
  playerLightHull.diffuseColor = new Color3(0.36, 0.36, 0.36);
  playerLightHull.specularColor = new Color3(0.1, 0.12, 0.12);
  playerLightHull.backFaceCulling = false;

  const playerLightDeck = new StandardMaterial("player_light_deck_material", scene);
  playerLightDeck.diffuseColor = new Color3(0.38, 0.38, 0.38);
  playerLightDeck.specularColor = new Color3(0.1, 0.12, 0.12);
  playerLightDeck.backFaceCulling = false;

  const playerLightCabin = new StandardMaterial("player_light_cabin_material", scene);
  playerLightCabin.diffuseColor = new Color3(0.46, 0.46, 0.46);
  playerLightCabin.specularColor = new Color3(0.12, 0.14, 0.14);
  playerLightCabin.backFaceCulling = false;

  const playerLightFunnel = new StandardMaterial("player_light_funnel_material", scene);
  playerLightFunnel.diffuseColor = new Color3(0.38, 0.38, 0.38);
  playerLightFunnel.specularColor = new Color3(0.1, 0.12, 0.12);
  playerLightFunnel.backFaceCulling = false;

  const darkHull = new StandardMaterial("dark_party_hull_material", scene);
  darkHull.diffuseColor = new Color3(0.1, 0.13, 0.15);
  darkHull.specularColor = new Color3(0.045, 0.055, 0.065);
  darkHull.backFaceCulling = false;

  const darkDeck = new StandardMaterial("dark_party_deck_material", scene);
  darkDeck.diffuseColor = new Color3(0.085, 0.11, 0.13);
  darkDeck.specularColor = new Color3(0.035, 0.045, 0.055);
  darkDeck.backFaceCulling = false;

  const darkCabin = new StandardMaterial("dark_party_cabin_material", scene);
  darkCabin.diffuseColor = new Color3(0.135, 0.165, 0.185);
  darkCabin.specularColor = new Color3(0.065, 0.08, 0.09);
  darkCabin.backFaceCulling = false;

  const darkFunnel = new StandardMaterial("dark_party_funnel_material", scene);
  darkFunnel.diffuseColor = new Color3(0.08, 0.1, 0.115);
  darkFunnel.specularColor = new Color3(0.035, 0.04, 0.045);
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
  foam.diffuseColor = new Color3(0.84, 0.91, 0.94);
  foam.emissiveColor = new Color3(0.26, 0.29, 0.31);
  foam.specularColor = new Color3(0.03, 0.035, 0.04);

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

  const lighthouseWall = new StandardMaterial("lighthouse_wall_material", scene);
  lighthouseWall.diffuseColor = new Color3(0.72, 0.68, 0.58);
  lighthouseWall.specularColor = new Color3(0.08, 0.07, 0.05);

  const lighthouseCap = new StandardMaterial("lighthouse_cap_material", scene);
  lighthouseCap.diffuseColor = new Color3(0.78, 0.8, 0.8);
  lighthouseCap.emissiveColor = new Color3(0.14, 0.15, 0.15);
  lighthouseCap.specularColor = new Color3(0.22, 0.23, 0.23);

  const lighthouseStripe = new StandardMaterial("lighthouse_stripe_material", scene);
  lighthouseStripe.diffuseColor = new Color3(0.72, 0.12, 0.09);
  lighthouseStripe.specularColor = new Color3(0.11, 0.04, 0.03);

  const explosionCore = new StandardMaterial("explosion_core_material", scene);
  explosionCore.diffuseColor = new Color3(0.92, 0.98, 1.0);
  explosionCore.emissiveColor = new Color3(1.08, 1.18, 1.24);
  explosionCore.specularColor = new Color3(0.95, 1.0, 1.0);
  explosionCore.disableLighting = true;

  const flakTracer = new StandardMaterial("flak_tracer_material", scene);
  flakTracer.diffuseColor = new Color3(0.96, 0.98, 1.0);
  flakTracer.emissiveColor = new Color3(0.86, 0.96, 1.08);
  flakTracer.specularColor = new Color3(0.95, 0.98, 1.0);
  flakTracer.disableLighting = true;

  const flakTracerTrail = new StandardMaterial("flak_tracer_trail_material", scene);
  flakTracerTrail.diffuseColor = new Color3(0.86, 0.94, 1.0);
  flakTracerTrail.emissiveColor = new Color3(0.52, 0.7, 0.9);
  flakTracerTrail.specularColor = new Color3(0.65, 0.75, 0.9);
  flakTracerTrail.alpha = 0.68;
  flakTracerTrail.disableLighting = true;

  const flakFlash = new StandardMaterial("flak_flash_material", scene);
  flakFlash.diffuseColor = new Color3(0.96, 0.98, 1.0);
  flakFlash.emissiveColor = new Color3(0.92, 0.96, 1.08);
  flakFlash.specularColor = new Color3(0.95, 0.98, 1.0);
  flakFlash.alpha = 0.72;
  flakFlash.disableLighting = true;

  const beaconGlow = new StandardMaterial("beacon_glow_material", scene);
  beaconGlow.diffuseColor = new Color3(1.0, 0.98, 0.82);
  beaconGlow.emissiveColor = new Color3(1.15, 1.16, 1.04);
  beaconGlow.specularColor = new Color3(1.0, 1.0, 0.94);
  beaconGlow.disableLighting = true;

  const beaconBeam = new StandardMaterial("beacon_beam_material", scene);
  beaconBeam.diffuseColor = new Color3(1.0, 0.92, 0.58);
  beaconBeam.emissiveColor = new Color3(1.0, 0.86, 0.42);
  beaconBeam.specularColor = Color3.Black();
  beaconBeam.alpha = 0.18;
  beaconBeam.disableLighting = true;
  beaconBeam.backFaceCulling = false;

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
    volcanicGlow,
    lighthouseWall,
    lighthouseCap,
    lighthouseStripe,
    explosionCore,
    flakTracer,
    flakTracerTrail,
    flakFlash,
    beaconGlow,
    beaconBeam
  };
}

function createWaterTexture(scene) {
  const texture = new DynamicTexture("water_texture", { width: 256, height: 256 }, scene);
  const context = texture.getContext();
  context.fillStyle = "#3b7780";
  context.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 34; i += 1) {
    const y = 8 + i * 8;
    context.beginPath();
    context.strokeStyle = i % 2 === 0 ? "rgba(214, 231, 230, 0.22)" : "rgba(62, 98, 103, 0.15)";
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
  if (!openSeaFoamEnabled) {
    root.setEnabled(false);
    return { area, patches };
  }

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
      checkLength: 0.42 + seed.length * 0.85,
      driftX: Math.sin(waveTravelAngle) * windSpeed + (seed.driftX - 0.5) * 0.28,
      driftZ: Math.cos(waveTravelAngle) * windSpeed + (seed.driftZ - 0.5) * 0.28,
      baseAngle: windAngle,
      baseLength: 1 + seed.length * 0.34,
      phase: seed.spin * Math.PI * 2,
      nextWaterCheckAt: seed.spin * 0.18,
      isOverWater: true
    });
  }

  return { area, patches };
}

function updateFoamPatches(foam, center, time, landZones = []) {
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
    const inActiveArea = distanceFromCenter < halfArea - 8;
    if (inActiveArea && time >= patch.nextWaterCheckAt) {
      patch.isOverWater = isFoamPatchOverWater(patch, landZones);
      patch.nextWaterCheckAt = time + 0.22 + (patch.phase % 0.11);
    }
    patch.mesh.setEnabled(inActiveArea && patch.isOverWater);
  });
}

function isFoamPatchOverWater(patch, landZones) {
  if (!landZones.length) return true;

  const forward = new Vector3(Math.sin(patch.baseAngle), 0, Math.cos(patch.baseAngle));
  const halfLength = Math.max(0.28, patch.checkLength * patch.mesh.scaling.z * 0.55);
  const center = patch.mesh.position;
  const samples = [
    center,
    center.add(forward.scale(halfLength)),
    center.add(forward.scale(-halfLength))
  ];

  return samples.every((sample) => !getWaterSafety(sample, landZones).isBlocked);
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
    { z: -4.05, width: 0.88, top: 0.66, bottom: 0.08 },
    { z: -2.3, width: 1.56, top: 0.76, bottom: 0.08 },
    { z: -1.35, width: 1.7, top: 0.72, bottom: 0.12 },
    { z: 1.95, width: 1.08, top: 0.68, bottom: 0.02 },
    { z: 3.65, width: 0.18, top: 0.62, bottom: 0.0 }
  ]);
  hull.parent = root;
  hull.material = hullMaterial;

  const deck = createTaperedDeck(`${name}_foredeck`, scene, [
    { z: -3.72, width: 0.74, y: 0.78 },
    { z: -2.3, width: 1.24, y: 0.82 },
    { z: -1.08, width: 1.35, y: 0.78 },
    { z: 1.95, width: 0.88, y: 0.76 },
    { z: 3.32, width: 0.26, y: 0.72 }
  ]);
  deck.parent = root;
  deck.material = deckMaterial;

  const rearDeck = MeshBuilder.CreateBox(`${name}_rear_deck`, { width: 1.22, height: 0.12, depth: 2.24 }, scene);
  rearDeck.parent = root;
  rearDeck.position.y = 0.82;
  rearDeck.position.z = -2.42;
  rearDeck.material = deckMaterial;

  const flakDeckView = new TransformNode(`${name}_flak_deck_view`, scene);
  flakDeckView.parent = root;
  flakDeckView.setEnabled(false);

  const bridgeBase = MeshBuilder.CreateBox(`${name}_flak_view_bridge_base`, { width: 0.96, height: 0.28, depth: 1.05 }, scene);
  bridgeBase.parent = flakDeckView;
  bridgeBase.position.y = 0.75;
  bridgeBase.position.z = 0.55;
  bridgeBase.material = teamMaterials.cabin;

  const bridge = MeshBuilder.CreateBox(`${name}_flak_view_bridge`, { width: 0.74, height: 0.48, depth: 0.72 }, scene);
  bridge.parent = flakDeckView;
  bridge.position.y = 1.06;
  bridge.position.z = 0.76;
  bridge.material = teamMaterials.cabin;

  const funnelBase = MeshBuilder.CreateBox(`${name}_flak_view_funnel_base`, { width: 0.72, height: 0.22, depth: 0.58 }, scene);
  funnelBase.parent = flakDeckView;
  funnelBase.position.y = 0.76;
  funnelBase.position.z = 0.0;
  funnelBase.material = teamMaterials.cabin;

  const funnel = MeshBuilder.CreateCylinder(`${name}_flak_view_funnel`, {
    diameter: 0.36,
    height: 0.98,
    tessellation: 10
  }, scene);
  funnel.parent = flakDeckView;
  funnel.position.y = 1.33;
  funnel.position.z = 0.0;
  funnel.material = teamMaterials.funnel;

  for (let i = 0; i < 2; i += 1) {
    const tube = MeshBuilder.CreateCylinder(`${name}_torpedo_tube_${i}`, {
      diameter: 0.14,
      height: 2.35,
      tessellation: 12
    }, scene);
    tube.parent = root;
    tube.position.x = i === 0 ? -0.32 : 0.32;
    tube.position.y = 0.795;
    tube.position.z = 0.98;
    tube.rotation.x = Math.PI / 2;
    tube.material = tubeMaterial;

    for (let j = 0; j < 2; j += 1) {
      const saddle = MeshBuilder.CreateBox(`${name}_torpedo_saddle_${i}_${j}`, { width: 0.2, height: 0.08, depth: 0.12 }, scene);
      saddle.parent = root;
      saddle.position.x = tube.position.x;
      saddle.position.y = 0.755;
      saddle.position.z = 0.34 + j * 0.9;
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
    cap.position.z = 2.15;
    cap.rotation.x = Math.PI / 2;
    cap.material = tubeMaterial;
  }

  createRailSegment(`${name}_deck_edge_left`, scene, hullMaterial, root, -0.58, -1.09, -0.58, 1.58, 0.76);
  createRailSegment(`${name}_deck_edge_right`, scene, hullMaterial, root, 0.58, -1.09, 0.58, 1.58, 0.76);

  createRailSegment(`${name}_bow_rail_left_a`, scene, hullMaterial, root, -0.58, 1.58, -0.38, 2.45, 0.76);
  createRailSegment(`${name}_bow_rail_left_b`, scene, hullMaterial, root, -0.16, 2.86, 0, 3.22, 0.76);
  createRailSegment(`${name}_bow_rail_right_a`, scene, hullMaterial, root, 0.58, 1.58, 0.38, 2.45, 0.76);
  createRailSegment(`${name}_bow_rail_right_b`, scene, hullMaterial, root, 0.16, 2.86, 0, 3.22, 0.76);

  const hatch = MeshBuilder.CreateBox(`${name}_deck_hatch`, { width: 0.46, height: 0.11, depth: 0.52 }, scene);
  hatch.parent = root;
  hatch.position.y = 0.91;
  hatch.position.z = -0.36;
  hatch.material = teamMaterials.cabin;

  const sternFlak = createSternFlak(scene, materials, root, name, teamMaterials, playerSternFlakZ, true);

  return { root, sternFlak, flakDeckView };
}

function createScoutPlane(scene, materials, name = "scout_plane", teamId = "light", isPlayer = false) {
  const root = new TransformNode(name, scene);
  const teamMaterials = isPlayer ? getPlayerShipTeamMaterials(materials, teamId) : getShipTeamMaterials(materials, teamId);
  const bodyMaterial = createScoutPlaneMaterial(scene, `${name}_body_material`, teamMaterials.cabin.diffuseColor, 0.92);
  const wingMaterial = createScoutPlaneMaterial(scene, `${name}_wing_material`, teamMaterials.hull.diffuseColor, 0.9);
  const glassMaterial = createScoutPlaneMaterial(scene, `${name}_glass_material`, new Color3(0.26, 0.58, 0.72), 0.72);

  const fuselage = MeshBuilder.CreateBox(`${name}_fuselage`, { width: 0.78, height: 0.38, depth: 5.8 }, scene);
  fuselage.parent = root;
  fuselage.material = bodyMaterial;

  const nose = MeshBuilder.CreateCylinder(`${name}_nose`, {
    diameterTop: 0.1,
    diameterBottom: 0.72,
    height: 0.82,
    tessellation: 12
  }, scene);
  nose.parent = root;
  nose.position.z = 3.28;
  nose.rotation.x = Math.PI / 2;
  nose.material = bodyMaterial;

  const cockpit = MeshBuilder.CreateBox(`${name}_cockpit`, { width: 0.48, height: 0.24, depth: 0.82 }, scene);
  cockpit.parent = root;
  cockpit.position.y = 0.28;
  cockpit.position.z = 1.0;
  cockpit.material = glassMaterial;

  const wing = MeshBuilder.CreateBox(`${name}_wing`, { width: 7.9, height: 0.12, depth: 1.05 }, scene);
  wing.parent = root;
  wing.position.z = 0.18;
  wing.material = wingMaterial;

  const tailWing = MeshBuilder.CreateBox(`${name}_tail_wing`, { width: 2.7, height: 0.1, depth: 0.55 }, scene);
  tailWing.parent = root;
  tailWing.position.z = -2.45;
  tailWing.position.y = 0.04;
  tailWing.material = wingMaterial;

  const fin = MeshBuilder.CreateBox(`${name}_fin`, { width: 0.12, height: 0.8, depth: 0.56 }, scene);
  fin.parent = root;
  fin.position.y = 0.42;
  fin.position.z = -2.72;
  fin.material = wingMaterial;

  const propellerRoot = new TransformNode(`${name}_propeller_root`, scene);
  propellerRoot.parent = root;
  propellerRoot.position.z = 3.78;
  const propellerA = MeshBuilder.CreateBox(`${name}_propeller_a`, { width: 0.16, height: 1.72, depth: 0.045 }, scene);
  propellerA.parent = propellerRoot;
  propellerA.material = materials.funnel;
  const propellerB = MeshBuilder.CreateBox(`${name}_propeller_b`, { width: 1.72, height: 0.16, depth: 0.045 }, scene);
  propellerB.parent = propellerRoot;
  propellerB.material = materials.funnel;

  if (isPlayer) {
    const marker = MeshBuilder.CreateBox(`${name}_player_marker`, { width: 0.35, height: 0.08, depth: 0.35 }, scene);
    marker.parent = root;
    marker.position.y = 0.44;
    marker.position.z = 0.1;
    marker.material = teamMaterials.deck;
  }

  return { root, propellerRoot };
}

function createScoutPlaneMaterial(scene, name, color, alpha) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.08, 0.09, 0.09);
  material.alpha = alpha;
  material.backFaceCulling = false;
  return material;
}

function updateScoutPlaneVisual(plane, speed, time) {
  if (plane.propellerRoot) {
    plane.propellerRoot.rotation.z += Math.max(0.6, Math.abs(speed) * 0.9);
  }
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

function createSternFlak(scene, materials, parent, name, teamMaterials, sternZ = -3.45, isPlayer = false) {
  const deckMaterial = teamMaterials.deck;
  const metalMaterial = teamMaterials.funnel ?? materials.funnel;
  const shieldMaterial = teamMaterials.hull;
  const scale = isPlayer ? playerSternFlakScale : 0.75;

  const platform = MeshBuilder.CreateCylinder(`${name}_flak_platform`, {
    diameter: 1.12 * scale,
    height: 0.11 * scale,
    tessellation: 24
  }, scene);
  platform.parent = parent;
  platform.position.y = isPlayer ? 0.91 : 0.62;
  platform.position.z = sternZ;
  platform.material = deckMaterial;

  const pedestal = MeshBuilder.CreateCylinder(`${name}_flak_pedestal`, {
    diameter: 0.24 * scale,
    height: 0.3 * scale,
    tessellation: 12
  }, scene);
  pedestal.parent = parent;
  pedestal.position.y = platform.position.y + 0.2 * scale;
  pedestal.position.z = sternZ;
  pedestal.material = metalMaterial;

  const mount = new TransformNode(`${name}_flak_mount`, scene);
  mount.parent = parent;
  mount.position.y = platform.position.y + 0.44 * scale;
  mount.position.z = sternZ - 0.05 * scale;
  mount.rotation.y = Math.PI;

  for (let side = -1; side <= 1; side += 2) {
    const shield = MeshBuilder.CreateBox(`${name}_flak_shield_${side}`, {
      width: (isPlayer ? 0.08 : 0.11) * scale,
      height: (isPlayer ? 0.1 : 0.15) * scale,
      depth: 0.035 * scale
    }, scene);
    shield.parent = mount;
    shield.position.x = side * (isPlayer ? 0.34 : 0.18) * scale;
    shield.position.z = (isPlayer ? 0.06 : 0.14) * scale;
    shield.position.y = (isPlayer ? -0.28 : -0.06) * scale;
    shield.material = shieldMaterial;
  }

  if (!isPlayer) {
    const cradle = MeshBuilder.CreateBox(`${name}_flak_cradle`, {
      width: 0.16 * scale,
      height: 0.08 * scale,
      depth: 0.18 * scale
    }, scene);
    cradle.parent = mount;
    cradle.position.y = -0.02 * scale;
    cradle.position.z = 0.14 * scale;
    cradle.material = metalMaterial;
  }

  const elevationRoot = new TransformNode(`${name}_flak_elevation`, scene);
  elevationRoot.parent = mount;
  elevationRoot.position.y = 0.08 * scale;
  elevationRoot.position.z = 0.28 * scale;

  const barrelLength = flakBarrelLength * scale;
  const barrelHalfLength = barrelLength * 0.5;
  const barrelCenterZ = flakBarrelCenterZ * scale;
  const barrel = MeshBuilder.CreateCylinder(`${name}_flak_barrel`, {
    diameter: 0.038 * scale,
    height: barrelLength,
    tessellation: 12
  }, scene);
  barrel.parent = elevationRoot;
  barrel.position.z = barrelCenterZ;
  barrel.rotation.x = Math.PI / 2;
  barrel.material = metalMaterial;

  const jacket = MeshBuilder.CreateCylinder(`${name}_flak_jacket`, {
    diameter: 0.07 * scale,
    height: 0.28 * scale,
    tessellation: 12
  }, scene);
  jacket.parent = elevationRoot;
  jacket.position.z = 0;
  jacket.rotation.x = Math.PI / 2;
  jacket.material = metalMaterial;

  const muzzle = MeshBuilder.CreateCylinder(`${name}_flak_muzzle`, {
    diameter: 0.048 * scale,
    height: 0.08 * scale,
    tessellation: 10
  }, scene);
  muzzle.parent = barrel;
  muzzle.position.y = barrelHalfLength;
  muzzle.material = metalMaterial;

  const sightYOffset = 0.14 * scale;
  const sightZ = 0.9 * scale;
  const sight = MeshBuilder.CreateTorus(`${name}_flak_ring_sight`, {
    diameter: 0.13 * scale,
    thickness: 0.0035 * scale,
    tessellation: 32
  }, scene);
  sight.parent = elevationRoot;
  sight.position.y = sightYOffset;
  sight.position.z = sightZ;
  sight.rotation.x = Math.PI / 2;
  sight.material = metalMaterial;

  const sightSpokes = [
    { width: 0.13, height: 0.002 },
    { width: 0.002, height: 0.13 }
  ];
  sightSpokes.forEach((spoke, index) => {
    const mesh = MeshBuilder.CreateBox(`${name}_flak_ring_sight_spoke_${index}`, {
      width: spoke.width * scale,
      height: spoke.height * scale,
      depth: 0.006 * scale
    }, scene);
    mesh.parent = elevationRoot;
    mesh.position.y = sightYOffset;
    mesh.position.z = sightZ;
    mesh.material = metalMaterial;
  });

  const sightBracket = MeshBuilder.CreateBox(`${name}_flak_ring_sight_bracket`, {
    width: 0.014 * scale,
    height: 0.065 * scale,
    depth: 0.012 * scale
  }, scene);
  sightBracket.parent = elevationRoot;
  sightBracket.position.y = 0.043 * scale;
  sightBracket.position.z = sightZ;
  sightBracket.material = metalMaterial;

  return { mount, elevationRoot };
}

// Low-poly external ship model for opponents. Keep it cheap: enemies may appear in groups later.
function createEnemyTorpedoBoat(scene, materials, name = "enemy_boat", teamId = "dark", designation = "", hasFlak = false) {
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

  const sternFlak = hasFlak
    ? createSternFlak(scene, materials, root, name, teamMaterials, remoteSternFlakZ, false)
    : null;

  const bowWake = createEnemyBowWake(scene, materials, root, name);

  return { root, bowWake, sternFlak };
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
    patch.position.y = enemyBowWakeSurfaceY;
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
  ribbon.position.y = enemyBowWakeSurfaceY;
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

function createNavigationLights(landmasses, scene, materials, parent, visualEffects) {
  const lights = [];
  const lighthouseLands = chooseNavigationLighthouseLandmasses(landmasses, 3);
  lighthouseLands.forEach((land, index) => {
    lights.push(createLighthouse(land, index, scene, materials, parent, visualEffects));
  });

  const rockBeacons = chooseRockBeaconLandmasses(landmasses, lighthouseLands).slice(0, visualEffects === "high" ? 14 : 10);
  rockBeacons.forEach((land, index) => {
    lights.push(createRockBeacon(land, index, scene, materials, parent));
  });

  return lights.filter(Boolean);
}

function chooseNavigationLighthouseLandmasses(landmasses, maxCount = 4) {
  const lighthouseLands = chooseLighthouseLandmasses(landmasses, maxCount);
  const byName = new Map(landmasses.map((land) => [String(land.name ?? ""), land]));

  centerPeakLighthouseLandNames.forEach((name) => {
    const land = byName.get(name);
    if (land && !lighthouseLands.some((existing) => existing.name === land.name)) {
      lighthouseLands.push(land);
    }
  });

  return lighthouseLands;
}

function chooseLighthouseLandmasses(landmasses, maxCount = 4) {
  const preferredNames = ["western_continent", "blackwater_basin", "delta_head"];
  const byName = new Map(landmasses.map((land) => [String(land.name ?? ""), land]));
  const preferred = preferredNames.map((name) => byName.get(name)).filter(Boolean);
  const largeCoastlines = landmasses
    .filter((land) => land.kind === "coastline" && !isVolcanicLandmass(land))
    .filter((land) => !String(land.name ?? "").includes("volcanic"))
    .sort((left, right) => (right.rx * right.rz) - (left.rx * left.rz))
    .slice(0, 8);
  const candidates = [...preferred, ...largeCoastlines]
    .filter((land, index, all) => all.findIndex((other) => other.name === land.name) === index);

  return pickSeparatedLighthouseLandmasses(candidates, maxCount);
}

function pickSeparatedLighthouseLandmasses(candidates, maxCount) {
  const selected = [];
  const minDistance = 560;

  candidates.forEach((land) => {
    if (selected.length >= maxCount) return;
    const index = selected.length;
    const position = getLighthousePosition(land, index);
    const separated = selected.every((entry) => distance2D(position, entry.position) >= minDistance);
    if (separated) selected.push({ land, position });
  });

  if (selected.length >= 2 || candidates.length <= selected.length) {
    return selected.map((entry) => entry.land);
  }

  candidates.forEach((land) => {
    if (selected.length >= Math.min(maxCount, 2)) return;
    if (!selected.some((entry) => entry.land.name === land.name)) {
      selected.push({ land, position: getLighthousePosition(land, selected.length) });
    }
  });

  return selected.map((entry) => entry.land);
}

function chooseRockBeaconLandmasses(landmasses, lighthouseLands) {
  const lighthouseNames = new Set(lighthouseLands.map((land) => land.name));
  return landmasses
    .filter((land) => !lighthouseNames.has(land.name))
    .filter((land) => isSteepRockLand(land) || String(land.name ?? "").includes("passage"))
    .sort((left, right) => {
      const leftScore = passageBeaconScore(left);
      const rightScore = passageBeaconScore(right);
      return rightScore - leftScore;
    });
}

function passageBeaconScore(land) {
  const name = String(land.name ?? "");
  let score = 0;
  if (name.includes("passage")) score += 90;
  if (name.includes("sound")) score += 30;
  if (name.includes("gate")) score += 25;
  if (name.includes("rock")) score += 20;
  score -= Math.abs(land.x ?? 0) * 0.01;
  score -= Math.abs(land.z ?? 0) * 0.006;
  return score;
}

function createLighthouse(land, index, scene, materials, parent, visualEffects) {
  const root = new TransformNode(`${land.name}_lighthouse`, scene);
  root.parent = parent;
  const position = getLighthousePosition(land, index);
  root.position = new Vector3(position.x, position.y, position.z);
  const scale = lighthouseScaleFor(land);
  const baseHeight = 0.44 * scale;
  const towerHeight = 14 * scale;
  const towerCenterY = baseHeight + towerHeight * 0.5;
  const towerTopY = baseHeight + towerHeight;
  const galleryY = towerTopY + 0.15 * scale;
  const lanternY = towerTopY + 1.15 * scale;
  const capY = towerTopY + 2.15 * scale;

  const terrainPlug = MeshBuilder.CreateCylinder(`${land.name}_lighthouse_terrain_plug`, {
    diameterTop: 4.4 * scale,
    diameterBottom: 6.2 * scale,
    height: 2.8 * scale,
    tessellation: 10
  }, scene);
  terrainPlug.parent = root;
  terrainPlug.position.y = -1.4 * scale;
  terrainPlug.material = materials.terrain;

  const base = MeshBuilder.CreateCylinder(`${land.name}_lighthouse_base`, {
    diameterTop: 3.8 * scale,
    diameterBottom: 4.6 * scale,
    height: baseHeight,
    tessellation: 10
  }, scene);
  base.parent = root;
  base.position.y = baseHeight * 0.5;
  base.material = materials.lighthouseCap;

  const tower = MeshBuilder.CreateCylinder(`${land.name}_lighthouse_tower`, {
    diameterTop: 2.2 * scale,
    diameterBottom: 3.0 * scale,
    height: towerHeight,
    tessellation: 10
  }, scene);
  tower.parent = root;
  tower.position.y = towerCenterY;
  tower.material = getLighthouseTowerMaterial(land, scene, materials);

  const gallery = MeshBuilder.CreateCylinder(`${land.name}_lighthouse_gallery`, {
    diameterTop: 3.8 * scale,
    diameterBottom: 4.0 * scale,
    height: 0.5 * scale,
    tessellation: 10
  }, scene);
  gallery.parent = root;
  gallery.position.y = galleryY;
  gallery.material = materials.lighthouseCap;

  const lanternHouse = MeshBuilder.CreateCylinder(`${land.name}_lighthouse_lantern_house`, {
    diameterTop: 2.35 * scale,
    diameterBottom: 2.45 * scale,
    height: 1.85 * scale,
    tessellation: 10
  }, scene);
  lanternHouse.parent = root;
  lanternHouse.position.y = lanternY;
  const lanternMaterial = materials.glass.clone(`${land.name}_lighthouse_lantern_material`);
  lanternMaterial.fogEnabled = false;
  lanternMaterial.disableLighting = true;
  lanternHouse.material = lanternMaterial;

  const cap = MeshBuilder.CreateCylinder(`${land.name}_lighthouse_cap`, {
    diameterTop: 2.25 * scale,
    diameterBottom: 2.65 * scale,
    height: 0.62 * scale,
    tessellation: 10
  }, scene);
  cap.parent = root;
  cap.position.y = capY;
  cap.material = materials.lighthouseCap;

  const lampMaterial = materials.beaconGlow.clone(`${land.name}_lighthouse_lamp_material`);
  lampMaterial.fogEnabled = false;
  lampMaterial.disableLighting = true;
  const lamp = MeshBuilder.CreateCylinder(`${land.name}_lighthouse_lamp`, {
    diameterTop: 1.08 * scale,
    diameterBottom: 1.08 * scale,
    height: 0.82 * scale,
    tessellation: 12
  }, scene);
  lamp.parent = root;
  lamp.position.y = lanternY + 0.15 * scale;
  lamp.material = lampMaterial;
  lamp.isPickable = false;

  const beamPivot = new TransformNode(`${land.name}_lighthouse_beam_pivot`, scene);
  beamPivot.parent = root;
  beamPivot.position.y = lanternY;

  const beam = MeshBuilder.CreateCylinder(`${land.name}_lighthouse_beam`, {
    diameter: 1,
    height: 82,
    tessellation: 8
  }, scene);
  beam.parent = beamPivot;
  beam.position.z = 41;
  beam.rotation.x = Math.PI / 2;
  beam.scaling.x = 0.32;
  beam.scaling.z = 0.04;
  beam.material = materials.beaconBeam;
  beam.isPickable = false;
  beam.setEnabled(false);

  return {
    kind: "lighthouse",
    root,
    lamp,
    lampMaterial,
    lanternMaterial,
    beam,
    beamPivot,
    phase: index * 1.7 + stableNamePhase(land.name),
    period: 5.8 + index * 0.9,
    directionalPeak: 1.7
  };
}

function lighthouseScaleFor(land) {
  const name = String(land.name ?? "");
  if (name.includes("western")) return 1.18;
  return 1.55;
}

function isStripedLighthouse(land) {
  return String(land.name ?? "").includes("blackwater");
}

function getLighthouseTowerMaterial(land, scene, materials) {
  if (!isStripedLighthouse(land)) return materials.lighthouseWall;

  const material = materials.lighthouseWall.clone(`${land.name}_striped_lighthouse_material`);
  const texture = new DynamicTexture(`${land.name}_striped_lighthouse_texture`, { width: 64, height: 256 }, scene);
  const context = texture.getContext();
  const bandHeight = 42;
  for (let y = 0; y < 256; y += bandHeight) {
    context.fillStyle = (Math.floor(y / bandHeight) % 2) === 0 ? "#d8d5c4" : "#8e1f18";
    context.fillRect(0, y, 64, bandHeight);
  }
  texture.update();
  material.diffuseTexture = texture;
  material.diffuseColor = Color3.White();
  material.specularColor = new Color3(0.08, 0.07, 0.06);
  return material;
}

function createRockBeacon(land, index, scene, materials, parent) {
  const root = new TransformNode(`${land.name}_rock_beacon`, scene);
  root.parent = parent;
  const mount = getRockBeaconMountPosition(land);
  root.position = new Vector3(mount.x, mount.y, mount.z);

  const diameter = 0.24;
  const totalHeight = diameter * 5;
  const footHeight = totalHeight * 0.2;
  const lampHeight = totalHeight * 0.8 / 3;

  const base = MeshBuilder.CreateCylinder(`${land.name}_beacon_base`, {
    diameterTop: diameter * 1.05,
    diameterBottom: diameter * 1.18,
    height: footHeight,
    tessellation: 8
  }, scene);
  base.parent = root;
  base.position.y = footHeight / 2;
  base.material = materials.lighthouseCap;

  const lampMaterial = materials.beaconGlow.clone(`${land.name}_beacon_lamp_material`);
  const lamp = MeshBuilder.CreateCylinder(`${land.name}_beacon_lamp`, {
    diameterTop: diameter,
    diameterBottom: diameter,
    height: lampHeight,
    tessellation: 10
  }, scene);
  lamp.parent = root;
  lamp.position.y = footHeight + lampHeight / 2;
  lamp.material = lampMaterial;
  lamp.isPickable = false;

  return {
    kind: "rock-beacon",
    root,
    lamp,
    lampMaterial,
    markerRange: 980,
    phase: index * 0.82 + stableNamePhase(land.name),
    period: 3.2 + (index % 2) * 0.7
  };
}

function getRockBeaconMountPosition(land) {
  const rx = land.rx ?? land.radius ?? 20;
  const rz = land.rz ?? land.radius ?? 20;
  const radius = land.radius ?? Math.min(rx, rz);
  const heightScale = land.heightScale ?? 1;

  if (!isSteepRockLand(land)) {
    return {
      x: land.x,
      y: getLandSurfaceHeightAt(land, land.x, land.z) + 0.12,
      z: land.z
    };
  }

  let best = { x: 0, y: 0.8, z: 0 };
  const stackCount = Math.max(2, Math.min(3, Math.round(radius / 9)));
  for (let i = 0; i < stackCount; i += 1) {
    const angle = radius * 0.18 + i * 2.15;
    const distance = i === 0 ? 0 : 0.18 + i * 0.07;
    const rockHeightProfile = [0.34, 0.48, 0.39];
    const height = radius * rockHeightProfile[i % rockHeightProfile.length] * heightScale;
    const x = Math.cos(angle) * rx * distance;
    const z = Math.sin(angle) * rz * distance * 0.82;
    const y = Math.max(0.8, height - radius * 0.2 + 0.1);
    if (y > best.y) {
      best = { x, y, z };
    }
  }

  return {
    x: land.x + best.x,
    y: best.y,
    z: land.z + best.z
  };
}

function updateNavigationLights(lights, time, playerPosition) {
  lights.forEach((light) => {
    const distanceFade = getNavigationLightDistanceFade(light, playerPosition);
    const intensity = light.kind === "lighthouse"
      ? lighthouseBeamIntensity(light, time, playerPosition, distanceFade)
      : rockBeaconBlink(time, light.period, light.phase) * distanceFade;

    updateLampMaterial(light, intensity);
    if (light.beam) {
      const sweep = time * (Math.PI * 2 / light.period) + light.phase;
      light.beamPivot.rotation.y = sweep;
      light.beam.setEnabled(false);
    }
  });
}

function getNavigationLightDistanceFade(light, playerPosition) {
  const visibilityRange = light.kind === "lighthouse" ? 2300 : (light.markerRange ?? 980);
  return 1 - clamp(distance2D(light.root.position, playerPosition) / visibilityRange, 0, 0.72);
}

function lighthouseBeamIntensity(light, time, playerPosition, distanceFade) {
  const sweep = time * (Math.PI * 2 / light.period) + light.phase;
  const bearingToPlayer = Math.atan2(playerPosition.x - light.root.position.x, playerPosition.z - light.root.position.z);
  const facing = Math.max(0, Math.cos(getSignedAngularDistance(sweep, bearingToPlayer)));
  const flash = Math.pow(facing, 14);
  return (0.035 + flash * (light.directionalPeak ?? 1.5)) * distanceFade;
}

function updateLampMaterial(light, intensity) {
  const base = light.kind === "lighthouse" ? 0.16 : 0.1;
  const glow = clamp(base + intensity, 0.08, 1.85);
  light.lamp.visibility = 1;
  light.lamp.setEnabled(true);
  if (light.kind === "rock-beacon") {
    light.lampMaterial.diffuseColor = new Color3(0.88 + glow * 0.1, 0.9 + glow * 0.1, 0.92 + glow * 0.08);
    light.lampMaterial.emissiveColor = new Color3(0.36 + glow * 0.64, 0.38 + glow * 0.62, 0.42 + glow * 0.58);
    light.lampMaterial.specularColor = new Color3(0.9, 0.92, 0.95);
    return;
  }

  const flash = clamp(intensity, 0, 1.8);
  const visibleGlow = clamp(0.34 + flash * 1.9, 0.28, 2.6);
  light.lampMaterial.alpha = 1;
  light.lampMaterial.diffuseColor = new Color3(0.76, 0.74, 0.66);
  light.lampMaterial.emissiveColor = new Color3(visibleGlow, visibleGlow, visibleGlow * 0.95);
  light.lampMaterial.specularColor = Color3.White();
  if (light.lanternMaterial) {
    const lanternGlow = clamp(0.62 + flash * 0.86, 0.6, 1.45);
    light.lanternMaterial.alpha = clamp(0.82 + flash * 0.03, 0.8, 0.86);
    light.lanternMaterial.diffuseColor = new Color3(0.9 + lanternGlow * 0.035, 0.92 + lanternGlow * 0.035, 0.92 + lanternGlow * 0.03);
    light.lanternMaterial.emissiveColor = new Color3(lanternGlow * 0.68, lanternGlow * 0.7, lanternGlow * 0.68);
    light.lanternMaterial.specularColor = Color3.White();
  }
}

function lighthouseBlink(time, period, phase) {
  const cycle = ((time + phase) % period) / period;
  const primary = smoothstep(0.02, 0.06, cycle) * (1 - smoothstep(0.06, 0.14, cycle));
  const secondary = smoothstep(0.52, 0.56, cycle) * (1 - smoothstep(0.56, 0.64, cycle)) * 0.36;
  return Math.max(primary, secondary);
}

function rockBeaconBlink(time, period, phase) {
  const cycle = ((time + phase) % period) / period;
  return smoothstep(0.04, 0.08, cycle) * (1 - smoothstep(0.08, 0.22, cycle));
}

function lighthouseAngleFor(land, index) {
  const name = String(land.name ?? "");
  if (name.includes("western")) return -0.18;
  if (name.includes("delta")) return 0.2;
  if (name.includes("blackwater")) return -2.35;
  if (name.includes("eagle")) return Math.PI;
  return stableNamePhase(name) + index * 1.9;
}

function getLighthousePosition(land, index) {
  if (String(land.name ?? "") === "western_continent") {
    return getLocalLighthouseFootprintPosition(land, 650, -300, 4.2, 12.5);
  }

  if (String(land.name ?? "") === "delta_head") {
    return getLocalLighthouseFootprintPosition(land, 55, 58, 4.2, 0.4);
  }

  if (centerPeakLighthouseLandNames.has(String(land.name ?? ""))) {
    return getCenterPeakLighthousePosition(land);
  }

  const angle = lighthouseAngleFor(land, index);
  const rx = land.rx ?? land.radius ?? 28;
  const rz = land.rz ?? land.radius ?? 28;
  const radiusFactor = land.kind === "coastline" ? getCoastRadiusFactor(angle, land) : 1;
  const radialPosition = land.kind === "coastline" ? 0.64 : 0.5;
  const x = land.x + Math.cos(angle) * rx * radiusFactor * radialPosition;
  const z = land.z + Math.sin(angle) * rz * radiusFactor * radialPosition;
  return {
    x,
    y: getLandSurfaceHeightAt(land, x, z) + 0.05 + (lighthouseHeightOffsets.get(String(land.name ?? "")) ?? 0),
    z
  };
}

function getLocalLighthousePosition(land, localX, localZ, heightOffset = 0) {
  const x = land.x + localX;
  const z = land.z + localZ;
  return {
    x,
    y: getLandSurfaceHeightAt(land, x, z) + 0.03 + heightOffset,
    z
  };
}

function getLocalLighthouseFootprintPosition(land, localX, localZ, footprintRadius, heightOffset = 0) {
  const x = land.x + localX;
  const z = land.z + localZ;
  const radius = Math.max(0.1, footprintRadius);
  const samples = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [radius * 0.7, radius * 0.7],
    [-radius * 0.7, radius * 0.7],
    [radius * 0.7, -radius * 0.7],
    [-radius * 0.7, -radius * 0.7]
  ];
  const groundY = Math.min(...samples.map(([offsetX, offsetZ]) => (
    getLandSurfaceHeightAt(land, x + offsetX, z + offsetZ)
  )));

  return {
    x,
    y: groundY + heightOffset,
    z
  };
}

function getCenterPeakLighthousePosition(land) {
  const rx = land.rx ?? land.radius ?? 28;
  const rz = land.rz ?? land.radius ?? 28;
  const candidates = [
    [0, 0],
    [-0.18, 0],
    [0.18, 0],
    [0, -0.18],
    [0, 0.18],
    [-0.26, -0.12],
    [-0.26, 0.12],
    [0.26, -0.12],
    [0.26, 0.12]
  ];
  let best = {
    x: land.x,
    z: land.z,
    y: getLandSurfaceHeightAt(land, land.x, land.z)
  };

  candidates.forEach(([offsetX, offsetZ]) => {
    const x = land.x + rx * offsetX;
    const z = land.z + rz * offsetZ;
    const probe = new Vector3(x, 0, z);
    if (getZoneShapeDistance(probe, land, rx, rz) > 0.62 || isInLandWater(probe, land)) return;

    const y = getLandSurfaceHeightAt(land, x, z);
    if (y > best.y) best = { x, z, y };
  });

  return {
    x: best.x,
    y: best.y + 0.05 + (lighthouseHeightOffsets.get(String(land.name ?? "")) ?? 0),
    z: best.z
  };
}

function getLandSurfaceHeightAt(land, worldX, worldZ) {
  const localX = worldX - land.x;
  const localZ = worldZ - land.z;
  const rx = land.rx ?? land.radius ?? 28;
  const rz = land.rz ?? land.radius ?? 28;

  if (land.kind === "coastline") {
    return getCoastlineTerrainHeightAt(land, localX, localZ, rx, rz);
  }

  if (isSteepRockLand(land)) {
    return 0.85;
  }

  return getSmallIslandTerrainHeightAt(land, localX, localZ, rx, rz);
}

function getCoastlineTerrainHeightAt(land, localX, localZ, rx, rz) {
  const angle = Math.atan2(localZ / rz, localX / rx);
  const radiusFactor = getCoastRadiusFactor(angle, land);
  const ring = Math.sqrt((localX / (rx * radiusFactor)) ** 2 + (localZ / (rz * radiusFactor)) ** 2);
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
  const mountainLift = Math.pow(inland, 0.65) * (9 + ridgeA * 10 + ridgeB * 5) * (land.heightScale ?? 1);
  const peakLift = getPeakLift(nx, nz, ring, land.peakBoost ?? 0, land);
  const shoreBlend = 1 - smoothstep(0.9, 0.98, ring);

  return 0.28 + shoreBlend * (
    0.2 + coast * (cliffLift + mountainLift + peakLift + roughness * 3.2) * (1 - terrainFjord * 0.25)
  );
}

function getSmallIslandTerrainHeightAt(land, localX, localZ, rx, rz) {
  const seed = getNameSeed(land.name);
  const hillRx = rx * (0.72 + (seed % 5) * 0.018);
  const hillRz = rz * (0.62 + (seed % 7) * 0.014);
  const heightScale = land.heightScale ?? 1;
  const height = Math.max(1.1, Math.min(4.2, Math.min(rx, rz) * 0.15 * heightScale));
  const offsetX = rx * (0.01 + ((seed % 9) - 4) * 0.006);
  const offsetZ = rz * (-0.015 + ((seed % 11) - 5) * 0.005);
  const peakAngle = seed * 0.017;
  const peakX = Math.cos(peakAngle) * hillRx * 0.16;
  const peakZ = Math.sin(peakAngle) * hillRz * 0.16;
  const dx = (localX - offsetX - peakX * 0.4) / hillRx;
  const dz = (localZ - offsetZ - peakZ * 0.4) / hillRz;
  const ring = clamp(Math.sqrt(dx * dx + dz * dz), 0, 1);
  const crown = Math.pow(1 - ring, 0.72);
  const shoreDrop = smoothstep(0.72, 1.0, ring);

  return 0.34 + height * crown * (1 - shoreDrop * 0.9);
}

function stableNamePhase(name) {
  const text = String(name ?? "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 9973;
  }
  return (hash / 9973) * Math.PI * 2;
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
    heightScale: land.heightScale ?? 1,
    peakBoost: land.peakBoost ?? 0,
    caldera: land.caldera,
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

  if (!hideBeachDebug) {
    const beach = createCoastlineBeachMesh(`${name}_beach`, land, rx, rz, scene);
    beach.parent = parent;
    beach.position = position;
    beach.material = materials.sand;
  }

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
  if (!hideBeachDebug) {
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
  }

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
  const roughness = (land.coastRoughness ?? 0.16) * 0.72;
  const seed = getNameSeed(land.name) * 0.013;
  const broad = Math.sin(angle * 2 + seed) * 0.62;
  const bays = Math.sin(angle * 4 - seed * 0.7) * 0.42;
  const small = Math.sin(angle * 7 + seed * 1.4) * 0.07;
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

// Navigation blocks at the calculated waterline, while radar uses the inner
// terrain contour so a flat beach does not cast a radar shadow.
function getWaterSafety(position, zones) {
  for (const zone of zones) {
    const distance = getZoneShapeDistance(position, zone, zone.rx, zone.rz);
    const blockDistance = getZoneBlockDistance(zone, "navigation");
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

function getZoneBlockDistance(zone, boundary = "navigation") {
  return getZoneBoundaryDistance(zone, boundary);
}

function isRadarBlockedAt(position, zones) {
  for (const zone of zones) {
    const distance = getZoneShapeDistance(position, zone, zone.rx, zone.rz);
    if (distance < getZoneBlockDistance(zone, "radar") && !isInLandWater(position, zone)) {
      return true;
    }
  }

  return false;
}

function getWaterEscapeVector(position, zones) {
  let escape = new Vector3(0, 0, 0);

  for (const zone of zones) {
    const localX = position.x - zone.x;
    const localZ = position.z - zone.z;
    const nx = localX / zone.rx;
    const nz = localZ / zone.rz;
    const distance = getZoneShapeDistance(position, zone, zone.rx, zone.rz);
    const blockDistance = getZoneBlockDistance(zone, "navigation");

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
