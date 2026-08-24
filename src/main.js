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
const scenarioTestMode = urlParams.get("scenarioTest") === "1";
const directSideViewSandboxRequested = urlParams.get("setup") === "8"
  || urlParams.get("sandbox") === "side-view"
  || location.pathname.endsWith("/debug/side-view-sandbox");
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
const telegraphSpeedValue = document.getElementById("telegraphSpeedValue");
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
const radarRangeButton = document.getElementById("radarRangeButton");
const targetRadarButton = document.getElementById("targetRadarButton");
const flakViewButton = document.getElementById("flakViewButton");
const cannonViewButton = document.getElementById("cannonViewButton");
const bridgeViewButton = document.getElementById("bridgeViewButton");
const alignWeaponsButton = document.getElementById("alignWeaponsButton");
const alignAirDefenseButton = document.getElementById("alignAirDefenseButton");
const torpedoAidButton = document.getElementById("torpedoAidButton");
const flakHitAlert = document.getElementById("flakHitAlert");
const rudderIndicator = document.getElementById("rudderIndicator");
const rudderValue = document.getElementById("rudderValue");
const flakElevationIndicator = document.getElementById("flakElevationIndicator");
const flakElevationValue = document.getElementById("flakElevationValue");
const cannonElevationIndicator = document.getElementById("cannonElevationIndicator");
const cannonElevationValue = document.getElementById("cannonElevationValue");
const sinkingWaterOverlay = document.getElementById("sinkingWaterOverlay");
const planeHitFlash = document.getElementById("planeHitFlash");
const fleetStatusRows = document.getElementById("fleetStatusRows");
const torpedoStockValue = document.getElementById("torpedoStockValue");
const playerListRows = document.getElementById("playerListRows");
const killFeedRows = document.getElementById("killFeedRows");
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
const shipFleetMaterialPalettes = {
  light: {
    body: { diffuse: [0.62, 0.63, 0.62], specular: [0.11, 0.12, 0.12] }
  },
  dark: {
    body: { diffuse: [0.2, 0.24, 0.26], specular: [0.045, 0.055, 0.06] }
  },
  green: {
    body: { diffuse: [0.2, 0.34, 0.25], specular: [0.06, 0.08, 0.06] }
  },
  sand: {
    body: { diffuse: [0.5, 0.44, 0.31], specular: [0.1, 0.08, 0.05] }
  }
};
const worldMetersPerUnit = 20;
const killFeedLimit = 5;
const torpedoLogLimit = 40;
const shipTorpedoBaseSpeed = 24;
const shipTorpedoSpeedGain = 0.35;
const airTorpedoSpeedFactor = 0.75;
const enemyTorpedoFireArcRadians = 0.14;
const enemyTorpedoAimJitterRadians = 0.035;
const enemyTargetingRange = 945;
const engineHoldInitialDelaySeconds = 0.22;
const engineHoldRepeatSeconds = 0.1;
const mouseWheelEngineStep = 100;
const scoutPlaneSetupId = "scout-plane";
const scoutPlaneCruiseAltitude = 20;
const scoutPlaneMinAltitude = 3;
const scoutPlaneMaxAltitude = 200;
const scoutPlaneCruiseSpeed = 14.5;
const scoutPlaneMinSpeed = 7.5;
const scoutPlaneMaxSpeed = 19.5;
const scoutPlaneMaxDiveSpeed = 29.0;
const scoutPlaneSpeedStep = 1.5;
const scoutPlaneMaxClimbRate = 20.0;
const scoutPlaneMaxDiveRate = 34.0;
const scoutPlaneMaxPitch = 0.55;
const scoutPlanePulloutAltitude = 3.0;
const scoutPlanePulloutStartAltitude = 8.0;
const scoutPlaneFlakSmokeSeconds = 1.65;
const scoutPlaneFlakRespawnSeconds = 3.35;
const scoutPlaneFlakSmokeIntervalSeconds = 0.12;
const scoutPlaneHitFuselageHalfWidth = 0.55;
const scoutPlaneHitHalfLength = 3.5;
const scoutPlaneHitWingHalfWidth = 4.15;
const scoutPlaneHitWingForwardMin = -0.45;
const scoutPlaneHitWingForwardMax = 0.95;
const scoutPlaneHitTailHalfWidth = 1.45;
const scoutPlaneHitTailForwardMin = -2.85;
const scoutPlaneHitTailForwardMax = -2.1;
const scoutPlaneHitVerticalHalfHeight = 1.15;
const scoutPlaneHitMargin = 1.1;
const bombGravity = 14.0;
const bombDropForwardOffset = 0.6;
const bombDropVerticalOffset = 0.65;
const bombsPerDrop = 12;
const bombReleaseIntervalSeconds = 0.12;
const bombPatternLateralSpacing = 0.18;
const bombPatternHeadingJitter = 0.008;
const bombPatternSpeedJitter = 1.1;
const bombSightArmLength = 4.2;
const bombBayWideFov = 0.92;
const bombBayZoomFov = 0.62;
const bombBayImpactFocusExtraSeconds = 1.5;
const scoutPlaneExperimentShowAllFlak = true;
const scoutPlaneExperimentFlakDemo = urlParams.get("flak-demo") === "1";
const flakHitboxDebugEnabled = urlParams.get("flak-hitbox") === "1";
const playerSternFlakZ = -2.92;
const remoteSternFlakZ = -2.92;
const flakMinPitch = -0.12;
const flakMaxPitch = 1.18;
const flakPitchStepRadians = 0.008;
const flakHoldMediumDelaySeconds = 0.35;
const flakHoldFastDelaySeconds = 0.85;
const flakHoldVeryFastDelaySeconds = 1.35;
const flakHoldMaxDelaySeconds = 2.05;
const flakHoldExtremeDelaySeconds = 2.75;
const flakYawFineSpeed = 0.105;
const flakYawMediumSpeed = 0.18;
const flakYawFastSpeed = 0.34;
const flakYawVeryFastSpeed = 0.48;
const flakYawMaxSpeed = 0.62;
const flakYawExtremeSpeed = 0.82;
const flakPitchFineSpeed = 0.055;
const flakPitchMediumSpeed = 0.095;
const flakPitchFastSpeed = 0.19;
const flakPitchVeryFastSpeed = 0.27;
const flakPitchMaxSpeed = 0.34;
const flakPitchExtremeSpeed = 0.46;
const flakFireCooldownSeconds = 0.055;
const flakProjectileSpeed = 275;
const flakProjectileGravity = 9;
const flakProjectileLifetime = 8.0;
const flakProjectileMaxVisualScale = 3.15;
const flakDemoFireIntervalSeconds = 0.25;
const flakBarrelLength = 1.62;
const flakBarrelCenterZ = 0.22;
const playerSternFlakScale = 0.54;
const playerFlakSightYOffset = 0.16 * playerSternFlakScale;
const playerFlakEyeZ = 0.02 * playerSternFlakScale;
const cannonMinPitch = -0.035;
const cannonMaxPitch = 45 * Math.PI / 180;
const cannonPitchStepRadians = 0.004;
const cannonYawLimit = 2.62;
const cannonHoldMediumDelaySeconds = 0.24;
const cannonHoldFastDelaySeconds = 0.68;
const cannonHoldVeryFastDelaySeconds = 1.08;
const cannonHoldMaxDelaySeconds = 1.64;
const cannonHoldExtremeDelaySeconds = 2.2;
const cannonYawFineSpeed = 0.016;
const cannonYawMediumSpeed = 0.052;
const cannonYawFastSpeed = 0.16;
const cannonYawVeryFastSpeed = 0.28;
const cannonYawMaxSpeed = 0.42;
const cannonYawExtremeSpeed = 0.58;
const cannonPitchFineSpeed = 0.011;
const cannonPitchMediumSpeed = 0.036;
const cannonPitchFastSpeed = 0.11;
const cannonPitchVeryFastSpeed = 0.19;
const cannonPitchMaxSpeed = 0.28;
const cannonPitchExtremeSpeed = 0.38;
const weaponHeadingHoldMaxDelta = 0.28;
const playerCannonSightYOffset = 0.08;
const playerCannonEyeZ = -0.08;
const cannonFireCooldownSeconds = 1.0;
const cannonProjectileSpeed = 1000;
const cannonProjectileGravity = 9.8;
const cannonProjectileLifetime = 7.0;
const cannonProjectileMaxVisualScale = 2.05;
const cannonBarrelRecoilDistance = 0.16;
const cannonBarrelRecoilDuration = 0.34;
const weaponAlignYawSpeed = 1.55;
const weaponAlignPitchSpeed = 0.62;
const weaponAlignFlatFlakPitch = 0;
const weaponAlignAirDefenseFlakPitch = 18 * Math.PI / 180;
const weaponAlignFlatCannonPitch = 0;
const weaponAlignAirDefenseCannonPitch = 20 * Math.PI / 180;
const testPlayerInvulnerable = false;
const openSeaFoamEnabled = true;
const openSeaFoamDriftSpeed = 0.48;
const openSeaFoamRandomDrift = 0.16;
const openSeaFoamWidthMin = 0.014;
const openSeaFoamWidthVariance = 0.01;
const openSeaFoamHeight = 0.007;
const openSeaFoamLengthMin = 0.25;
const openSeaFoamLengthVariance = 0.48;
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
await requireRegisteredGameSession(playerLogin);
const worldLandmasses = await loadWorldLandmasses();
document.body.dataset.worldSource = "server";
document.body.dataset.worldLandmasses = String(worldLandmasses.length);
const gameState = await loadGameState();
document.body.dataset.gameStateSource = "server";
document.body.dataset.serverGameState = gameState.state;
document.body.dataset.serverShips = String(gameState.ships.length);
document.body.dataset.serverTorpedoes = String(gameState.torpedoes.length);
document.body.dataset.serverBombs = String(Array.isArray(gameState.bombs) ? gameState.bombs.length : 0);
const sideViewSandboxMode = directSideViewSandboxRequested || gameState.sessionId === "side-view-sandbox";
const bridgeViewWidth = clamp(Number(urlParams.get("bridgeViewWidth") ?? "0.86"), 0.42, 0.9);
const sideViewCameraFovDefault = clamp(Number(urlParams.get("viewFov") ?? "0.78"), 0.28, 1.2);
const sideViewCameraDistanceDefault = clamp(Number(urlParams.get("viewDistance") ?? "11"), -32, 32);
const sideViewCameraHeightDefault = clamp(Number(urlParams.get("viewHeight") ?? "0.72"), -0.2, 3.2);
const sideViewCameraModeDefault = urlParams.get("viewMode") === "ship" ? "ship" : "orbit";
const sideViewCameraXDefault = clamp(Number(urlParams.get("viewX") ?? "0"), -3.2, 3.2);
const sideViewCameraZDefault = clamp(Number(urlParams.get("viewZ") ?? "0.5"), -5.2, 5.2);
const sideViewCameraYawDefault = clamp(Number(urlParams.get("viewYaw") ?? "0"), -180, 180);
const selectedVehicleType = urlParams.get("vehicle") ?? readStoredValue("vehicleType");
const scoutPlaneMode = gameState.sessionId === scoutPlaneSetupId || selectedVehicleType === "scout-plane";
if (scoutPlaneMode) {
  scene.fogStart = 240;
  scene.fogEnd = 2400;
}
if (sideViewSandboxMode) {
  scene.fogMode = Scene.FOGMODE_NONE;
}
const playerId = playerLogin.playerId;
const playerTeamId = getRequestedPlayerTeamId(gameState.ships, playerLogin.teamId);
const playerShips = getTeamShips(gameState.ships, playerTeamId);
const enemyShips = getEnemyShips(gameState.ships, playerTeamId);
const initialPlayerSpawn = createPlayerSpawn(playerShips, playerId);
let playerServerShipId = initialPlayerSpawn.shipId;
const initialPlayerShip = gameState.ships.find((ship) => ship.id === playerServerShipId);
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
document.body.dataset.cannonView = "bridge";
document.body.dataset.bombBayView = "off";
document.body.dataset.playerShipId = playerServerShipId ?? "pending";
document.body.dataset.serverOwnShips = String(playerShips.length);
document.body.dataset.serverEnemyShips = String(enemyShips.length);
document.body.dataset.testPlayerInvulnerable = String(testPlayerInvulnerable);
document.body.dataset.openSeaFoam = String(openSeaFoamEnabled);
document.body.dataset.performanceLogging = String(performanceLoggingEnabled);
document.body.dataset.debugMap = String(debugMapEnabled);
document.body.dataset.debugMarkerMap = String(debugMarkerMapEnabled);
document.body.dataset.sideViewSandbox = String(sideViewSandboxMode);
document.body.dataset.bridgeViewWidth = bridgeViewWidth.toFixed(2);
installScenarioTestHooks();
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
ambient.intensity = 0.42;
ambient.diffuse = new Color3(0.52, 0.62, 0.72);
ambient.groundColor = new Color3(0.2, 0.23, 0.25);
if (sideViewSandboxMode) {
  sun.direction = new Vector3(-0.55, -0.7, -0.45);
  sun.position = new Vector3(55, 70, 45);
  sun.intensity = 1.12;
  sun.diffuse = new Color3(0.95, 0.93, 0.86);
  sun.specular = new Color3(0.35, 0.35, 0.3);
  ambient.intensity = 0.12;
  ambient.diffuse = new Color3(0.52, 0.56, 0.58);
  ambient.groundColor = new Color3(0.04, 0.045, 0.05);
}

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
  : createPlayerBow(
    scene,
    materials,
    "player_bow",
    playerTeamId,
    initialPlayerShip ? createShipDesignation(initialPlayerShip) : ""
  );
boat.root.position.copyFrom(initialPlayerSpawn.position);
if (scoutPlaneMode) {
  boat.root.position.y = scoutPlaneCruiseAltitude;
}

// Until SSE arrives, backend ships seed the visual fleet and local motion keeps them inspectable.
const enemyMotions = createEnemyFleet(
  scene,
  materials,
  sideViewSandboxMode ? [] : getOtherServerShips(gameState.ships, playerServerShipId)
);
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
  if (isStartupErrorVisible() || isSystemShortcutEvent(event)) return;
  if (isHudControlEvent(event)) return;
  document.body.dataset.lastKey = formatInputEvent(event);
  const playerActive = playerDamageState === "active";

  if (playerActive && isFlakViewToggleKey(event) && !event.repeat) {
    setBattleStation("flak");
    event.preventDefault();
    return;
  }
  if (playerActive && isCannonViewToggleKey(event) && !event.repeat) {
    setBattleStation("cannon");
    event.preventDefault();
    return;
  }
  if (playerActive && isBridgeViewKey(event) && !event.repeat) {
    setBattleStation("bridge");
    event.preventDefault();
    return;
  }
  if (playerActive && isTorpedoScopeToggleKey(event) && !event.repeat) {
    setBattleStation("torpedo");
    event.preventDefault();
    return;
  }
  if (playerActive && isAlignWeaponsKey(event) && !event.repeat) {
    alignWeaponsForBridge(event.shiftKey ? "air-defense" : "flat");
    event.preventDefault();
    return;
  }
  if (playerActive && isBombBayViewToggleKey(event) && !event.repeat) {
    toggleBombBayView();
    event.preventDefault();
    return;
  }
  if (playerActive && isRadarModeToggleKey(event) && !event.repeat) {
    setRadarMode(radarMode === "target" ? "radar" : "target");
    event.preventDefault();
    return;
  }
  if (playerActive && isInputKey(event, "up")) {
    if (cannonViewActive && !event.shiftKey) {
      if (!event.repeat || heldCannonPitchDirection !== 1) {
        heldCannonPitchStartTime = time;
      }
      heldCannonPitchDirection = 1;
      if (!event.repeat) {
        changeCannonPitch(1);
      }
      event.preventDefault();
      return;
    }
    if (flakViewActive && !event.shiftKey) {
      if (!event.repeat || heldFlakPitchDirection !== 1) {
        heldFlakPitchStartTime = time;
      }
      heldFlakPitchDirection = 1;
      if (!event.repeat) {
        changeFlakPitch(1);
      }
      event.preventDefault();
      return;
    }
    if (scoutPlaneMode) {
      if (event.shiftKey) {
        heldElevatorDirection = -1;
      } else {
        if (!event.repeat) {
          changeScoutPlaneTargetSpeed(1);
        }
      }
    } else {
      heldEngineDirection = 1;
      if (!event.repeat) {
        changeEngineOrder(1);
        nextEngineHoldChangeTime = time + engineHoldInitialDelaySeconds;
      } else {
        nextEngineHoldChangeTime = Math.min(nextEngineHoldChangeTime, time);
      }
    }
    event.preventDefault();
  }
  if (playerActive && isInputKey(event, "down")) {
    if (cannonViewActive && !event.shiftKey) {
      if (!event.repeat || heldCannonPitchDirection !== -1) {
        heldCannonPitchStartTime = time;
      }
      heldCannonPitchDirection = -1;
      if (!event.repeat) {
        changeCannonPitch(-1);
      }
      event.preventDefault();
      return;
    }
    if (flakViewActive && !event.shiftKey) {
      if (!event.repeat || heldFlakPitchDirection !== -1) {
        heldFlakPitchStartTime = time;
      }
      heldFlakPitchDirection = -1;
      if (!event.repeat) {
        changeFlakPitch(-1);
      }
      event.preventDefault();
      return;
    }
    if (scoutPlaneMode) {
      if (event.shiftKey) {
        heldElevatorDirection = 1;
      } else {
        if (!event.repeat) {
          changeScoutPlaneTargetSpeed(-1);
        }
      }
    } else {
      heldEngineDirection = -1;
      if (!event.repeat) {
        changeEngineOrder(-1);
        nextEngineHoldChangeTime = time + engineHoldInitialDelaySeconds;
      } else {
        nextEngineHoldChangeTime = Math.min(nextEngineHoldChangeTime, time);
      }
    }
    event.preventDefault();
  }
  if (playerActive && isInputKey(event, "left")) {
    if (cannonViewActive && !event.shiftKey) {
      if (!event.repeat || heldCannonDirection !== -1) {
        heldCannonStartTime = time;
      }
      heldCannonDirection = -1;
      event.preventDefault();
      return;
    }
    if (flakViewActive && !event.shiftKey) {
      if (!event.repeat || heldFlakDirection !== -1) {
        heldFlakStartTime = time;
      }
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
    if (cannonViewActive && !event.shiftKey) {
      if (!event.repeat || heldCannonDirection !== 1) {
        heldCannonStartTime = time;
      }
      heldCannonDirection = 1;
      event.preventDefault();
      return;
    }
    if (flakViewActive && !event.shiftKey) {
      if (!event.repeat || heldFlakDirection !== 1) {
        heldFlakStartTime = time;
      }
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
    if (cannonViewActive) {
      firePlayerCannon();
      event.preventDefault();
      return;
    }
    requestPlayerWeaponFire();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (isStartupErrorVisible() || isSystemShortcutEvent(event)) return;
  if (isHudControlEvent(event)) return;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
    heldEngineDirection = 0;
    heldRudderDirection = 0;
  }
  if (isInputKey(event, "up") && heldEngineDirection > 0) {
    heldEngineDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "up") && heldFlakPitchDirection > 0) {
    heldFlakPitchDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "up") && heldCannonPitchDirection > 0) {
    heldCannonPitchDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "up") && heldElevatorDirection < 0) {
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
  if (isInputKey(event, "down") && heldCannonPitchDirection < 0) {
    heldCannonPitchDirection = 0;
    event.preventDefault();
  }
  if (isInputKey(event, "down") && heldElevatorDirection > 0) {
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
  if (isInputKey(event, "left") && heldCannonDirection < 0) {
    heldCannonDirection = 0;
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
  if (isInputKey(event, "right") && heldCannonDirection > 0) {
    heldCannonDirection = 0;
    event.preventDefault();
  }
  if (isTorpedoFireKey(event) && heldFlakFire) {
    heldFlakFire = false;
    event.preventDefault();
  }
});

window.addEventListener("mousedown", (event) => {
  if (isStartupErrorVisible()) return;
  if (isHudControlEvent(event)) return;
  if (fireMouseTorpedo(event.button)) {
    event.preventDefault();
    return;
  }
});

window.addEventListener("pointerdown", (event) => {
  if (isStartupErrorVisible()) return;
  if (isHudControlEvent(event)) return;
  focusGameCanvas();
  if (startDebugOrbitCameraDrag(event)) {
    mouseButtonMask = event.buttons;
    event.target?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return;
  }
  if (startGlobalMouseRudder(event)) {
    mouseButtonMask = event.buttons;
    event.target?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
});

window.addEventListener("mouseup", (event) => {
  if (isStartupErrorVisible()) return;
  if (isHudControlEvent(event)) return;
  if (stopGlobalMouseRudder(event.button)) {
    mouseButtonMask = event.buttons;
    event.preventDefault();
  }
});

window.addEventListener("pointerup", (event) => {
  if (isStartupErrorVisible()) return;
  if (isHudControlEvent(event)) return;
  if (stopDebugOrbitCameraDrag(event)) {
    mouseButtonMask = event.buttons;
    event.target?.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
    return;
  }
  if (stopGlobalMouseRudder(event.button)) {
    mouseButtonMask = event.buttons;
    event.target?.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
  }
});

window.addEventListener("pointermove", (event) => {
  mouseButtonMask = event.buttons;
  if (updateDebugOrbitCameraDrag(event)) {
    event.preventDefault();
    return;
  }
  updateGlobalMouseRudder(event);
});

window.addEventListener("pointercancel", () => {
  mouseButtonMask = 0;
  debugOrbitDragActive = false;
  debugOrbitPointerId = null;
  rightMouseRudderActive = false;
  heldElevatorDirection = 0;
});

window.addEventListener("blur", () => {
  mouseButtonMask = 0;
  debugOrbitDragActive = false;
  debugOrbitPointerId = null;
  rightMouseRudderActive = false;
  heldElevatorDirection = 0;
});

window.addEventListener("contextmenu", (event) => {
  if (isStartupErrorVisible()) return;
  if (playerDamageState === "active") {
    event.preventDefault();
  }
});

window.addEventListener("auxclick", (event) => {
  if (isStartupErrorVisible()) return;
  if (isMouseTorpedoButton(event.button)) {
    event.preventDefault();
  }
});

window.addEventListener("wheel", (event) => {
  if (isStartupErrorVisible()) return;
  if (playerDamageState !== "active") return;
  if (updateDebugOrbitCameraZoom(event)) {
    event.preventDefault();
    return;
  }
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

function startDebugOrbitCameraDrag(event) {
  if (!sideViewSandboxMode || event.button !== 0 || event.target !== canvas) return false;
  debugOrbitDragActive = true;
  debugOrbitPointerId = event.pointerId;
  debugOrbitLastX = event.clientX;
  debugOrbitLastY = event.clientY;
  return true;
}

function updateDebugOrbitCameraDrag(event) {
  if (!debugOrbitDragActive || event.pointerId !== debugOrbitPointerId) return false;
  const dx = event.clientX - debugOrbitLastX;
  const dy = event.clientY - debugOrbitLastY;
  debugOrbitLastX = event.clientX;
  debugOrbitLastY = event.clientY;
  if (debugCameraMode === "ship") {
    debugShipCameraYaw = wrapDegrees(debugShipCameraYaw + dx * 0.18);
    debugOrbitPitch = clamp(debugOrbitPitch - dy * 0.006, -0.42, 0.9);
  } else {
    debugOrbitYaw -= dx * 0.008;
    debugOrbitPitch = clamp(debugOrbitPitch - dy * 0.006, -0.08, 1.32);
  }
  updateSideViewCameraControls();
  updateSideViewCameraUrl();
  return true;
}

function stopDebugOrbitCameraDrag(event) {
  if (!debugOrbitDragActive || event.pointerId !== debugOrbitPointerId) return false;
  debugOrbitDragActive = false;
  debugOrbitPointerId = null;
  return true;
}

function updateDebugOrbitCameraZoom(event) {
  if (!sideViewSandboxMode) return false;
  if (debugCameraMode === "ship") {
    debugShipCameraZ = clamp(debugShipCameraZ + event.deltaY * 0.006, -5.2, 5.2);
  } else {
    debugOrbitRadius = clamp(debugOrbitRadius + event.deltaY * 0.012, -32, 32);
  }
  updateSideViewCameraControls();
  updateSideViewCameraUrl();
  return true;
}

function isTextEditingElement(element) {
  return element instanceof HTMLInputElement
      || element instanceof HTMLTextAreaElement
      || element instanceof HTMLSelectElement
      || element.isContentEditable;
}

const engineOrders = [
  { label: "Astern Full", shortLabel: "Full Ast", speed: -8.0 },
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
let cannonViewActive = false;
let torpedoScopeActive = false;
let bombBayViewActive = false;
let bombBayImpactFocus = null;
const RADAR_MODE_OVERRIDE_MS = 10000;
let radarMode = "radar";
let radarModeOverride = null;
let radarModeOverrideUntil = 0;
let flakYaw = Math.PI;
let flakPitch = 0;
let cannonYaw = 0;
let cannonPitch = 0.04;
let weaponAlignTarget = null;
let heldFlakDirection = 0;
let heldFlakPitchDirection = 0;
let heldFlakStartTime = 0;
let heldFlakPitchStartTime = 0;
let heldFlakFire = false;
let heldCannonDirection = 0;
let heldCannonPitchDirection = 0;
let heldCannonStartTime = 0;
let heldCannonPitchStartTime = 0;
let nextCannonFireTime = 0;
let mouseButtonMask = 0;
let mouseWheelEngineAccumulator = 0;
let debugOrbitDragActive = false;
let debugOrbitPointerId = null;
let debugOrbitLastX = 0;
let debugOrbitLastY = 0;
let debugOrbitYaw = Math.PI / 2;
let debugOrbitPitch = 0.26;
let debugOrbitRadius = sideViewCameraDistanceDefault;
let debugOrbitTargetY = sideViewCameraHeightDefault;
let debugOrbitFov = sideViewCameraFovDefault;
let debugCameraMode = sideViewCameraModeDefault;
let debugShipCameraX = sideViewCameraXDefault;
let debugShipCameraZ = sideViewCameraZDefault;
let debugShipCameraYaw = sideViewCameraYawDefault;
let measuredSpeedSample = {
  time: 0,
  x: initialPlayerSpawn.position.x,
  z: initialPlayerSpawn.position.z,
  speed: 0
};
let performanceTelemetry = createPerformanceTelemetry();
let httpRequestsInFlight = 0;
let nextWorldDeltaEventTime = 0;
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
let lastFlakHitId = "";
let flakHitAlertUntil = 0;
let damageNotificationIds = new Set();
let killFeedEventIds = new Set();
let killFeedEvents = [];
let killFeedShipLabels = new Map();
let nextKillFeedNumber = 1;
let reportedLocalPlaneHitIds = new Set();
let radarTorpedoSnapshots = Array.isArray(gameState.torpedoes) ? gameState.torpedoes : [];
let scoutPlaneFlakHitStartTime = 0;
let scoutPlaneFlakHitExploded = false;
let nextScoutPlaneFlakSmokeTime = 0;
let scoutPlaneFlakHitHeading = 0;
let scoutPlaneFlakHitSpeed = scoutPlaneMinSpeed;
let planeHitFlashUntil = 0;
let planeHitFlashStart = 0;
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
const radarRangeFactors = {
  near: 0.62,
  far: scoutPlaneRadarRangeFactor
};
setupRadarRangeControl(radarRangeButton);
setupTargetRadarControl(targetRadarButton);
setupBridgeViewControl(bridgeViewButton);
setupFlakViewControl(flakViewButton);
setupCannonViewControl(cannonViewButton);
setupAlignWeaponsControl(alignWeaponsButton);
setupAlignWeaponsControl(alignAirDefenseButton, "air-defense");
setupTorpedoAidControl(torpedoAidButton);
setupSideViewCameraTuner();
let serverShipsById = indexShipsById(gameState.ships);
let serverClockOffset = Number.isFinite(gameState.t) ? -gameState.t : null;
let lastServerSnapshotTime = Number.isFinite(gameState.t) ? gameState.t : null;
let gameEventSource = null;
let gameEventSourceReady = false;
let lastGameStreamMessageAt = 0;
let debugTeleportPending = false;
let fireTorpedoRequestInFlight = false;
let dropBombRequestInFlight = false;
const maxRudderDegrees = 35;
const rudderStepDegrees = 2;
const rudderHoldInitialDelaySeconds = 0.22;
const rudderHoldDegreesPerSecond = 60;
const maxSimulationFrameSeconds = 0.12;
boat.root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
const playerRespawnPoints = createPlayerRespawnPoints(playerShips, initialPlayerSpawn);
const torpedoLaunchDefaults = {
  tubeX: 0.56,
  startZ: 2.26,
  startY: 0.6,
  waterEntryZ: 2.62,
  runStartZ: 2.88
};
const airDroppedTorpedoFallSeconds = 1.55;
const airDroppedTorpedoSubmergedDistance = 20;
const serverTorpedoFreshLaunchSeconds = 0.55;
const torpedoSystem = createTorpedoSystem(scene, materials, world);
const bombSystem = createBombSystem(scene, materials, world);
const flakSystem = createFlakSystem(scene, materials, world);
const cannonSystem = createCannonSystem(scene, materials, world);
connectGameEventStream();

const telegraphSteps = createTelegraphSteps(engineOrders, telegraphScale);
setupTelegraphDragControl(telegraphScale);
setupRudderDragControl(document.querySelector(".rudder-gauge"));
setupMobileFireButton(mobileFireButton);
updateFleetStatus(gameState.ships, gameState.destroyedShipsByTeam);
updatePlayerList(gameState.ships, gameState.killsByPlayer);
updateKillFeedFromSnapshot(gameState);
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
    cancelWeaponAlignment();
    flakYaw = normalizeAngle(flakYaw + heldFlakDirection * getHeldFlakSpeed(heldFlakStartTime, flakYawFineSpeed, flakYawMediumSpeed, flakYawFastSpeed, flakYawVeryFastSpeed, flakYawMaxSpeed, flakYawExtremeSpeed) * dt);
  }
  if (playerActive && flakViewActive && heldFlakPitchDirection !== 0) {
    cancelWeaponAlignment();
    flakPitch = clamp(
      flakPitch + heldFlakPitchDirection * getHeldFlakSpeed(heldFlakPitchStartTime, flakPitchFineSpeed, flakPitchMediumSpeed, flakPitchFastSpeed, flakPitchVeryFastSpeed, flakPitchMaxSpeed, flakPitchExtremeSpeed) * dt,
      flakMinPitch,
      flakMaxPitch
    );
  }
  if (playerActive && cannonViewActive && heldCannonDirection !== 0) {
    cancelWeaponAlignment();
    cannonYaw = clamp(
      cannonYaw + heldCannonDirection * getHeldWeaponSpeed(heldCannonStartTime, cannonYawFineSpeed, cannonYawMediumSpeed, cannonYawFastSpeed, cannonYawVeryFastSpeed, cannonYawMaxSpeed, cannonYawExtremeSpeed, cannonHoldTimings) * dt,
      -cannonYawLimit,
      cannonYawLimit
    );
  }
  if (playerActive && cannonViewActive && heldCannonPitchDirection !== 0) {
    cancelWeaponAlignment();
    cannonPitch = clamp(
      cannonPitch + heldCannonPitchDirection * getHeldWeaponSpeed(heldCannonPitchStartTime, cannonPitchFineSpeed, cannonPitchMediumSpeed, cannonPitchFastSpeed, cannonPitchVeryFastSpeed, cannonPitchMaxSpeed, cannonPitchExtremeSpeed, cannonHoldTimings) * dt,
      cannonMinPitch,
      cannonMaxPitch
    );
  }
  if (playerActive && flakViewActive && heldFlakFire) {
    firePlayerFlak();
  }
  updateWeaponAlignment(dt);
  updatePlayerFlakMount();
  updatePlayerCannonMount();
  updateCannonBarrelRecoil(boat.bowCannon, time);

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
    const diveRatio = scoutPlaneMode ? clamp(-heldElevatorDirection, 0, 1) : 0;
    const maxForwardSpeed = scoutPlaneMode
      ? scoutPlaneMaxSpeed + (scoutPlaneMaxDiveSpeed - scoutPlaneMaxSpeed) * diveRatio
      : 12.4;
    const engineTargetSpeed = engineOrders[engineOrder].speed;
    const targetSpeed = scoutPlaneMode
      ? scoutPlaneTargetSpeed + (scoutPlaneMaxDiveSpeed - scoutPlaneTargetSpeed) * diveRatio
      : engineTargetSpeed > 0
      ? Math.min(engineTargetSpeed, maxForwardSpeed)
      : engineTargetSpeed;
    const response = scoutPlaneMode ? 1.1 : (Math.abs(targetSpeed) > Math.abs(speed) ? 0.45 : 0.75);
    speed += (targetSpeed - speed) * Math.min(1, dt * response);

    const turnStrength = scoutPlaneMode ? 0.26 : (speed >= 0 ? 0.24 : -0.16);
    const rudderGrip = scoutPlaneMode ? clamp(Math.abs(speed) / 7.2, 0.24, 1) : clamp(Math.abs(speed) / 4.2, 0, 1);
    const steer = rudderDegrees / maxRudderDegrees;
    const targetTurnVelocity = steer * turnStrength * rudderGrip;
    turnVelocity += (targetTurnVelocity - turnVelocity) * Math.min(1, dt * (scoutPlaneMode ? 1.75 : 2.0));
    const previousHeading = heading;
    heading += turnVelocity * dt;
    holdWeaponWorldHeading(previousHeading, heading);
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
      const pulloutRatio = heldElevatorDirection < 0
        ? smoothstep(scoutPlanePulloutAltitude, scoutPlanePulloutStartAltitude, scoutPlaneAltitude)
        : 1;
      const effectiveElevatorDirection = heldElevatorDirection < 0
        ? heldElevatorDirection * pulloutRatio
        : heldElevatorDirection;
      const targetPitch = -effectiveElevatorDirection * scoutPlaneMaxPitch;
      scoutPlanePitch += (targetPitch - scoutPlanePitch) * Math.min(1, dt * 2.4);
      const targetVerticalSpeed = effectiveElevatorDirection < 0
        ? effectiveElevatorDirection * scoutPlaneMaxDiveRate
        : effectiveElevatorDirection * scoutPlaneMaxClimbRate;
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
    heldCannonDirection = 0;
    heldCannonPitchDirection = 0;
    engineOrder = 2;
    speed *= Math.max(0, 1 - dt * 1.7);
    turnVelocity *= Math.max(0, 1 - dt * 2.0);
    rudderDegrees += (0 - rudderDegrees) * Math.min(1, dt * 1.8);
    scoutPlaneVerticalSpeed *= Math.max(0, 1 - dt * 2.0);
    scoutPlanePitch += (0 - scoutPlanePitch) * Math.min(1, dt * 2.2);
  }

  const bridgeViewStabilization = !scoutPlaneMode
    && !flakViewActive
    && !cannonViewActive
    && !torpedoScopeActive
    ? 0.35
    : 1;
  const shipStabilization = sideViewSandboxMode
    ? 0
    : (torpedoScopeActive && !scoutPlaneMode
    ? 0
    : (flakViewActive && !scoutPlaneMode
      ? 0.24
      : (cannonViewActive && !scoutPlaneMode ? 0.18 : bridgeViewStabilization)));
  const bob = (Math.sin(time * 2.1) * 0.08 + Math.sin(time * 3.8 + 1.6) * 0.035) * shipStabilization;
  if (playerActive) {
    boat.root.position.y = scoutPlaneMode
      ? scoutPlaneAltitude
      : torpedoBoatWaterlineY + bob;
    boat.root.rotationQuaternion = Quaternion.FromEulerAngles(
      scoutPlaneMode ? scoutPlanePitch : Math.sin(time * 2.6) * 0.025 * shipStabilization,
      heading,
      scoutPlaneMode ? -turnVelocity * 2.8 : (-turnVelocity * 0.5 + Math.sin(time * 1.9) * 0.018) * shipStabilization
    );
    if (scoutPlaneMode) {
      updateScoutPlaneVisual(boat, speed, time);
    }
  } else if (playerDamageState === "sinking") {
    updatePlayerSinking(boat, time);
  } else if (playerDamageState === "air-hit") {
    updateScoutPlaneFlakHitSequence(boat, time, dt);
  }
  boat.root.setEnabled(!torpedoScopeActive);
  ocean.position.x = boat.root.position.x;
  ocean.position.z = boat.root.position.z;

  materials.water.diffuseTexture.uOffset += dt * 0.0065;
  materials.water.diffuseTexture.vOffset += dt * 0.0115;
  if (openSeaFoamEnabled) {
    updateFoamPatches(foam, boat.root.position, time, blockedWaters);
  }
  updateVolcanoPlumes(volcanoPlumes, time);
  updateNavigationLights(navigationLights, time, boat.root.position);
  enemyMotions.forEach((enemyMotion) => updateEnemyMotion(enemyMotion, dt, time, boat.root.position, blockedWaters));
  enemyMotions.forEach((enemyMotion) => updateCannonBarrelRecoil(enemyMotion.boat?.bowCannon, time));
  updateScoutPlaneFlakDemo(enemyMotions.concat(flakDemoMotions), time);
  updateEnemyFireControl(torpedoSystem, enemyMotions, boat.root.position, blockedWaters, time);
  updateServerTorpedoVisuals(torpedoSystem, dt, time);
  updateServerBombVisuals(bombSystem, dt, time);
  updateBombSightMarker(bombSystem, forward);
  updateFlakSystem(flakSystem, dt, time);
  updateCannonSystem(cannonSystem, dt, time, blockedWaters);
  updateFlakHitAlert(time);
  updatePlaneHitFlash(time);
  syncMultiplayerState(time);
  const torpedoResult = updateTorpedoSystem(torpedoSystem, dt, time, enemyMotions, blockedWaters, boat.root.position);
  if (torpedoResult.playerHit && playerDamageState === "active") {
    playerHits += torpedoResult.playerHit;
    ramShake = 1;
    speed *= 0.55;
    if (testPlayerInvulnerable) {
      document.body.dataset.playerDamageState = "invulnerable-hit";
    } else {
      beginPlayerSinking(torpedoResult.playerHitPosition, time, "Abgeschossen durch Torpedo");
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
  const bridgeInteriorViewActive = !sideViewSandboxMode
    && !scoutPlaneMode
    && !flakViewActive
    && !cannonViewActive
    && !torpedoScopeActive
    && !bombBayViewActive;

  camera.minZ = (cannonViewActive || flakViewActive || torpedoScopeActive) ? 0.03 : (bombBayViewActive ? 0.2 : (scoutPlaneMode ? 1.5 : 0.2));
  camera.fov = sideViewSandboxMode
    ? debugOrbitFov
    : (cannonViewActive ? 0.34 : (torpedoScopeActive ? 0.42 : (bombBayViewActive ? getBombBayFov() : (scoutPlaneMode ? 1.02 : (bridgeInteriorViewActive ? bridgeViewWidth : 0.78)))));
  cameraPosition.copyFrom(desiredCameraPosition.add(shakeOffset));
  cameraTarget.copyFrom(desiredTarget);
  camera.position.copyFrom(cameraPosition);
  camera.setTarget(desiredTarget);
  if (!sideViewSandboxMode && !scoutPlaneMode && !flakViewActive && !cannonViewActive) {
    camera.rotation.x = -Math.abs(camera.rotation.x);
  }
  boat.flakDeckView?.setEnabled(flakViewActive);
  boat.flakViewHiddenMeshes?.forEach((mesh) => mesh.setEnabled(!flakViewActive));
  boat.cannonViewHiddenMeshes?.forEach((mesh) => mesh.setEnabled(!cannonViewActive));
  boat.bridgeViewHiddenMeshes?.forEach((mesh) => mesh.setEnabled(!bridgeInteriorViewActive));
  updateTorpedoViewState();
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
  updateSteeringModifierHint();
  document.body.dataset.torpedoes = String(torpedoSystem.active.length);
  document.body.dataset.torpedoHits = String(torpedoSystem.hits);
  document.body.dataset.playerHits = String(playerHits);
  document.body.dataset.playerDamageState = playerDamageState;
  document.body.dataset.ramReady = time >= nextRamHitTime ? "true" : "false";
  playerBearingPosition = boat.root.position;

  const displayedSpeed = Math.abs(speed) < 0.08 ? 0 : Math.abs(speed);
  speedValue.textContent = displayedSpeed.toFixed(1);
  if (telegraphSpeedValue) telegraphSpeedValue.textContent = displayedSpeed.toFixed(1);
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
  updateWeaponElevationGauge(flakElevationIndicator, flakElevationValue, flakPitch, flakMinPitch, flakMaxPitch);
  updateWeaponElevationGauge(cannonElevationIndicator, cannonElevationValue, cannonPitch, cannonMinPitch, cannonMaxPitch);
  const radarContacts = getRadarContacts(enemyMotions);
  updateNavigationInstruments(mapCanvas, radarCanvas, radarStatus, boat.root.position, radarContacts, blockedWaters, heading, heading, {
    flakLookHeading: !scoutPlaneMode ? normalizeAngle(heading + (flakViewActive ? flakYaw : (cannonViewActive ? cannonYaw : 0))) : null
  });
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

function isSystemShortcutEvent(event) {
  return event.metaKey || event.ctrlKey;
}

function isStartupErrorVisible() {
  return Boolean(document.body?.dataset?.startupError);
}

function isCannonViewToggleKey(event) {
  return !scoutPlaneMode && (event.code === "KeyC" || event.key === "c" || event.key === "C");
}

function isBridgeViewKey(event) {
  return !scoutPlaneMode && (event.code === "KeyB" || event.key === "b" || event.key === "B");
}

function isTorpedoScopeToggleKey(event) {
  return !scoutPlaneMode && (event.code === "KeyT" || event.key === "t" || event.key === "T");
}

function isAlignWeaponsKey(event) {
  return !scoutPlaneMode && (event.code === "KeyA" || event.key === "a" || event.key === "A");
}

function isBombBayViewToggleKey(event) {
  return scoutPlaneMode && (event.code === "KeyB" || event.key === "b" || event.key === "B");
}

function isRadarModeToggleKey(event) {
  return !scoutPlaneMode && (event.code === "KeyR" || event.key === "r" || event.key === "R");
}

function toggleFlakView() {
  setBattleStation("flak");
}

function toggleCannonView() {
  setBattleStation("cannon");
}

function setBattleStation(station) {
  flakViewActive = station === "flak";
  cannonViewActive = station === "cannon";
  setTorpedoScope(station === "torpedo");
  heldFlakDirection = 0;
  heldFlakPitchDirection = 0;
  heldFlakStartTime = time;
  heldFlakPitchStartTime = time;
  heldFlakFire = false;
  heldRudderDirection = 0;
  heldEngineDirection = 0;
  heldElevatorDirection = 0;
  heldCannonDirection = 0;
  heldCannonPitchDirection = 0;
  heldCannonStartTime = time;
  heldCannonPitchStartTime = time;
  rightMouseRudderActive = false;
  document.body.dataset.flakView = flakViewActive ? "active" : "bridge";
  document.body.dataset.cannonView = cannonViewActive ? "active" : "bridge";
  updateSteeringModifierHint();
  updateTorpedoViewState();
  updateBattleStationButtons();
}

function updateSteeringModifierHint() {
  document.body.dataset.steeringModifier = (flakViewActive || cannonViewActive) ? "shift" : "none";
}

function updateTorpedoViewState() {
  if (torpedoScopeActive && (scoutPlaneMode || flakViewActive || cannonViewActive || bombBayViewActive || playerDamageState !== "active")) {
    setTorpedoScope(false);
  }
  const active = torpedoScopeActive && !scoutPlaneMode && !flakViewActive && !cannonViewActive && !bombBayViewActive && playerDamageState === "active";
  document.body.dataset.torpedoView = active ? "active" : "hidden";
}

function setTorpedoScope(active) {
  torpedoScopeActive = Boolean(active) && !scoutPlaneMode && !flakViewActive && !cannonViewActive && !bombBayViewActive && playerDamageState === "active";
  document.body.dataset.torpedoView = torpedoScopeActive ? "active" : "hidden";
}

function toggleBombBayView() {
  bombBayViewActive = !bombBayViewActive;
  if (bombBayViewActive) {
    setTorpedoScope(false);
  }
  heldElevatorDirection = 0;
  rightMouseRudderActive = false;
  document.body.dataset.bombBayView = bombBayViewActive ? "active" : "off";
  updateTorpedoViewState();
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

function updatePlayerCannonMount() {
  if (!boat.bowCannon?.mount) return;
  boat.bowCannon.mount.rotation.y = cannonYaw;
  if (boat.bowCannon.elevationRoot) {
    boat.bowCannon.elevationRoot.rotation.x = -cannonPitch;
  }
  document.body.dataset.cannonYaw = String(Math.round(normalizeAngle(cannonYaw) * 180 / Math.PI));
  document.body.dataset.cannonPitch = String(Math.round(cannonPitch * 180 / Math.PI));
}

function holdWeaponWorldHeading(previousHeading, nextHeading) {
  if (!Number.isFinite(previousHeading) || !Number.isFinite(nextHeading) || scoutPlaneMode || torpedoScopeActive) return;
  const headingDelta = clamp(getSignedAngularDistance(nextHeading, previousHeading), -weaponHeadingHoldMaxDelta, weaponHeadingHoldMaxDelta);
  if (Math.abs(headingDelta) < 0.00001) return;

  if (flakViewActive) {
    flakYaw = normalizeAngle(flakYaw - headingDelta);
  }
  if (cannonViewActive) {
    cannonYaw = clamp(cannonYaw - headingDelta, -cannonYawLimit, cannonYawLimit);
  }
}

function changeFlakPitch(direction) {
  cancelWeaponAlignment();
  flakPitch = clamp(flakPitch + direction * flakPitchStepRadians, flakMinPitch, flakMaxPitch);
}

function changeCannonPitch(direction) {
  cancelWeaponAlignment();
  cannonPitch = clamp(cannonPitch + direction * cannonPitchStepRadians, cannonMinPitch, cannonMaxPitch);
}

function getHeldFlakSpeed(startTime, fineSpeed, mediumSpeed, fastSpeed, veryFastSpeed, maxSpeed, extremeSpeed) {
  return getHeldWeaponSpeed(startTime, fineSpeed, mediumSpeed, fastSpeed, veryFastSpeed, maxSpeed, extremeSpeed, flakHoldTimings);
}

const flakHoldTimings = {
  medium: flakHoldMediumDelaySeconds,
  fast: flakHoldFastDelaySeconds,
  veryFast: flakHoldVeryFastDelaySeconds,
  max: flakHoldMaxDelaySeconds,
  extreme: flakHoldExtremeDelaySeconds
};

const cannonHoldTimings = {
  medium: cannonHoldMediumDelaySeconds,
  fast: cannonHoldFastDelaySeconds,
  veryFast: cannonHoldVeryFastDelaySeconds,
  max: cannonHoldMaxDelaySeconds,
  extreme: cannonHoldExtremeDelaySeconds
};

function getHeldWeaponSpeed(startTime, fineSpeed, mediumSpeed, fastSpeed, veryFastSpeed, maxSpeed, extremeSpeed, timings) {
  const heldSeconds = time - startTime;
  if (heldSeconds >= timings.extreme) return extremeSpeed;
  if (heldSeconds >= timings.max) return maxSpeed;
  if (heldSeconds >= timings.veryFast) return veryFastSpeed;
  if (heldSeconds >= timings.fast) return fastSpeed;
  if (heldSeconds >= timings.medium) return mediumSpeed;
  return fineSpeed;
}

function getPlayerCameraSetup(forward) {
  if (sideViewSandboxMode) {
    return getDebugOrbitCameraSetup();
  }

  if (scoutPlaneMode && bombBayViewActive) {
    const preview = getBombDropPreview();
    if (bombBayImpactFocus && time >= bombBayImpactFocus.expiresAt) {
      bombBayImpactFocus = null;
    }
    const focus = bombBayImpactFocus?.position ?? preview.centerImpact;
    const position = boat.root.position
      .add(forward.scale(0.7))
      .add(new Vector3(0, -0.55 - Math.sin(time * 1.1) * 0.22, 0));
    const target = new Vector3(focus.x, 0.2, focus.z);
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

  if (!scoutPlaneMode && cannonViewActive) {
    const elevationRoot = boat.bowCannon?.elevationRoot;
    if (!elevationRoot) {
      return { position: camera.position.clone(), target: cameraTarget.clone() };
    }
    const worldMatrix = elevationRoot.computeWorldMatrix(true);
    const position = Vector3.TransformCoordinates(
      new Vector3(0, playerCannonSightYOffset, playerCannonEyeZ),
      worldMatrix
    );
    const target = Vector3.TransformCoordinates(
      new Vector3(0, playerCannonSightYOffset, 180),
      worldMatrix
    );
    return {
      position,
      target
    };
  }

  if (!scoutPlaneMode) {
    const bridgeWindow = getBridgeWindowCameraLocalPosition();
    const position = transformLocalShipPointWithoutTilt(bridgeWindow.position);
    const target = transformLocalShipPointWithoutTilt(bridgeWindow.target);
    return { position, target };
  }

  // Oblique chase camera for the scout-plane perspective test.
  const cameraDistance = 24.0;
  const bridgeEyeHeight = 0;
  const cameraHeight = scoutPlaneMode ? 9.5 - scoutPlanePitch * 10 : bridgeEyeHeight;
  const position = boat.root.position
    .subtract(forward.scale(cameraDistance))
    .add(new Vector3(0, cameraHeight, 0));
  const planeLookDown = scoutPlaneMode ? -8.0 - scoutPlanePitch * 42 : 0.9;
  const target = boat.root.position
    .add(forward.scale(scoutPlaneMode ? 90.0 : 24.0))
    .add(new Vector3(0, planeLookDown, 0));
  return { position, target };
}

function getBridgeWindowCameraLocalPosition() {
  const bridgeBaseZ = 0.64;
  const bridgeBaseDepth = 0.76;
  const bridgeBaseHeight = 0.414;
  const bridgeHouseZ = 0.72;
  const bridgeHouseDepth = 0.46;
  const bridgeHouseHeight = 0.2898;
  const bridgeWindowYOffset = 0.02;
  const bridgeBaseBackBottomY = getTorpedoBoatDeckY(bridgeBaseZ - bridgeBaseDepth * 0.5) - 0.004;
  const bridgeBaseFrontBottomY = getTorpedoBoatDeckY(bridgeBaseZ + bridgeBaseDepth * 0.5) - 0.004;
  const bridgeBaseTopY = Math.max(bridgeBaseBackBottomY, bridgeBaseFrontBottomY) + bridgeBaseHeight;
  const bridgeHouseCenterY = bridgeBaseTopY + bridgeHouseHeight * 0.5;
  const windowY = bridgeHouseCenterY + bridgeWindowYOffset;
  const windowFrontZ = bridgeHouseZ + bridgeHouseDepth * 0.5;
  return {
    position: new Vector3(0, windowY, windowFrontZ - 0.035),
    target: new Vector3(0, windowY - 0.035, windowFrontZ + 72)
  };
}

function transformLocalShipPointWithoutTilt(localPoint) {
  const right = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
  const forward = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  return boat.root.position
    .add(right.scale(localPoint.x))
    .add(new Vector3(0, localPoint.y, 0))
    .add(forward.scale(localPoint.z));
}

function getDebugOrbitCameraSetup() {
  if (debugCameraMode === "ship") {
    const shipYaw = heading + debugShipCameraYaw * Math.PI / 180;
    const localRight = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const localForward = new Vector3(Math.sin(heading), 0, Math.cos(heading));
    const position = boat.root.position
      .add(localRight.scale(debugShipCameraX))
      .add(localForward.scale(debugShipCameraZ))
      .add(new Vector3(0, debugOrbitTargetY, 0));
    const lookDirection = new Vector3(
      Math.sin(shipYaw) * Math.cos(debugOrbitPitch),
      Math.sin(debugOrbitPitch),
      Math.cos(shipYaw) * Math.cos(debugOrbitPitch)
    );
    return { position, target: position.add(lookDirection.scale(80)) };
  }

  const target = boat.root.position.add(new Vector3(0, debugOrbitTargetY, 0));
  const distanceMagnitude = Math.max(Math.abs(debugOrbitRadius), 0.05);
  const distanceDirection = Math.sign(debugOrbitRadius) || 1;
  const horizontalRadius = distanceDirection * distanceMagnitude * Math.cos(debugOrbitPitch);
  const position = target.add(new Vector3(
    Math.sin(debugOrbitYaw) * horizontalRadius,
    distanceMagnitude * Math.sin(debugOrbitPitch),
    Math.cos(debugOrbitYaw) * horizontalRadius
  ));
  return { position, target };
}

function wrapDegrees(value) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function getBombBayFov() {
  const altitudeFactor = clamp(
    (boat.root.position.y - scoutPlaneCruiseAltitude) / (scoutPlaneMaxAltitude - scoutPlaneCruiseAltitude),
    0,
    1
  );
  return bombBayWideFov + (bombBayZoomFov - bombBayWideFov) * altitudeFactor;
}

function getBombDropPreview() {
  const horizontalSpeed = clamp(speed * 0.92, 4, 28);
  const bombPreviewPoints = getBombImpactPreviewPoints(horizontalSpeed);
  const impactPoints = bombPreviewPoints.map((point) => ({ x: point.x, z: point.z }));
  const centerlinePoints = bombPreviewPoints.map((point) => ({ x: point.centerX, z: point.centerZ }));
  const impactSpacing = horizontalSpeed * bombReleaseIntervalSeconds;
  const sightHeading = getBombSightHeading(centerlinePoints);
  const bounds = getBombSightBounds(impactPoints, sightHeading);
  const patternLength = bounds.length;
  const firstImpact = new Vector3(impactPoints[0].x, 0.2, impactPoints[0].z);
  const centerImpact = new Vector3(bounds.center.x, 0.2, bounds.center.z);
  firstImpact.y = 0.2;
  centerImpact.y = 0.2;

  return {
    firstImpact,
    centerImpact,
    impactSpacing,
    patternLength,
    fallSeconds: bombPreviewPoints[bombPreviewPoints.length - 1]?.impactAtSeconds ?? 0,
    horizontalSpeed,
    impactPoints,
    centerlinePoints,
    bounds,
    sightHeading
  };
}

function getBombSightHeading(impactPoints) {
  const first = impactPoints[0];
  const last = impactPoints[impactPoints.length - 1] ?? first;
  const dx = last.x - first.x;
  const dz = last.z - first.z;
  if (Math.hypot(dx, dz) <= 0.001) return heading;
  return Math.atan2(dx, dz);
}

function getBombSightBounds(impactPoints, sightHeading) {
  const origin = impactPoints[0] ?? { x: 0, z: 0 };
  const localPoints = impactPoints.map((point) => worldPointToBombSightLocal(point, origin, sightHeading));
  const xs = localPoints.map((point) => point.x);
  const zs = localPoints.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const firstLocal = localPoints[0] ?? { x: 0, z: 0 };
  const lastLocal = localPoints[localPoints.length - 1] ?? firstLocal;
  const length = Math.hypot(lastLocal.x - firstLocal.x, lastLocal.z - firstLocal.z);
  const centerLocal = {
    x: (minX + maxX) * 0.5,
    z: (firstLocal.z + lastLocal.z) * 0.5
  };
  return {
    center: bombSightLocalToWorldPoint(centerLocal, origin, sightHeading),
    width: maxX - minX,
    length
  };
}

function worldPointToBombSightLocal(point, origin, sightHeading) {
  const dx = point.x - origin.x;
  const dz = point.z - origin.z;
  const sin = Math.sin(sightHeading);
  const cos = Math.cos(sightHeading);
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos
  };
}

function bombSightLocalToWorldPoint(point, origin, sightHeading) {
  const sin = Math.sin(sightHeading);
  const cos = Math.cos(sightHeading);
  return {
    x: origin.x + point.x * cos + point.z * sin,
    z: origin.z - point.x * sin + point.z * cos
  };
}

function getBombImpactPreviewPoints(horizontalSpeed) {
  return Array.from({ length: bombsPerDrop }, (_, index) => {
    const releaseDelay = index * bombReleaseIntervalSeconds;
    const planeState = predictScoutPlaneBombReleaseState(releaseDelay);
    const bombHeading = normalizeAngle(planeState.heading + getBombPatternHeadingJitter(index));
    const bombSpeed = Math.max(0, horizontalSpeed + getBombPatternSpeedJitter(index));
    const releaseForward = getForwardVector(planeState.heading);
    const releaseRight = getRightVector(planeState.heading);
    const bombForward = getForwardVector(bombHeading);
    const dropAltitude = Math.max(0, planeState.y - bombDropVerticalOffset);
    const fallSeconds = getBombFallSeconds(dropAltitude, scoutPlaneVerticalSpeed);
    const releasePosition = planeState.position
      .add(releaseForward.scale(bombDropForwardOffset))
      .add(releaseRight.scale(getBombPatternOffset(index)));
    const centerlineRelease = planeState.position.add(releaseForward.scale(bombDropForwardOffset));
    const impact = releasePosition.add(bombForward.scale(bombSpeed * fallSeconds));
    const centerlineImpact = centerlineRelease.add(releaseForward.scale(horizontalSpeed * fallSeconds));
    return {
      x: impact.x,
      z: impact.z,
      centerX: centerlineImpact.x,
      centerZ: centerlineImpact.z,
      impactAtSeconds: releaseDelay + fallSeconds
    };
  });
}

function getBombFallSeconds(dropAltitude, verticalSpeed) {
  const initialDownSpeed = -verticalSpeed;
  return Math.max(0, (-initialDownSpeed + Math.sqrt(initialDownSpeed * initialDownSpeed + 2 * bombGravity * dropAltitude)) / bombGravity);
}

function predictScoutPlaneBombReleaseState(delaySeconds) {
  const steps = Math.max(1, Math.ceil(delaySeconds / 0.08));
  const dt = steps > 0 ? delaySeconds / steps : 0;
  let predictedHeading = heading;
  const predictedPosition = boat.root.position.clone();
  for (let step = 0; step < steps; step += 1) {
    predictedHeading = normalizeAngle(predictedHeading + turnVelocity * dt);
    predictedPosition.addInPlace(getForwardVector(predictedHeading).scale(speed * dt));
  }
  return {
    position: predictedPosition,
    heading: predictedHeading,
    y: clamp(boat.root.position.y + scoutPlaneVerticalSpeed * delaySeconds, scoutPlaneMinAltitude, scoutPlaneMaxAltitude)
  };
}

function getBombPatternOffset(index) {
  const side = index % 2 === 0 ? -1 : 1;
  return side * bombPatternLateralSpacing;
}

function getBombPatternHeadingJitter(index) {
  const centered = stableUnitNoise(index * 97 + 31) - 0.5;
  return centered * bombPatternHeadingJitter;
}

function getBombPatternSpeedJitter(index) {
  return (stableUnitNoise(index * 83 + 47) - 0.5) * bombPatternSpeedJitter;
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

function setupRadarRangeControl(button) {
  if (!button) return;
  button.addEventListener("click", (event) => {
    setRadarMode("radar");
    button.blur();
    event.stopPropagation();
  });
}

function setupTargetRadarControl(button) {
  if (!button) return;
  button.addEventListener("click", (event) => {
    setRadarMode("target");
    button.blur();
    event.stopPropagation();
  });
  updateRadarModeButtons();
}

function setRadarMode(mode) {
  radarModeOverride = mode === "target" ? "target" : "radar";
  radarModeOverrideUntil = performance.now() + RADAR_MODE_OVERRIDE_MS;
  setEffectiveRadarMode(radarModeOverride, true);
}

function setEffectiveRadarMode(mode, forceUpdate = false) {
  const nextMode = mode === "target" ? "target" : "radar";
  if (radarMode === nextMode && !forceUpdate) return;
  radarMode = nextMode;
  updateRadarModeButtons();
}

function updateRadarModeButtons() {
  document.body.dataset.radarRangeMode = radarMode === "target" ? "near" : "far";
  document.body.dataset.radarMode = radarMode;
  document.body.dataset.radarModeOverride = radarModeOverride ? "active" : "off";
  if (radarRangeButton) {
    radarRangeButton.classList.toggle("is-active", radarMode !== "target");
  }
  if (targetRadarButton) {
    targetRadarButton.classList.toggle("is-active", radarMode === "target");
  }
}

function getSelectedRadarRange() {
  return getRadarRangeForMode(radarMode);
}

function getRadarRangeForMode(mode) {
  const rangeMode = mode === "target" ? "near" : "far";
  return clientRadarRange * (radarRangeFactors[rangeMode] ?? radarRangeFactors.far);
}

function setupFlakViewControl(button) {
  if (!button) return;
  updateBattleStationButtons();
  button.addEventListener("click", (event) => {
    setBattleStation("flak");
    button.blur();
    event.stopPropagation();
  });
}

function setupBridgeViewControl(button) {
  if (!button) return;
  updateBattleStationButtons();
  button.addEventListener("click", (event) => {
    setBattleStation("bridge");
    button.blur();
    event.stopPropagation();
  });
}

function setupCannonViewControl(button) {
  if (!button) return;
  updateBattleStationButtons();
  button.addEventListener("click", (event) => {
    setBattleStation("cannon");
    button.blur();
    event.stopPropagation();
  });
}

function setupAlignWeaponsControl(button, mode = "flat") {
  if (!button) return;
  button.addEventListener("click", (event) => {
    alignWeaponsForBridge(mode);
    button.blur();
    event.stopPropagation();
  });
}

function setupTorpedoAidControl(button) {
  if (!button) return;
  button.addEventListener("click", (event) => {
    setBattleStation("torpedo");
    button.blur();
    event.stopPropagation();
  });
}

function setupSideViewCameraTuner() {
  if (!sideViewSandboxMode) return;
  const panel = document.createElement("section");
  panel.className = "side-view-camera-panel";
  panel.innerHTML = `
    <div class="side-view-camera-title">Kamera Entwurf</div>
    <div class="side-view-camera-mode" role="group" aria-label="Kameramodus">
      <button type="button" data-camera-mode="orbit">Orbit</button>
      <button type="button" data-camera-mode="ship">An Bord</button>
    </div>
    <label>Weite <output data-camera-output="fov"></output><input data-camera-control="fov" type="range" min="0.28" max="1.20" step="0.01"></label>
    <label>Abstand <output data-camera-output="distance"></output><input data-camera-control="distance" type="range" min="-32" max="32" step="0.1"></label>
    <label>Blickhöhe <output data-camera-output="height"></output><input data-camera-control="height" type="range" min="-0.2" max="3.2" step="0.02"></label>
    <label>Seitlich <output data-camera-output="shipX"></output><input data-camera-control="shipX" type="range" min="-3.2" max="3.2" step="0.02"></label>
    <label>Vor/Zurück <output data-camera-output="shipZ"></output><input data-camera-control="shipZ" type="range" min="-5.2" max="5.2" step="0.02"></label>
    <label>Richtung <output data-camera-output="shipYaw"></output><input data-camera-control="shipYaw" type="range" min="-180" max="180" step="1"></label>
    <div class="side-view-camera-hint">Ziehen dreht, Rad zoomt. Link aktualisiert sich.</div>
  `;
  document.body.appendChild(panel);

  const modeButtons = [...panel.querySelectorAll("[data-camera-mode]")];
  const fovInput = panel.querySelector('[data-camera-control="fov"]');
  const distanceInput = panel.querySelector('[data-camera-control="distance"]');
  const heightInput = panel.querySelector('[data-camera-control="height"]');
  const shipXInput = panel.querySelector('[data-camera-control="shipX"]');
  const shipZInput = panel.querySelector('[data-camera-control="shipZ"]');
  const shipYawInput = panel.querySelector('[data-camera-control="shipYaw"]');
  const outputs = {
    fov: panel.querySelector('[data-camera-output="fov"]'),
    distance: panel.querySelector('[data-camera-output="distance"]'),
    height: panel.querySelector('[data-camera-output="height"]'),
    shipX: panel.querySelector('[data-camera-output="shipX"]'),
    shipZ: panel.querySelector('[data-camera-output="shipZ"]'),
    shipYaw: panel.querySelector('[data-camera-output="shipYaw"]')
  };

  fovInput.value = debugOrbitFov.toFixed(2);
  distanceInput.value = debugOrbitRadius.toFixed(1);
  heightInput.value = debugOrbitTargetY.toFixed(2);
  shipXInput.value = debugShipCameraX.toFixed(2);
  shipZInput.value = debugShipCameraZ.toFixed(2);
  shipYawInput.value = debugShipCameraYaw.toFixed(0);

  const refresh = () => {
    debugOrbitFov = clamp(Number(fovInput.value), 0.28, 1.2);
    debugOrbitRadius = clamp(Number(distanceInput.value), -32, 32);
    debugOrbitTargetY = clamp(Number(heightInput.value), -0.2, 3.2);
    debugShipCameraX = clamp(Number(shipXInput.value), -3.2, 3.2);
    debugShipCameraZ = clamp(Number(shipZInput.value), -5.2, 5.2);
    debugShipCameraYaw = wrapDegrees(Number(shipYawInput.value));
    outputs.fov.textContent = debugOrbitFov.toFixed(2);
    outputs.distance.textContent = debugOrbitRadius.toFixed(1);
    outputs.height.textContent = debugOrbitTargetY.toFixed(2);
    outputs.shipX.textContent = debugShipCameraX.toFixed(2);
    outputs.shipZ.textContent = debugShipCameraZ.toFixed(2);
    outputs.shipYaw.textContent = `${debugShipCameraYaw.toFixed(0)}°`;
    document.body.dataset.sideViewFov = debugOrbitFov.toFixed(2);
    document.body.dataset.sideViewDistance = debugOrbitRadius.toFixed(1);
    document.body.dataset.sideViewHeight = debugOrbitTargetY.toFixed(2);
    document.body.dataset.sideViewMode = debugCameraMode;
    document.body.dataset.sideViewX = debugShipCameraX.toFixed(2);
    document.body.dataset.sideViewZ = debugShipCameraZ.toFixed(2);
    document.body.dataset.sideViewYaw = debugShipCameraYaw.toFixed(0);
    panel.dataset.cameraMode = debugCameraMode;
    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.cameraMode === debugCameraMode);
    });
    updateSideViewCameraUrl();
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      debugCameraMode = button.dataset.cameraMode === "ship" ? "ship" : "orbit";
      refresh();
      focusGameCanvas();
    });
  });

  [fovInput, distanceInput, heightInput, shipXInput, shipZInput, shipYawInput].forEach((input) => {
    input.addEventListener("input", refresh);
    input.addEventListener("pointerdown", (event) => event.stopPropagation());
    input.addEventListener("pointermove", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => event.stopPropagation());
  });
  refresh();
}

function updateSideViewCameraUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("viewMode", debugCameraMode);
  nextUrl.searchParams.set("viewFov", debugOrbitFov.toFixed(2));
  nextUrl.searchParams.set("viewDistance", debugOrbitRadius.toFixed(1));
  nextUrl.searchParams.set("viewHeight", debugOrbitTargetY.toFixed(2));
  nextUrl.searchParams.set("viewX", debugShipCameraX.toFixed(2));
  nextUrl.searchParams.set("viewZ", debugShipCameraZ.toFixed(2));
  nextUrl.searchParams.set("viewYaw", debugShipCameraYaw.toFixed(0));
  window.history.replaceState(null, "", nextUrl);
}

function updateSideViewCameraControls() {
  if (!sideViewSandboxMode) return;
  const distanceInput = document.querySelector('[data-camera-control="distance"]');
  const distanceOutput = document.querySelector('[data-camera-output="distance"]');
  const shipZInput = document.querySelector('[data-camera-control="shipZ"]');
  const shipZOutput = document.querySelector('[data-camera-output="shipZ"]');
  const shipYawInput = document.querySelector('[data-camera-control="shipYaw"]');
  const shipYawOutput = document.querySelector('[data-camera-output="shipYaw"]');
  if (distanceInput) distanceInput.value = debugOrbitRadius.toFixed(1);
  if (distanceOutput) distanceOutput.textContent = debugOrbitRadius.toFixed(1);
  if (shipZInput) shipZInput.value = debugShipCameraZ.toFixed(2);
  if (shipZOutput) shipZOutput.textContent = debugShipCameraZ.toFixed(2);
  if (shipYawInput) shipYawInput.value = debugShipCameraYaw.toFixed(0);
  if (shipYawOutput) shipYawOutput.textContent = `${debugShipCameraYaw.toFixed(0)}°`;
  document.body.dataset.sideViewDistance = debugOrbitRadius.toFixed(1);
  document.body.dataset.sideViewZ = debugShipCameraZ.toFixed(2);
  document.body.dataset.sideViewYaw = debugShipCameraYaw.toFixed(0);
}

function alignWeaponsForBridge(mode = "flat") {
  const airDefense = mode === "air-defense";
  weaponAlignTarget = {
    flakYaw: Math.PI,
    flakPitch: clamp(airDefense ? weaponAlignAirDefenseFlakPitch : weaponAlignFlatFlakPitch, flakMinPitch, flakMaxPitch),
    cannonYaw: 0,
    cannonPitch: clamp(airDefense ? weaponAlignAirDefenseCannonPitch : weaponAlignFlatCannonPitch, cannonMinPitch, cannonMaxPitch),
    mode: airDefense ? "air-defense" : "flat"
  };
  document.body.dataset.weaponAlign = weaponAlignTarget.mode;
}

function cancelWeaponAlignment() {
  if (!weaponAlignTarget) return;
  weaponAlignTarget = null;
  document.body.dataset.weaponAlign = "manual";
}

function updateWeaponAlignment(dt) {
  if (!weaponAlignTarget) return;
  flakYaw = moveAngleToward(flakYaw, weaponAlignTarget.flakYaw, weaponAlignYawSpeed * dt);
  flakPitch = moveValueToward(flakPitch, weaponAlignTarget.flakPitch, weaponAlignPitchSpeed * dt);
  cannonYaw = moveValueToward(cannonYaw, weaponAlignTarget.cannonYaw, weaponAlignYawSpeed * dt);
  cannonPitch = moveValueToward(cannonPitch, weaponAlignTarget.cannonPitch, weaponAlignPitchSpeed * dt);
  if (
    Math.abs(shortestAngleDelta(flakYaw, weaponAlignTarget.flakYaw)) < 0.002
    && Math.abs(flakPitch - weaponAlignTarget.flakPitch) < 0.002
    && Math.abs(cannonYaw - weaponAlignTarget.cannonYaw) < 0.002
    && Math.abs(cannonPitch - weaponAlignTarget.cannonPitch) < 0.002
  ) {
    weaponAlignTarget = null;
  }
}

function moveValueToward(value, target, maxStep) {
  if (Math.abs(target - value) <= maxStep) {
    return target;
  }
  return value + Math.sign(target - value) * maxStep;
}

function moveAngleToward(value, target, maxStep) {
  const delta = shortestAngleDelta(value, target);
  if (Math.abs(delta) <= maxStep) {
    return normalizeAngle(target);
  }
  return normalizeAngle(value + Math.sign(delta) * maxStep);
}

function shortestAngleDelta(from, to) {
  let delta = normalizeAngle(to) - normalizeAngle(from);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function updateBattleStationButtons() {
  bridgeViewButton?.classList.toggle("is-active", !flakViewActive && !cannonViewActive && !torpedoScopeActive);
  flakViewButton?.classList.toggle("is-active", flakViewActive);
  cannonViewButton?.classList.toggle("is-active", cannonViewActive);
  torpedoAidButton?.classList.toggle("is-active", torpedoScopeActive);
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
  const worldDeltas = collectWorldDeltaDiagnostics();
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

  maybeReportLargeWorldDelta(worldDeltas);
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

function collectWorldDeltaDiagnostics() {
  const ownShip = playerServerShipId ? serverShipsById.get(playerServerShipId) : null;
  const ownShipDelta = ownShip
    ? distance2D(boat.root.position, { x: ownShip.x, z: ownShip.z })
    : -1;
  const torpedoDelta = collectVisualDelta(torpedoSystem.serverVisuals);
  const bombDelta = collectVisualDelta(bombSystem.serverVisuals, true);
  const worst = [
    { kind: "ship", delta: ownShipDelta, id: ownShip?.id ?? "", visual: summarizeVector(boat.root.position), server: ownShip ? { x: round2(ownShip.x), y: round2(ownShip.y ?? 0), z: round2(ownShip.z) } : null },
    { kind: "torpedo", ...torpedoDelta },
    { kind: "bomb", ...bombDelta }
  ].filter((entry) => Number.isFinite(entry.delta) && entry.delta >= 0);

  return {
    ownShipDelta: round2(ownShipDelta),
    torpedoVisualMaxDelta: round2(torpedoDelta.delta),
    bombVisualMaxDelta: round2(bombDelta.delta),
    maxDelta: Math.max(0, ...worst.map((entry) => entry.delta)),
    summary: stringifyClientEventDetails({
      serverT: Number.isFinite(lastServerSnapshotTime) ? round2(lastServerSnapshotTime) : null,
      ship: worst.find((entry) => entry.kind === "ship") ?? null,
      torpedo: torpedoDelta,
      bomb: bombDelta
    })
  };
}

function collectVisualDelta(visuals, includeHeight = false) {
  let result = { id: "", delta: -1, visual: null, server: null };
  visuals?.forEach?.((visual, id) => {
    if (!visual?.root?.position || !visual?.serverPosition) return;
    const delta = includeHeight
      ? Vector3.Distance(visual.root.position, visual.serverPosition)
      : distance2D(visual.root.position, visual.serverPosition);
    if (!Number.isFinite(delta) || delta <= result.delta) return;
    result = {
      id: String(id),
      delta,
      visual: summarizeVector(visual.root.position),
      server: summarizeVector(visual.serverPosition)
    };
  });
  return {
    ...result,
    delta: round2(result.delta)
  };
}

function maybeReportLargeWorldDelta(worldDeltas) {
  if (!worldDeltas || !Number.isFinite(worldDeltas.maxDelta) || worldDeltas.maxDelta < 8) return;
  if (time < nextWorldDeltaEventTime) return;
  nextWorldDeltaEventTime = time + 10;
  sendClientGameEvent("world-delta", {
    ownShipDelta: worldDeltas.ownShipDelta,
    torpedoVisualMaxDelta: worldDeltas.torpedoVisualMaxDelta,
    bombVisualMaxDelta: worldDeltas.bombVisualMaxDelta,
    summary: worldDeltas.summary
  });
}

function round2(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : -1;
}

function sendClientGameEvent(event, details = {}) {
  const report = {
    playerId,
    teamId: playerTeamId,
    shipId: playerServerShipId ?? pendingPlayerServerShip?.id ?? "",
    event,
    clientTime: Number(time.toFixed(2)),
    x: Number(boat.root.position.x.toFixed(2)),
    z: Number(boat.root.position.z.toFixed(2)),
    heading: Number(heading.toFixed(4)),
    speed: Number(speed.toFixed(2)),
    damageState: playerDamageState,
    localTorpedoes: torpedoSystem.active.length,
    serverTorpedoes: readDatasetInt("serverTorpedoes"),
    serverTorpedoVisuals: readDatasetInt("serverTorpedoVisuals"),
    details: stringifyClientEventDetails(details)
  };
  const payload = JSON.stringify(report);
  const endpoint = getClientGameEventEndpoint();

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
    if (sent) return;
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true
  }).catch((error) => {
    document.body.dataset.clientEventLogError = error.message;
  });
}

function stringifyClientEventDetails(details) {
  try {
    return JSON.stringify(details).slice(0, 1200);
  } catch {
    return "{}";
  }
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
  if (directSideViewSandboxRequested) {
    return [];
  }
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
  return gameEndpoint("/game/debug/respawn-candidates");
}

async function loadGameState() {
  if (directSideViewSandboxRequested) {
    return createDirectSideViewSandboxState();
  }
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

function createDirectSideViewSandboxState() {
  return {
    sessionId: "side-view-sandbox",
    state: "running",
    t: 0,
    ships: [
      {
        id: "sandbox-player",
        teamId: "light",
        controlledBy: "player-BPB-sandbox",
        state: "active",
        x: 0,
        z: 0,
        heading: 0,
        speed: 0,
        engineOrder: 0,
        rudderDegrees: 0,
        torpedoesRemaining: 12,
        vehicleType: "torpedo-boat"
      }
    ],
    torpedoes: [],
    bombs: [],
    destroyedShipsByTeam: {},
    killsByPlayer: {}
  };
}

function failGameStateLoad(endpoint, message) {
  document.body.dataset.gameStateSource = "error";
  document.body.dataset.gameStateError = message;
  document.body.innerHTML = `<main class="startup-error"><h1>Game state unavailable</h1><p>${escapeHtml(message)}</p><small>${escapeHtml(endpoint)}</small></main>`;
  throw new Error(`${message}: ${endpoint}`);
}

function getGameStateEndpoint() {
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
  return gameEndpoint("/game/player-state");
}

function getFireTorpedoEndpoint() {
  return gameEndpoint("/game/fire-torpedo");
}

function getDropBombEndpoint() {
  return gameEndpoint("/game/drop-bomb");
}

function getFireFlakEndpoint() {
  return gameEndpoint("/game/fire-flak");
}

function getFireCannonEndpoint() {
  return gameEndpoint("/game/fire-cannon");
}

function getReportPlaneHitEndpoint() {
  return gameEndpoint("/game/report-plane-hit");
}

function getClientGameEventEndpoint() {
  return gameEndpoint("/game/client-event");
}

function getGameEventsEndpoint() {
  const safePlayerId = encodeURIComponent(playerId);
  return gameEndpoint(`/game/events/${safePlayerId}`);
}

async function requirePlayerLogin() {
  if (directSideViewSandboxRequested) {
    return {
      playerId: "player-BPB-sandbox",
      initials: "BPB",
      teamId: "light"
    };
  }

  const accountId = readStoredValue("accountId");
  if (!accountId.trim()) {
    return showClientLogin();
  }

  const response = await fetch(getPlayerSessionByAccountEndpoint(accountId), { cache: "no-store" });
  if (!response.ok) {
    localStorage.removeItem("seaBattlePlayerId");
    localStorage.removeItem("seaBattlePlayerInitials");
    localStorage.removeItem("seaBattlePlayerTeamId");
    return showClientLogin({ accountId });
  }

  const session = await response.json();
  const playerId = String(session.playerId ?? "");
  const initials = sanitizeInitials(session.initials);
  const teamId = sanitizeTeamId(session.teamId);
  if (playerId.startsWith(`player-${initials}-`) && initials && teamId) {
    return { playerId, initials, teamId };
  }

  return showClientLogin({ accountId });
}

function showClientLogin(prefill = {}) {
  document.body.classList.add("login-active");
  const screen = document.createElement("section");
  screen.className = "login-screen";
  screen.innerHTML = `
    <form class="login-card">
      <strong>Sea Battle</strong>
      <label>Name<input name="nickname" autocomplete="off" minlength="2" maxlength="40" required></label>
      <label>Kennung<input name="alias" autocomplete="off" autocapitalize="characters" maxlength="5" pattern="[A-Za-z0-9]{1,5}" required></label>
      <label>Flotte<select name="team" required><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <button type="submit">Einsteigen</button>
      <small data-login-error></small>
    </form>
  `;
  document.body.appendChild(screen);

  const form = screen.querySelector("form");
  const error = screen.querySelector("[data-login-error]");
  const accountId = String(prefill.accountId ?? readStoredValue("accountId") ?? "");
  form.elements.nickname.value = String(prefill.nickname ?? "").trim();
  form.elements.alias.value = String(prefill.alias ?? "").trim().toUpperCase();
  form.elements.team.value = sanitizeTeamId(prefill.team ?? readStoredValue("seaBattlePlayerTeamId")) || "light";

  return new Promise((resolve) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      const nickname = String(form.elements.nickname.value ?? "").trim();
      const alias = sanitizeInitials(form.elements.alias.value);
      const team = sanitizeTeamId(form.elements.team.value);
      if (!nickname || nickname.length < 2 || !alias || !team) {
        error.textContent = "Bitte Name, Kennung und Flotte setzen.";
        return;
      }

      try {
        const response = await fetch(gameEndpoint("/game/start"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            nickname,
            alias,
            team,
            vehicleType: "torpedo-boat"
          })
        });
        if (!response.ok) {
          throw new Error(`Login fehlgeschlagen (${response.status})`);
        }
        const payload = await response.json();
        const session = payload.player ?? payload;
        const nextAccountId = String(payload.accountId ?? accountId ?? "");
        const playerId = String(session.playerId ?? "");
        const initials = sanitizeInitials(session.initials ?? alias);
        const teamId = sanitizeTeamId(session.teamId ?? team);
        if (!playerId || !initials || !teamId) {
          throw new Error("Login-Antwort unvollständig");
        }
        localStorage.setItem("accountId", nextAccountId);
        localStorage.setItem("seaBattlePlayerId", playerId);
        localStorage.setItem("seaBattlePlayerInitials", initials);
        localStorage.setItem("seaBattlePlayerTeamId", teamId);
        localStorage.setItem("vehicleType", "torpedo-boat");
        document.body.classList.remove("login-active");
        screen.remove();
        resolve({ playerId, initials, teamId, freshLogin: true });
      } catch (caught) {
        error.textContent = caught?.message ?? "Login fehlgeschlagen";
      }
    });
  });
}

async function requireRegisteredGameSession(login) {
  if (directSideViewSandboxRequested) {
    return;
  }
  if (login?.freshLogin) {
    return;
  }
  const playerId = login?.playerId ?? login;
  const response = await fetch(getPlayerSessionEndpoint(playerId), { cache: "no-store" });
  if (response.ok) {
    return;
  }
  expireActiveLogin(`session-check-${response.status}`);
  await new Promise(() => {});
}

function getPlayerSessionEndpoint(playerId) {
  const safePlayerId = encodeURIComponent(playerId);
  return gameEndpoint(`/game/session/${safePlayerId}`);
}

function getPlayerSessionByAccountEndpoint(accountId) {
  const safeAccountId = encodeURIComponent(accountId);
  return gameEndpoint(`/game/session/account/${safeAccountId}`);
}

function gameEndpoint(path) {
  if (location.port === "5173" || location.port === "4173") {
    return path;
  }
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
  const choice = window.prompt(`Spezialmenue: 1 = ${debugLabel}, 2 = Spiel neu starten, 3 = ${markerLabel}, 8 = Seitenansicht Sandbox`, "1");
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
    return;
  }
  if (normalized === "8" || normalized === "side-view-sandbox" || normalized === "sandbox" || normalized === "seitenansicht") {
    requestHostGameReset("side-view-sandbox");
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

async function requestHostGameReset(forcedSetupId = null) {
  const adminKey = window.prompt("Host key");
  if (!adminKey) return;
  const setupId = forcedSetupId ?? promptGameSetupId();
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
  const choice = window.prompt("World: 1 = Dense land, 2 = Islands, 3 = Escort debug, 4 = Landmark tour, 5 = Dense land crowded, 6 = Dense land crowded reverse, 7 = Scout plane, 8 = Seitenansicht Sandbox", defaultChoice);
  if (choice === null) return null;
  const normalized = choice.trim().toLowerCase();
  if (normalized === "2" || normalized === "islands" || normalized === "island") return "islands";
  if (normalized === "3" || normalized === "escort-debug" || normalized === "escort") return "escort-debug";
  if (normalized === "4" || normalized === "landmark-tour" || normalized === "tour") return "landmark-tour";
  if (normalized === "5" || normalized === "fleet-clash" || normalized === "clash" || normalized === "crowded") return "dense-land-crowded";
  if (normalized === "6" || normalized === "fleet-clash-reverse" || normalized === "clash-reverse" || normalized === "crowded-reverse") return "dense-land-crowded-reverse";
  if (normalized === "7" || normalized === "scout-plane" || normalized === "plane" || normalized === "flugzeug" || normalized === "aufklaerer") return scoutPlaneSetupId;
  if (normalized === "8" || normalized === "side-view-sandbox" || normalized === "sandbox" || normalized === "seitenansicht") return "side-view-sandbox";
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

    const marker = createPlayerListMarker(ship);

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

    row.append(marker, initials, shipLabel, kills, bearing, sector);
    playerListRows.append(row);
  });

  document.body.dataset.humanPlayers = String(humanShips.length);
}

function createPlayerListMarker(ship) {
  const marker = createUnitMarker(ship.teamId, getShipVehicleType(ship));
  marker.classList.add("player-list-marker");
  return marker;
}

function updateKillFeedFromSnapshot(snapshot) {
  if (!killFeedRows || !snapshot) return;
  rememberKillFeedShipLabels(snapshot.ships);
  const candidates = [
    ...collectKillFeedImpacts(snapshot.torpedoImpacts, "torpedo", "Torpedo"),
    ...collectKillFeedImpacts(snapshot.bombImpacts, "bomb", "Bomben"),
    ...collectKillFeedImpacts(snapshot.flakHits, "flak", (impact) => isCannonServerProjectile(impact?.id) ? "Kanone" : "Flak", () => true),
    ...collectKillFeedImpacts(snapshot.ramHits, "ram", "Rammen", () => true)
  ].sort((left, right) => left.t - right.t);

  candidates.forEach((event) => {
    if (killFeedEventIds.has(event.key)) return;
    killFeedEventIds.add(event.key);
    event.number = nextKillFeedNumber;
    nextKillFeedNumber += 1;
    event.highlight = true;
    killFeedEvents.unshift(event);
  });

  if (killFeedEvents.length > killFeedLimit) {
    killFeedEvents = killFeedEvents.slice(0, killFeedLimit);
  }
  if (killFeedEventIds.size > 80) {
    killFeedEventIds = new Set(killFeedEvents.map((event) => event.key));
  }
  renderKillFeed();
}

function rememberKillFeedShipLabels(ships) {
  if (!Array.isArray(ships)) return;
  ships.forEach((ship) => {
    if (!ship?.id) return;
    const cached = killFeedShipLabels.get(ship.id);
    const controlledByHuman = isHumanController(ship.controlledBy);
    if (controlledByHuman || !cached) {
      killFeedShipLabels.set(ship.id, {
        controlledBy: ship.controlledBy,
        label: createShipDesignation(ship),
        teamId: ship.teamId,
        vehicleType: getShipVehicleType(ship),
        wasHuman: controlledByHuman
      });
    }
  });
  if (killFeedShipLabels.size > 120) {
    killFeedShipLabels = new Map(Array.from(killFeedShipLabels.entries()).slice(-90));
  }
}

function collectKillFeedImpacts(impacts, type, weaponLabel, isKill = (impact) => impact?.reason === "ship-hit") {
  if (!Array.isArray(impacts)) return [];
  return impacts
    .filter((impact) => impact?.id && impact?.shipId && impact?.targetShipId && isKill(impact))
    .map((impact) => {
      const sourceShip = serverShipsById.get(impact.shipId);
      const targetShip = serverShipsById.get(impact.targetShipId);
      const source = getKillFeedShipInfo(impact.shipId, sourceShip, impact.teamId);
      const target = getKillFeedShipInfo(impact.targetShipId, targetShip);
      return {
        key: `${type}:${impact.id}:${impact.targetShipId}:${impact.t}`,
        t: Number.isFinite(impact.t) ? impact.t : 0,
        weaponLabel: typeof weaponLabel === "function" ? weaponLabel(impact) : weaponLabel,
        sourceLabel: source.label,
        sourceTeamId: source.teamId,
        sourceVehicleType: source.vehicleType,
        targetLabel: target.label,
        targetTeamId: target.teamId,
        targetVehicleType: target.vehicleType
      };
    });
}

function isCannonServerProjectile(id) {
  return typeof id === "string" && id.startsWith("cannon-");
}

function getKillFeedShipLabel(shipId, ship = null, teamId = null) {
  return getKillFeedShipInfo(shipId, ship, teamId).label;
}

function getKillFeedShipInfo(shipId, ship = null, teamId = null) {
  const target = ship ?? serverShipsById.get(shipId);
  const cachedLabel = killFeedShipLabels.get(shipId);
  if (target && (isHumanController(target.controlledBy) || target.state === "active")) {
    return {
      label: createShipDesignation(target),
      teamId: target.teamId,
      vehicleType: getShipVehicleType(target)
    };
  }
  if (cachedLabel?.label) {
    return {
      label: cachedLabel.label,
      teamId: cachedLabel.teamId ?? target?.teamId ?? teamId,
      vehicleType: cachedLabel.vehicleType ?? getShipVehicleType(target)
    };
  }
  if (target) {
    return {
      label: createShipDesignation(target),
      teamId: target.teamId,
      vehicleType: getShipVehicleType(target)
    };
  }
  if (shipId) {
    const fallback = { id: shipId, teamId, controlledBy: "bot" };
    return {
      label: createShipDesignation(fallback),
      teamId,
      vehicleType: getShipVehicleType(fallback)
    };
  }
  return { label: "unbekannt", teamId, vehicleType: "torpedo-boat" };
}

function renderKillFeed() {
  if (!killFeedRows) return;
  killFeedRows.innerHTML = "";
  if (killFeedEvents.length === 0) {
    const empty = document.createElement("div");
    empty.className = "kill-feed-empty";
    empty.textContent = "Keine Abschüsse";
    killFeedRows.append(empty);
    document.body.dataset.killFeedEvents = "0";
    return;
  }

  killFeedEvents.forEach((event) => {
    const row = document.createElement("div");
    row.className = `kill-feed-row${event.highlight ? " is-new" : ""}`;

    const number = document.createElement("span");
    number.className = "kill-feed-number";
    number.textContent = `${event.number ?? ""}`;

    const text = document.createElement("div");
    text.className = "kill-feed-text";

    const victim = document.createElement("strong");
    victim.className = "kill-feed-party";
    victim.append(
      createKillFeedMarker(event.targetTeamId, event.targetVehicleType),
      document.createTextNode(event.targetLabel)
    );

    const detail = document.createElement("span");
    detail.className = "kill-feed-detail";
    detail.append(
      document.createTextNode(`durch ${event.weaponLabel} von `),
      createKillFeedMarker(event.sourceTeamId, event.sourceVehicleType),
      document.createTextNode(event.sourceLabel)
    );

    text.append(victim, detail);
    row.append(number, text);
    killFeedRows.append(row);
    event.highlight = false;
  });
  document.body.dataset.killFeedEvents = String(killFeedEvents.length);
}

function createKillFeedMarker(teamId, vehicleType) {
  const marker = createUnitMarker(teamId, vehicleType);
  marker.classList.add("kill-feed-marker");
  return marker;
}

function createUnitMarker(teamId, vehicleType) {
  const marker = document.createElement("i");
  const teamClass = getRelativeUnitMarkerTeamClass(teamId);
  marker.className = `unit-marker unit-marker-${teamClass} unit-marker-${vehicleType === "scout-plane" ? "plane" : "ship"}`;
  marker.setAttribute("aria-hidden", "true");
  return marker;
}

function getRelativeUnitMarkerTeamClass(teamId) {
  const normalizedTeamId = sanitizeTeamId(teamId);
  if (!normalizedTeamId) return "unknown";
  return normalizedTeamId === playerTeamId ? "friendly" : "enemy";
}

function isHumanController(controller) {
  return typeof controller === "string" && controller.length > 0 && controller !== "bot";
}

function getPlayerInitialsFromId(controller) {
  if (!isHumanController(controller)) return "BOT";
  const match = controller.match(/^player-([A-Z0-9]{1,5})-/i);
  return (match?.[1] ?? controller.slice(0, maxPlayerInitialsLength)).toUpperCase();
}

function getWeaponSourceLabel(shipId, sourceVehicleType = null, teamId = null) {
  const ship = serverShipsById.get(shipId) ?? enemyMotions.find((motion) => motion.id === shipId);
  if (isHumanController(ship?.controlledBy)) {
    return getPlayerInitialsFromId(ship.controlledBy);
  }
  if (shipId) {
    return createShipDesignation({
      id: shipId,
      teamId: ship?.teamId ?? teamId,
      controlledBy: ship?.controlledBy,
      vehicleType: sourceVehicleType ?? ship?.vehicleType
    });
  }
  if (ship?.label) return ship.label;
  return "unbekannt";
}

function createDestroyedByText(weaponLabel, shipId, sourceVehicleType = null, teamId = null) {
  return `Abgeschossen durch ${weaponLabel} von ${getWeaponSourceLabel(shipId, sourceVehicleType, teamId)}`;
}

function showDamageMessage(text, now = time, duration = 2.2) {
  flakHitAlertUntil = now + duration;
  if (flakHitAlert) {
    flakHitAlert.textContent = text;
  }
}

function notifyOwnWeaponImpact(impact, weaponLabel, notificationPrefix, sourceVehicleType = null) {
  const ownShipId = playerServerShipId ?? pendingPlayerServerShip?.id;
  if (!impact?.id || !ownShipId || impact.targetShipId !== ownShipId) return;
  const key = `${notificationPrefix}:${impact.id}:${impact.t}`;
  if (damageNotificationIds.has(key)) return;
  damageNotificationIds.add(key);
  if (damageNotificationIds.size > 80) {
    damageNotificationIds = new Set(Array.from(damageNotificationIds).slice(-48));
  }
  showDamageMessage(createDestroyedByText(weaponLabel, impact.shipId, sourceVehicleType, impact.teamId), time, 2.6);
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
  if (sideViewSandboxMode) return;
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
        verticalSpeed: scoutPlaneMode ? scoutPlaneVerticalSpeed : 0,
        turnVelocity,
        engineOrder,
        rudderDegrees: Math.round(rudderDegrees),
        flakYaw,
        flakPitch,
        cannonYaw,
        cannonPitch,
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
  const requestedTubeSide = torpedoSystem.nextTube === 0 ? -1 : 1;
  torpedoSystem.pendingOwnTubeSide = requestedTubeSide;
  const fireRequest = {
    playerId,
    teamId: playerTeamId,
    vehicleType: scoutPlaneMode ? "scout-plane" : "torpedo-boat",
    x: boat.root.position.x,
    z: boat.root.position.z,
    heading,
    speed,
    turnVelocity,
    engineOrder,
    rudderDegrees: Math.round(rudderDegrees),
    tubeSide: requestedTubeSide,
    clientTime: performance.now() / 1000
  };
  sendClientGameEvent("torpedo-fire-request", {
    request: summarizeFireRequest(fireRequest),
    playerServerShipId,
    pendingPlayerServerShipId: pendingPlayerServerShip?.id ?? "",
    serverClockOffset: Number.isFinite(serverClockOffset) ? Number(serverClockOffset.toFixed(3)) : null,
    serverClockReset: document.body.dataset.serverClockReset ?? ""
  });
  try {
    const response = await fetch(getFireTorpedoEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fireRequest)
    });
    if (!response.ok) {
      if (response.status === 403) {
        torpedoSystem.pendingOwnTubeSide = null;
        expireActiveLogin("fire-torpedo-403");
        return;
      }
      throw new Error(`Fire torpedo request failed with ${response.status}`);
    }
    const snapshot = await response.json();
    applyServerGameSnapshot(snapshot);
    if (torpedoSystem.pendingOwnTubeSide === requestedTubeSide) {
      torpedoSystem.pendingOwnTubeSide = null;
    }
    sendClientGameEvent("torpedo-fire-response", {
      status: response.status,
      snapshotT: Number.isFinite(snapshot?.t) ? Number(snapshot.t.toFixed(2)) : null,
      torpedoes: Array.isArray(snapshot?.torpedoes) ? snapshot.torpedoes.length : -1,
      ownShip: summarizeShip(snapshot?.ships?.find((ship) => ship.controlledBy === playerId && ship.teamId === playerTeamId))
    });
    document.body.dataset.fireTorpedoSync = "ok";
  } catch (error) {
    torpedoSystem.pendingOwnTubeSide = null;
    document.body.dataset.fireTorpedoSync = "error";
    document.body.dataset.fireTorpedoSyncError = error.message;
    sendClientGameEvent("torpedo-fire-error", { message: error.message });
  } finally {
    finishHttpRequest("fireTorpedo", requestStartedAt);
    fireTorpedoRequestInFlight = false;
  }
}

function summarizeFireRequest(request) {
  return {
    x: Number(request.x.toFixed(2)),
    z: Number(request.z.toFixed(2)),
    heading: Number(request.heading.toFixed(4)),
    speed: Number(request.speed.toFixed(2)),
    turnVelocity: Number(request.turnVelocity.toFixed(4)),
    engineOrder: request.engineOrder,
    rudderDegrees: request.rudderDegrees,
    tubeSide: request.tubeSide,
    clientTime: Number(request.clientTime.toFixed(3))
  };
}

function summarizeShip(ship) {
  if (!ship) return null;
  return {
    id: ship.id ?? "",
    state: ship.state ?? "",
    x: Number.isFinite(ship.x) ? Number(ship.x.toFixed(2)) : null,
    z: Number.isFinite(ship.z) ? Number(ship.z.toFixed(2)) : null,
    heading: Number.isFinite(ship.heading) ? Number(ship.heading.toFixed(4)) : null,
    speed: Number.isFinite(ship.speed) ? Number(ship.speed.toFixed(2)) : null,
    torpedoesRemaining: Number.isFinite(ship.torpedoesRemaining) ? ship.torpedoesRemaining : null
  };
}

async function requestPlayerBombDrop() {
  if (dropBombRequestInFlight || playerDamageState !== "active") return;
  if (!scoutPlaneMode) return;

  const preview = getBombDropPreview();
  bombBayImpactFocus = {
    position: preview.centerImpact.clone(),
    expiresAt: time + preview.fallSeconds + bombReleaseIntervalSeconds * (bombsPerDrop - 1) + bombBayImpactFocusExtraSeconds
  };

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
        turnVelocity,
        verticalSpeed: scoutPlaneVerticalSpeed,
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
  if (sideViewSandboxMode) {
    document.body.dataset.playerStateSync = "sandbox-local";
    return;
  }
  const snapshotClientTime = getSnapshotClientTime(snapshot);
  serverShipsById = indexShipsById(snapshot.ships);
  updateFleetStatus(snapshot.ships, snapshot.destroyedShipsByTeam);
  updatePlayerList(snapshot.ships, snapshot.killsByPlayer);
  updateKillFeedFromSnapshot(snapshot);

  const ownShip = snapshot.ships.find((ship) => ship.controlledBy === playerId && ship.teamId === playerTeamId);
  const previousOwnShip = snapshot.ships.find((ship) => ship.id === playerServerShipId);
  const activeIds = new Set(snapshot.ships.map((ship) => ship.id));
  if (ownShip) {
    const assignedShipChanged = playerServerShipId !== ownShip.id;
    if (assignedShipChanged && playerServerSnapshotReceived && playerServerShipId) {
      sendClientGameEvent("player-ship-change-pending", {
        previousShipId: playerServerShipId,
        nextShip: summarizeShip(ownShip),
        damageStateBefore: playerDamageState
      });
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
        sendClientGameEvent("player-ship-assigned", {
          assignedShipChanged,
          ship: summarizeShip(ownShip)
        });
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
    sendClientGameEvent("player-ship-missing-start-sinking", {
      previousOwnShip: summarizeShip(previousOwnShip),
      playerServerShipId
    });
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
    time,
    snapshot.t
  );
  radarTorpedoSnapshots = Array.isArray(snapshot.torpedoes) ? snapshot.torpedoes : [];
  syncServerBombs(
    Array.isArray(snapshot.bombs) ? snapshot.bombs : [],
    Array.isArray(snapshot.bombImpacts) ? snapshot.bombImpacts : [],
    snapshotClientTime
  );
  syncServerFlakProjectiles(
    Array.isArray(snapshot.flakProjectiles) ? snapshot.flakProjectiles : [],
    snapshotClientTime
  );
  syncServerFlakImpacts(Array.isArray(snapshot.flakImpacts) ? snapshot.flakImpacts : []);
  syncServerFlakHitEffects(Array.isArray(snapshot.flakHits) ? snapshot.flakHits : [], ownShip);
  syncServerOwnFlakHits(Array.isArray(snapshot.flakHits) ? snapshot.flakHits : [], ownShip);
  document.body.dataset.remoteShips = String(snapshot.ships.length);
  document.body.dataset.serverTorpedoes = String(Array.isArray(snapshot.torpedoes) ? snapshot.torpedoes.length : 0);
  document.body.dataset.serverBombs = String(Array.isArray(snapshot.bombs) ? snapshot.bombs.length : 0);
  document.body.dataset.serverFlakProjectiles = String(Array.isArray(snapshot.flakProjectiles) ? snapshot.flakProjectiles.length : 0);
  document.body.dataset.serverFlakImpacts = String(Array.isArray(snapshot.flakImpacts) ? snapshot.flakImpacts.length : 0);
  document.body.dataset.playerStateSync = "ok";
}

function syncServerFlakImpacts(impacts) {
  if (!Array.isArray(impacts)) return;
  impacts.forEach((impact) => {
    const key = `${impact.id}:${impact.reason}:${impact.t}`;
    if (flakSystem.impactEffectIds.has(key)) return;
    flakSystem.impactEffectIds.add(key);
    if (impact.reason === "ship-critical-hit") {
      const cannonImpact = isCannonServerProjectile(impact.id);
      notifyOwnWeaponImpact(impact, cannonImpact ? "Kanone" : "Flak", cannonImpact ? "cannon" : "flak");
    }
    const position = new Vector3(
      Number.isFinite(impact.x) ? impact.x : 0,
      Number.isFinite(impact.y) ? impact.y : 0,
      Number.isFinite(impact.z) ? impact.z : 0
    );
    if (impact.reason === "land-hit" || impact.reason === "ship-hit" || impact.reason === "ship-critical-hit") {
      createFlakLandImpactEffect(flakSystem, position);
    } else if (isCannonServerProjectile(impact.id)) {
      createCannonWaterImpactEffect(flakSystem, position);
    } else {
      createFlakWaterImpactEffect(flakSystem, position);
    }
  });
  if (flakSystem.impactEffectIds.size > 120) {
    flakSystem.impactEffectIds = new Set(Array.from(flakSystem.impactEffectIds).slice(-80));
  }
}

function syncServerFlakHitEffects(hits, ownShip = null) {
  if (!Array.isArray(hits)) return;
  const ownShipId = ownShip?.id ?? playerServerShipId ?? pendingPlayerServerShip?.id;
  hits.forEach((hit) => {
    if (!hit?.id || flakSystem.hitEffectIds.has(hit.id)) return;
    if (scoutPlaneMode && ownShipId && hit.targetShipId === ownShipId) return;
    flakSystem.hitEffectIds.add(hit.id);
    if (flakSystem.hitEffectIds.size > 80) {
      flakSystem.hitEffectIds = new Set(Array.from(flakSystem.hitEffectIds).slice(-48));
    }
    const targetMotion = enemyMotions.find((motion) => motion.id === hit.targetShipId);
    if (isScoutPlaneMotion(targetMotion)) {
      if (targetMotion.state !== "air-hit") {
        beginEnemyScoutPlaneAirHit(targetMotion, hit, time);
      }
      return;
    }
    createScoutPlaneHitSequence(flakSystem, getFlakHitPosition(hit));
  });
}

function getFlakHitPosition(hit) {
  return new Vector3(
    Number.isFinite(hit?.x) ? hit.x : boat.root.position.x,
    Number.isFinite(hit?.y) ? hit.y : boat.root.position.y,
    Number.isFinite(hit?.z) ? hit.z : boat.root.position.z
  );
}

function syncServerOwnFlakHits(hits, ownShip = null) {
  if (!scoutPlaneMode || !Array.isArray(hits)) return;
  const ownShipId = ownShip?.id ?? playerServerShipId ?? pendingPlayerServerShip?.id;
  if (!ownShipId) return;
  if (playerDamageState !== "active") return;

  const ownHit = hits
    .filter((hit) => hit?.targetShipId === ownShipId)
    .sort((left, right) => (Number(right.t) || 0) - (Number(left.t) || 0))[0];
  if (!ownHit || ownHit.id === lastFlakHitId) return;

  lastFlakHitId = ownHit.id;
  playerHits += 1;
  document.body.dataset.playerFlakHit = ownHit.id;
  document.body.dataset.playerFlakHitAt = String(ownHit.t ?? "");
  beginScoutPlaneFlakHit(ownHit, time);
}

function updateFlakHitAlert(now) {
  if (!flakHitAlert) return;
  flakHitAlert.classList.toggle("is-visible", now < flakHitAlertUntil);
}

function updatePlaneHitFlash(now) {
  if (!planeHitFlash) return;
  if (now >= planeHitFlashUntil) {
    planeHitFlash.style.setProperty("--plane-hit-flash-opacity", "0");
    return;
  }
  const duration = Math.max(0.001, planeHitFlashUntil - planeHitFlashStart);
  const t = clamp((now - planeHitFlashStart) / duration, 0, 1);
  const pulse = t < 0.18 ? 1 : Math.max(0, 1 - (t - 0.18) / 0.82);
  planeHitFlash.style.setProperty("--plane-hit-flash-opacity", (0.82 * pulse).toFixed(3));
}

function getSnapshotClientTime(snapshot) {
  if (!Number.isFinite(snapshot?.t)) return time;

  const observedOffset = time - snapshot.t;
  const serverTimeReset = Number.isFinite(lastServerSnapshotTime) && snapshot.t + 2 < lastServerSnapshotTime;
  serverClockOffset = serverClockOffset === null || serverTimeReset
    ? observedOffset
    : Math.min(serverClockOffset, observedOffset);
  lastServerSnapshotTime = snapshot.t;
  document.body.dataset.serverClockOffset = serverClockOffset.toFixed(3);
  document.body.dataset.serverClockReset = serverTimeReset ? "1" : "0";
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
  const previousHeading = heading;
  heading = correctedHeading;
  holdWeaponWorldHeading(previousHeading, heading);
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
  applyRemoteWeaponAim(motion, ship);
  enemyMotions.push(motion);
  return motion;
}

function disposeRemoteMotion(motion) {
  motion.timers?.forEach((timer) => window.clearTimeout(timer));
  motion.root?.getChildMeshes?.().forEach((mesh) => mesh.dispose());
  motion.root?.dispose?.();
}

function applyServerShipSnapshot(motion, ship) {
  if (motion.state === "air-hit") return;
  if (motion.state === "sinking") return;

  if (ship.state === "sunk") {
    if (isScoutPlaneMotion(motion)) {
      motion.serverState = "sunk";
      motion.root.setEnabled(false);
      motion.state = "sunk";
      return;
    }
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
  motion.serverTurnVelocity = Number.isFinite(ship.turnVelocity) ? ship.turnVelocity : motion.serverTurnVelocity;
  motion.serverSnapshotTime = time;
  applyRemoteWeaponAim(motion, ship);
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

function applyRemoteWeaponAim(motion, ship) {
  if (!motion || isScoutPlaneMotion(motion)) return;
  motion.flakYaw = Number.isFinite(ship.flakYaw) ? ship.flakYaw : (motion.flakYaw ?? 0);
  motion.flakPitch = Number.isFinite(ship.flakPitch) ? ship.flakPitch : (motion.flakPitch ?? 0);
  motion.cannonYaw = Number.isFinite(ship.cannonYaw) ? ship.cannonYaw : (motion.cannonYaw ?? 0);
  motion.cannonPitch = Number.isFinite(ship.cannonPitch) ? ship.cannonPitch : (motion.cannonPitch ?? 0);

  if (motion.boat?.sternFlak?.mount) {
    motion.boat.sternFlak.mount.rotation.y = motion.flakYaw;
  }
  if (motion.boat?.sternFlak?.elevationRoot) {
    motion.boat.sternFlak.elevationRoot.rotation.x = -motion.flakPitch;
  }
  if (motion.boat?.bowCannon?.mount) {
    motion.boat.bowCannon.mount.rotation.y = motion.cannonYaw;
  }
  if (motion.boat?.bowCannon?.elevationRoot) {
    motion.boat.bowCannon.elevationRoot.rotation.x = -motion.cannonPitch;
  }
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

function updateWeaponElevationGauge(indicator, valueElement, pitch, minPitch, maxPitch) {
  const ratio = clamp((pitch - minPitch) / Math.max(0.001, maxPitch - minPitch), 0, 1);
  indicator?.style.setProperty("--weapon-elevation-ratio", String(ratio));

  if (valueElement) {
    valueElement.textContent = `${Math.round(Math.max(0, pitch) * 180 / Math.PI)}°`;
  }
}

function updateNavigationInstruments(mapCanvas, radarCanvas, radarStatus, playerPosition, radarContacts, landZones, heading, radarHeading = heading, options = {}) {
  if (!flakViewActive && !cannonViewActive && !bombBayViewActive) {
    drawMapInstrument(mapCanvas, playerPosition, landZones, mapZoom, heading);
  }
  updateAutomaticRadarMode(radarContacts, playerPosition);
  const radarRange = getSelectedRadarRange();
  drawRadarInstrument(radarCanvas, radarStatus, playerPosition, radarContacts, landZones, radarHeading, radarRange, {
    flakLookHeading: options.flakLookHeading,
    targetMode: !scoutPlaneMode && (radarMode === "target" || flakViewActive || cannonViewActive || torpedoScopeActive),
    targetLineMode: flakViewActive ? "flak" : (cannonViewActive ? "cannon" : "torpedo"),
    radarTorpedoes: radarMode === "target" && !scoutPlaneMode ? radarTorpedoSnapshots : []
  });
  document.body.dataset.radarHeading = String(Math.round(normalizeAngle(radarHeading) * 180 / Math.PI));
}

function updateAutomaticRadarMode(radarContacts, playerPosition) {
  if (scoutPlaneMode) {
    radarModeOverride = null;
    radarModeOverrideUntil = 0;
    setEffectiveRadarMode("radar");
    return;
  }

  if (radarModeOverride && performance.now() < radarModeOverrideUntil) {
    setEffectiveRadarMode(radarModeOverride);
    return;
  }
  const hadRadarOverride = Boolean(radarModeOverride);
  radarModeOverride = null;
  radarModeOverrideUntil = 0;

  const targetRange = getRadarRangeForMode("target");
  const enemyInTargetRange = radarContacts.some((contact) => (
    contact?.position &&
    contact.teamId !== playerTeamId &&
    distance2D(playerPosition, contact.position) <= targetRange
  ));
  setEffectiveRadarMode(enemyInTargetRange ? "target" : "radar", hadRadarOverride);
}

function drawMapInstrument(canvas, playerPosition, landZones, zoomControl, heading) {
  if (!canvas) return;

  const ctx = prepareInstrumentCanvas(canvas);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!ctx || width < 2 || height < 2) return;
  const zoomIndex = clamp(Number(zoomControl?.value ?? 1), 0, mapZoomScales.length - 1);
  const zoomScale = mapZoomScales[zoomIndex];
  const bounds = getCenteredMapBounds(playerPosition, zoomScale);
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
  drawMapUnitMarker(ctx, playerPoint.x, playerPoint.y, {
    teamId: playerTeamId,
    controlledBy: playerId,
    vehicleType: scoutPlaneMode ? "scout-plane" : "torpedo-boat"
  }, heading);

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
    drawMapUnitMarker(ctx, point.x, point.y, ship, Number.isFinite(ship.heading) ? ship.heading : 0);
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
  const targetMode = options.targetMode === true;
  const scale = radius / radarRange;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(2, 22, 28, 0.86)";
  ctx.fillRect(0, 0, width, height);

  drawRadarRangeRings(ctx, centerX, centerY, radius);
  drawRadarLandUnion(ctx, landZones, playerPosition, centerX, centerY, scale, heading, width, height);

  const contacts = radarContacts
    .map((contact) => ({
      ...contact,
      distance: Number.isFinite(contact.distance) ? contact.distance : distance2D(playerPosition, contact.position),
      blocked: false
    }))
    .filter((contact) => contact.distance <= radarRange);
  const visibleContacts = contacts.filter((contact) => !contact.blocked);
  visibleContacts.forEach((contact) => {
    const contactPoint = worldToRadarPoint(contact.position, playerPosition, centerX, centerY, scale, heading);
    drawRadarContactMarker(ctx, contactPoint.x, contactPoint.y, contact.team, false, contact.heading, heading, contact.label, contact.vehicleType);
  });

  if (targetMode) {
    drawRadarTorpedoes(
      ctx,
      centerX,
      centerY,
      playerPosition,
      options.radarTorpedoes,
      heading,
      radarRange,
      scale
    );
  }

  if (targetMode) {
    drawRadarTargetLine(
      ctx,
      centerX,
      centerY,
      radius,
      playerPosition,
      visibleContacts,
      heading,
      radarRange,
      scale,
      options.targetLineMode === "torpedo" ? heading : options.flakLookHeading,
      options.targetLineMode ?? "torpedo"
    );
  }

  const nearestVisible = visibleContacts.reduce((nearest, contact) => (
    !nearest || contact.distance < nearest.distance ? contact : nearest
  ), null);
  if (nearestVisible) {
    const suffix = visibleContacts.length > 1 ? ` x${visibleContacts.length}` : "";
    const label = nearestVisible.team === "light" ? "Own" : "Enemy";
    if (statusElement) statusElement.textContent = `${label} ${formatWorldDistance(nearestVisible.distance)}${suffix}`;
  } else {
    if (statusElement) statusElement.textContent = `Clear ${formatWorldDistance(radarRange)}`;
  }

  drawRadarContactMarker(ctx, centerX, centerY, "light", true);
  drawRadarOwnHeadingMarker(ctx, centerX, centerY);
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

function drawMapUnitMarker(ctx, x, y, ship, markerHeading) {
  const color = mapShipColor(ship);
  if (getShipVehicleType(ship) === "scout-plane") {
    drawRadarPlaneMarker(ctx, x, y, color, markerHeading);
  } else {
    drawRadarShipMarker(ctx, x, y, color, markerHeading);
  }
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

function drawRadarContactMarker(ctx, x, y, team, isPlayer = false, contactHeading = null, radarHeading = 0, label = "", vehicleType = "torpedo-boat") {
  const color = team === "light" ? "#7fd7ff" : "#ff6b4a";
  const ring = team === "light" ? "rgba(127, 215, 255, 0.42)" : "rgba(255, 107, 74, 0.48)";
  const radius = isPlayer ? 4.2 : 4;

  if (!isPlayer && Number.isFinite(contactHeading)) {
    const relativeHeading = contactHeading - radarHeading;
    if (vehicleType === "scout-plane") {
      drawRadarPlaneMarker(ctx, x, y, color, relativeHeading);
    } else {
      drawRadarShipMarker(ctx, x, y, color, relativeHeading);
    }
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

function drawRadarFlakLookIndicator(ctx, centerX, centerY, radius, flakLookHeading, radarHeading) {
  if (!Number.isFinite(flakLookHeading) || !Number.isFinite(radarHeading)) return;
  const relative = normalizeAngle(flakLookHeading - radarHeading);
  const inner = radius * 0.17;
  const outer = radius * 0.9;

  ctx.save();
  ctx.strokeStyle = "rgba(155, 229, 223, 0.62)";
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(centerX + Math.sin(relative) * inner, centerY - Math.cos(relative) * inner);
  ctx.lineTo(centerX + Math.sin(relative) * outer, centerY - Math.cos(relative) * outer);
  ctx.stroke();
  ctx.restore();
}

function drawRadarTorpedoes(ctx, centerX, centerY, playerPosition, torpedoes, radarHeading, radarRange, scale) {
  if (!Array.isArray(torpedoes) || torpedoes.length === 0) return;

  let visible = 0;
  for (const torpedo of torpedoes) {
    if (visible >= 16) break;
    if (!torpedo || torpedo.state !== "running") continue;
    if (!Number.isFinite(torpedo.x) || !Number.isFinite(torpedo.z)) continue;

    const position = { x: torpedo.x, z: torpedo.z };
    const distance = distance2D(playerPosition, position);
    if (distance > radarRange) continue;

    const point = worldToRadarPoint(position, playerPosition, centerX, centerY, scale, radarHeading);
    drawRadarTorpedoMarker(ctx, point.x, point.y, Number.isFinite(torpedo.heading) ? torpedo.heading : 0, radarHeading);
    visible += 1;
  }
}

function drawRadarTorpedoMarker(ctx, x, y, heading, radarHeading) {
  const relativeHeading = normalizeAngle(heading - radarHeading);
  const length = 2.4;
  const halfLength = length * 0.5;
  const dx = Math.sin(relativeHeading) * halfLength;
  const dy = -Math.cos(relativeHeading) * halfLength;

  ctx.save();
  ctx.strokeStyle = "rgba(235, 245, 244, 0.82)";
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - dx, y - dy);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.restore();
}

function drawRadarTargetLine(ctx, centerX, centerY, radius, playerPosition, visibleContacts, radarHeading, radarRange, scale, firingHeading, mode) {
  if (!Number.isFinite(firingHeading)) return;

  const relative = normalizeAngle(firingHeading - radarHeading);
  const obstruction = mode === "torpedo"
    ? findRadarTargetLineObstruction(playerPosition, firingHeading, visibleContacts, radarRange)
    : null;
  const endpointDistance = obstruction ? obstruction.distance : radarRange;
  const inner = radius * 0.12;
  const outer = clamp(endpointDistance * scale, inner, radius * 0.92);
  const endX = centerX + Math.sin(relative) * outer;
  const endY = centerY - Math.cos(relative) * outer;

  ctx.save();
  ctx.strokeStyle = obstruction ? "rgba(255, 239, 164, 0.58)" : "rgba(155, 229, 223, 0.42)";
  ctx.lineWidth = 1.0;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(centerX + Math.sin(relative) * inner, centerY - Math.cos(relative) * inner);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();
}

function findRadarTargetLineObstruction(playerPosition, firingHeading, contacts, radarRange) {
  let best = null;
  const forward = { x: Math.sin(firingHeading), z: Math.cos(firingHeading) };
  for (const contact of contacts) {
    if (!contact || contact.vehicleType === "scout-plane") continue;
    if (!Number.isFinite(contact.position?.x) || !Number.isFinite(contact.position?.z)) continue;
    const dx = contact.position.x - playerPosition.x;
    const dz = contact.position.z - playerPosition.z;
    const along = dx * forward.x + dz * forward.z;
    if (along <= 0 || along > radarRange) continue;
    const cross = Math.abs(dx * forward.z - dz * forward.x);
    if (cross > 10.5) continue;

    const start = Math.max(0, along - 12);
    const end = Math.min(radarRange, along + 12);
    for (let distance = start; distance <= end; distance += 1.0) {
      const point = {
        x: playerPosition.x + forward.x * distance,
        z: playerPosition.z + forward.z * distance
      };
      if (pointHitsRadarShipHull(point, contact)) {
        if (!best || distance < best.distance) {
          best = { distance, contact };
        }
        break;
      }
    }
  }
  return best;
}

function pointHitsRadarShipHull(point, contact) {
  const heading = Number.isFinite(contact.heading) ? contact.heading : 0;
  const local = getEnemyHitLocalPoint(point, contact.position, heading);
  if (!isForwardInsideTorpedoBoatHull(local.forward, 0.35)) return false;
  return Math.abs(local.right) <= getTorpedoBoatHullTopHalfWidthAt(local.forward) + 0.35;
}

function drawRadarOwnHeadingMarker(ctx, centerX, centerY) {
  ctx.save();
  ctx.fillStyle = "rgba(247, 251, 255, 0.94)";
  ctx.strokeStyle = "rgba(2, 16, 21, 0.86)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 9);
  ctx.lineTo(centerX + 4.2, centerY + 5.8);
  ctx.lineTo(centerX, centerY + 3.2);
  ctx.lineTo(centerX - 4.2, centerY + 5.8);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function drawRadarShipMarker(ctx, x, y, color, relativeHeading) {
  const toPoint = createRadarMarkerPointMapper(x, y, relativeHeading);
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(2, 16, 21, 0.86)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  moveToRadarMarkerPoint(ctx, toPoint, 0, 7.2);
  lineToRadarMarkerPoint(ctx, toPoint, 2.5, 2.2);
  lineToRadarMarkerPoint(ctx, toPoint, 2.3, -5.0);
  lineToRadarMarkerPoint(ctx, toPoint, 0, -4.2);
  lineToRadarMarkerPoint(ctx, toPoint, -2.3, -5.0);
  lineToRadarMarkerPoint(ctx, toPoint, -2.5, 2.2);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

function drawRadarPlaneMarker(ctx, x, y, color, relativeHeading) {
  const toPoint = createRadarMarkerPointMapper(x, y, relativeHeading);
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(2, 16, 21, 0.86)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  moveToRadarMarkerPoint(ctx, toPoint, 0, 7.5);
  lineToRadarMarkerPoint(ctx, toPoint, 1.3, 1.2);
  lineToRadarMarkerPoint(ctx, toPoint, 6.3, -0.7);
  lineToRadarMarkerPoint(ctx, toPoint, 1.1, -1.9);
  lineToRadarMarkerPoint(ctx, toPoint, 0.9, -5.0);
  lineToRadarMarkerPoint(ctx, toPoint, 3.0, -6.1);
  lineToRadarMarkerPoint(ctx, toPoint, 0, -5.7);
  lineToRadarMarkerPoint(ctx, toPoint, -3.0, -6.1);
  lineToRadarMarkerPoint(ctx, toPoint, -0.9, -5.0);
  lineToRadarMarkerPoint(ctx, toPoint, -1.1, -1.9);
  lineToRadarMarkerPoint(ctx, toPoint, -6.3, -0.7);
  lineToRadarMarkerPoint(ctx, toPoint, -1.3, 1.2);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

function createRadarMarkerPointMapper(x, y, relativeHeading) {
  const forwardX = Math.sin(relativeHeading);
  const forwardY = -Math.cos(relativeHeading);
  const rightX = Math.cos(relativeHeading);
  const rightY = Math.sin(relativeHeading);
  return (side, forward) => ({
    x: x + rightX * side + forwardX * forward,
    y: y + rightY * side + forwardY * forward
  });
}

function moveToRadarMarkerPoint(ctx, toPoint, side, forward) {
  const point = toPoint(side, forward);
  ctx.moveTo(point.x, point.y);
}

function lineToRadarMarkerPoint(ctx, toPoint, side, forward) {
  const point = toPoint(side, forward);
  ctx.lineTo(point.x, point.y);
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

function getCenteredMapBounds(position, zoomScale = 1) {
  const size = mapTileSize * zoomScale;

  return {
    minX: position.x - size * 0.5,
    maxX: position.x + size * 0.5,
    minZ: position.z - size * 0.5,
    maxZ: position.z + size * 0.5
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
  const prefix = getShipVehicleType(ship) === "scout-plane" ? "F" : "S";
  return `${prefix} ${base + number}`;
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
  const spreadShot = createSpreadFlakShot(shot, flakSystem.nextId);
  createFlakProjectile(flakSystem, spreadShot.position, spreadShot.velocity, spreadShot.direction);
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
    const motion = createEnemyMotion(enemyBoat, heading, engineOrder, index, ship);
    applyRemoteWeaponAim(motion, ship);
    return motion;
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
    propellerRoots: vehicle.propellerRoots,
    shadow: vehicle.shadow,
    flakYaw: Number.isFinite(serverShip?.flakYaw) ? serverShip.flakYaw : 0,
    flakPitch: Number.isFinite(serverShip?.flakPitch) ? serverShip.flakPitch : 0,
    cannonYaw: Number.isFinite(serverShip?.cannonYaw) ? serverShip.cannonYaw : 0,
    cannonPitch: Number.isFinite(serverShip?.cannonPitch) ? serverShip.cannonPitch : 0,
    heading,
    speed: serverShip?.speed ?? 0,
    isServerControlled: Boolean(serverShip),
    boat: vehicle,
    serverPosition: new Vector3(serverShip?.x ?? root.position.x, remoteVehicleY(serverShip), serverShip?.z ?? root.position.z),
    serverHeading: Number.isFinite(serverShip?.heading) ? serverShip.heading : heading,
    serverSpeed: Number.isFinite(serverShip?.speed) ? serverShip.speed : 0,
    serverTurnVelocity: Number.isFinite(serverShip?.turnVelocity) ? serverShip.turnVelocity : 0,
    serverSnapshotTime: 0,
    turnVelocity: 0,
    visualBank: 0,
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

  if (motion.state === "air-hit") {
    updateEnemyScoutPlaneAirHit(motion, dt, time);
    return;
  }

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
  motion.turnVelocity += ((motion.serverTurnVelocity ?? 0) - motion.turnVelocity) * Math.min(1, dt * 3.6);

  const forward = new Vector3(Math.sin(motion.heading), 0, Math.cos(motion.heading));
  motion.root.position.addInPlace(forward.scale(motion.speed * dt));

  const correctionStrength = correctionDistance > 18 ? 4.2 : 1.8;
  motion.root.position.x += (projectedServerPosition.x - motion.root.position.x) * Math.min(1, dt * correctionStrength);
  motion.root.position.y += (motion.serverPosition.y - motion.root.position.y) * Math.min(1, dt * 2.6);
  motion.root.position.z += (projectedServerPosition.z - motion.root.position.z) * Math.min(1, dt * correctionStrength);
  if (isScoutPlaneMotion(motion)) {
    const targetBank = clamp(-motion.turnVelocity * 2.35, -0.72, 0.72);
    motion.visualBank += (targetBank - motion.visualBank) * Math.min(1, dt * 4.2);
    motion.root.rotationQuaternion = Quaternion.FromEulerAngles(
      0,
      motion.heading,
      motion.visualBank
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

function beginEnemyScoutPlaneAirHit(motion, hit, now) {
  motion.state = "air-hit";
  motion.airHitStartTime = now;
  motion.airHitExploded = false;
  motion.nextAirHitSmokeTime = now;
  motion.airHitHeading = motion.heading;
  motion.airHitSpeed = Math.max(7.5, Math.abs(motion.speed) || motion.serverSpeed || scoutPlaneCruiseSpeed);
  motion.root.setEnabled(true);
  createScoutPlaneHitSequence(flakSystem, getFlakHitPosition(hit));
}

function updateEnemyScoutPlaneAirHit(motion, dt, now) {
  const age = now - (motion.airHitStartTime ?? now);
  const forward = new Vector3(Math.sin(motion.airHitHeading ?? motion.heading), 0, Math.cos(motion.airHitHeading ?? motion.heading));
  const speedFactor = clamp(1 - age / scoutPlaneFlakSmokeSeconds, 0.35, 1);
  motion.root.position.addInPlace(forward.scale((motion.airHitSpeed ?? scoutPlaneCruiseSpeed) * speedFactor * dt));
  motion.root.position.y -= dt * (0.55 + age * 0.8);
  motion.root.rotationQuaternion = Quaternion.FromEulerAngles(
    -0.08 - age * 0.08,
    motion.airHitHeading ?? motion.heading,
    (motion.visualBank ?? 0) + Math.sin(now * 5.5) * 0.08 + age * 0.16
  );
  updateScoutPlaneVisual(motion, Math.max(4, (motion.airHitSpeed ?? scoutPlaneCruiseSpeed) * speedFactor), now);

  if (!motion.airHitExploded && now >= (motion.nextAirHitSmokeTime ?? now)) {
    createBurningScoutPlaneTrail(flakSystem, motion.root.position, forward.scale(-1.8));
    motion.nextAirHitSmokeTime = now + scoutPlaneFlakSmokeIntervalSeconds;
  }

  if (!motion.airHitExploded && age >= scoutPlaneFlakSmokeSeconds) {
    motion.airHitExploded = true;
    createScoutPlaneAirExplosion(flakSystem, motion.root.position.clone());
    motion.root.setEnabled(false);
  }

  if (age >= scoutPlaneFlakRespawnSeconds) {
    motion.state = "sunk";
  }
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
      vehicleType: getShipVehicleType(ship),
      position: new Vector3(ship.x, 0.28, ship.z),
      heading: Number.isFinite(ship.heading) ? ship.heading : 0,
      speed: Number.isFinite(ship.speed) ? ship.speed : 0,
      serverVisible: false
    });
  }
  document.body.dataset.radarStateSync = "client-snapshot";
  document.body.dataset.radarContacts = String(contacts.length);
  return contacts;
}

function beginPlayerSinking(hitPosition, now, damageMessage = null) {
  if (playerDamageState !== "active") return;

  sendClientGameEvent("player-sinking-start", {
    damageMessage: damageMessage ?? "",
    hitPosition: hitPosition ? summarizeVector(hitPosition) : null,
    playerServerShipId,
    pendingPlayerServerShipId: pendingPlayerServerShip?.id ?? ""
  });
  playerDamageState = "sinking";
  playerSinkStartTime = now;
  playerSinkStartY = boat.root.position.y;
  playerSinkSide = getPlayerSinkSide(hitPosition, boat.root.position, heading);
  engineOrder = 2;
  heldRudderDirection = 0;
  rudderDegrees = 0;
  turnVelocity *= 0.25;
  speed *= 0.18;
  if (damageMessage) {
    showDamageMessage(damageMessage, now, 2.6);
  }
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

function beginScoutPlaneFlakHit(hit, now) {
  if (!scoutPlaneMode || playerDamageState !== "active") return;

  playerDamageState = "air-hit";
  scoutPlaneFlakHitStartTime = now;
  scoutPlaneFlakHitExploded = false;
  nextScoutPlaneFlakSmokeTime = now;
  scoutPlaneFlakHitHeading = heading;
  scoutPlaneFlakHitSpeed = Math.max(scoutPlaneMinSpeed, Math.abs(speed) || scoutPlaneCruiseSpeed);
  heldElevatorDirection = 0;
  heldRudderDirection = 0;
  heldFlakDirection = 0;
  heldFlakPitchDirection = 0;
  heldFlakFire = false;
  speed *= 0.18;
  scoutPlaneTargetSpeed = scoutPlaneMinSpeed;
  scoutPlaneVerticalSpeed = 0;
  turnVelocity *= 0.15;
  ramShake = 0.85;
  flakHitAlertUntil = now + scoutPlaneFlakRespawnSeconds;
  planeHitFlashStart = now;
  planeHitFlashUntil = now + 0.82;
  document.body.dataset.playerDamageState = "air-hit";
  document.body.dataset.scoutPlaneFlakHit = hit?.id ?? "";
  showDamageMessage(createDestroyedByText("Flak", hit?.shipId), now, scoutPlaneFlakRespawnSeconds);
}

function updateScoutPlaneFlakHitSequence(playerPlane, now, dt) {
  const age = now - scoutPlaneFlakHitStartTime;
  const forward = new Vector3(Math.sin(scoutPlaneFlakHitHeading), 0, Math.cos(scoutPlaneFlakHitHeading));
  const position = playerPlane.root.position.clone();
  if (!scoutPlaneFlakHitExploded) {
    const speedFactor = clamp(1 - age / scoutPlaneFlakSmokeSeconds, 0.35, 1);
    playerPlane.root.position.addInPlace(forward.scale(scoutPlaneFlakHitSpeed * speedFactor * dt));
    playerPlane.root.position.y -= dt * (0.5 + age * 0.75);
    playerPlane.root.rotationQuaternion = Quaternion.FromEulerAngles(
      -0.08 - age * 0.08,
      scoutPlaneFlakHitHeading,
      -turnVelocity * 2.8 + Math.sin(now * 5.4) * 0.08 + age * 0.16
    );
    updateScoutPlaneVisual(playerPlane, Math.max(4, scoutPlaneFlakHitSpeed * speedFactor), now);
  }

  if (!scoutPlaneFlakHitExploded && age <= scoutPlaneFlakSmokeSeconds && now >= nextScoutPlaneFlakSmokeTime) {
    createBurningScoutPlaneTrail(flakSystem, playerPlane.root.position, forward.scale(-1.8));
    nextScoutPlaneFlakSmokeTime = now + scoutPlaneFlakSmokeIntervalSeconds;
  }

  if (!scoutPlaneFlakHitExploded && age >= scoutPlaneFlakSmokeSeconds) {
    scoutPlaneFlakHitExploded = true;
    createScoutPlaneAirExplosion(flakSystem, playerPlane.root.position.clone());
    playerPlane.root.setEnabled(false);
    ramShake = 1;
  }

  if (age >= scoutPlaneFlakRespawnSeconds) {
    respawnPlayerBoat(playerPlane);
  }
}

function respawnPlayerBoat(playerBoat) {
  if (scoutPlaneMode) {
    respawnPlayerScoutPlane(playerBoat);
    return;
  }

  resetTransientWeaponVisualsAfterRespawn();
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
    sendClientGameEvent("player-respawn-server-ship", {
      ship: summarizeShip(nextShip)
    });
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
  sendClientGameEvent("player-respawn-pending", {
    spawn: {
      x: Number(spawn.position.x.toFixed(2)),
      z: Number(spawn.position.z.toFixed(2)),
      heading: Number(spawn.heading.toFixed(4))
    }
  });
}

function respawnPlayerScoutPlane(playerPlane) {
  resetTransientWeaponVisualsAfterRespawn();
  playerRespawnIndex = (playerRespawnIndex + 1) % playerRespawnPoints.length;
  const spawn = playerRespawnPoints[playerRespawnIndex];

  playerPlane.root.setEnabled(true);
  playerPlane.root.position.set(spawn.position.x, scoutPlaneCruiseAltitude, spawn.position.z);
  heading = spawn.heading;
  speed = scoutPlaneCruiseSpeed;
  scoutPlaneTargetSpeed = scoutPlaneCruiseSpeed;
  scoutPlaneAltitude = scoutPlaneCruiseAltitude;
  scoutPlaneVerticalSpeed = 0;
  scoutPlanePitch = 0;
  turnVelocity = 0;
  rudderDegrees = 0;
  engineOrder = 7;
  ramShake = 0.72;
  playerDamageState = "active";
  playerServerShipId = null;
  debugTeleportPending = true;
  document.body.dataset.playerShipId = "pending";
  document.body.dataset.playerDamageState = "active";
  document.body.dataset.scoutPlaneFlakHit = "";
  playerPlane.root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
  updateSinkingWaterOverlay(0);
}

function resetTransientWeaponVisualsAfterRespawn() {
  torpedoSystem.active.forEach(disposeTorpedo);
  torpedoSystem.active = [];
  torpedoSystem.serverVisuals.forEach(disposeServerTorpedoVisual);
  torpedoSystem.serverVisuals.clear();
  torpedoSystem.serverSourceVehicleTypes.clear();
  bombSystem.serverVisuals.forEach(disposeServerBombVisual);
  bombSystem.serverVisuals.clear();
  flakSystem.serverVisuals.forEach(disposeFlakProjectile);
  flakSystem.serverVisuals.clear();
  cannonSystem.serverVisuals.forEach(disposeFlakProjectile);
  cannonSystem.serverVisuals.clear();
  cannonSystem.active.forEach(disposeFlakProjectile);
  cannonSystem.active = [];
  document.body.dataset.weaponVisualsResetAt = time.toFixed(2);
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
    serverSourceVehicleTypes: new Map(),
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

  const crossParts = [
    { part: "upper", width: 0.11, depth: 1 },
    { part: "lower", width: 0.11, depth: 1 },
    { part: "left", width: 1, depth: 0.11 },
    { part: "right", width: 1, depth: 0.11 }
  ].map((definition) => {
    const line = MeshBuilder.CreateBox(`bomb_sight_marker_${definition.part}`, {
      width: definition.width,
      height: 0.045,
      depth: definition.depth
    }, scene);
    line.parent = root;
    line.material = materials.beaconGlow;
    return { mesh: line, part: definition.part };
  });

  root.metadata = {
    crossParts
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
    airHitEffects: [],
    scheduledHitEffects: [],
    hitEffectIds: new Set(),
    impactEffectIds: new Set(),
    serverVisuals: new Map(),
    nextFireTime: 0,
    nextDemoMotionIndex: 0,
    nextId: 1
  };
}

function createCannonSystem(scene, materials, parent) {
  const root = new TransformNode("cannon_projectiles", scene);
  root.parent = parent;

  return {
    root,
    scene,
    materials,
    active: [],
    flashes: [],
    airHitEffects: [],
    serverVisuals: new Map(),
    nextId: 1
  };
}

function firePlayerFlak() {
  if (!flakViewActive || playerDamageState !== "active" || time < flakSystem.nextFireTime) return;
  const shot = getPlayerFlakShot();
  if (!shot) return;
  if (flakShotWouldHitOwnBoat(shot)) {
    document.body.dataset.flakFire = "blocked-own-ship";
    return;
  }

  flakSystem.nextFireTime = time + flakFireCooldownSeconds;
  const spreadShot = createSpreadFlakShot(shot, flakSystem.nextId);
  createFlakProjectile(flakSystem, spreadShot.position, spreadShot.velocity, spreadShot.direction);
  createFlakMuzzleFlash(flakSystem, shot.position, shot.direction);
  reportPlayerFlakShot(spreadShot);
  document.body.dataset.flakFire = "ok";
  document.body.dataset.flakShots = String(flakSystem.nextId - 1);
}

function firePlayerCannon() {
  if (!cannonViewActive || playerDamageState !== "active") return;
  if (time < nextCannonFireTime) {
    document.body.dataset.cannonFire = "reloading";
    document.body.dataset.cannonReload = Math.max(0, nextCannonFireTime - time).toFixed(1);
    document.body.dataset.cannonReloading = "true";
    return;
  }

  const shot = getPlayerCannonShot();
  if (!shot) return;
  if (cannonShotWouldHitOwnBoat(shot)) {
    document.body.dataset.cannonFire = "blocked-own-ship";
    return;
  }

  nextCannonFireTime = time + cannonFireCooldownSeconds;
  triggerCannonBarrelRecoil(boat.bowCannon, time);
  createCannonProjectile(cannonSystem, shot.position, shot.velocity, shot.direction);
  createCannonMuzzleBlast(cannonSystem, shot.muzzle, shot.direction);
  reportPlayerCannonShot(shot);
  document.body.dataset.cannonFire = "ok";
  document.body.dataset.cannonShots = String(cannonSystem.nextId - 1);
  document.body.dataset.cannonReload = cannonFireCooldownSeconds.toFixed(1);
  document.body.dataset.cannonReloading = "true";
}

function installScenarioTestHooks() {
  if (!scenarioTestMode) return;

  window.seaBattleScenarioTest = {
    setStation(station) {
      setBattleStation(String(station ?? "bridge"));
      return stationSnapshot();
    },
    aimCannonAt(target) {
      return aimPlayerCannonAtWorldPoint(target);
    },
    async fireCannonAt(target) {
      setBattleStation("cannon");
      const aim = aimPlayerCannonAtWorldPoint(target);
      document.body.dataset.cannonFireSync = "";
      firePlayerCannon();
      return {
        aim,
        station: stationSnapshot(),
        fire: document.body.dataset.cannonFire ?? ""
      };
    },
    async state() {
      const response = await fetch(getGameStateEndpoint(), { cache: "no-store" });
      return response.json();
    }
  };
  document.body.dataset.scenarioTest = "ready";
}

function stationSnapshot() {
  return {
    flak: flakViewActive,
    cannon: cannonViewActive,
    torpedo: torpedoScopeActive
  };
}

function aimPlayerCannonAtWorldPoint(target) {
  if (!boat?.bowCannon?.elevationRoot) {
    throw new Error("Player cannon is not available");
  }
  const worldTarget = new Vector3(
    Number(target?.x ?? 0),
    Number(target?.y ?? 0),
    Number(target?.z ?? 0)
  );
  if (![worldTarget.x, worldTarget.y, worldTarget.z].every(Number.isFinite)) {
    throw new Error("Cannon target must contain finite x/y/z values");
  }

  for (let correction = 0; correction < 3; correction += 1) {
    const yawShot = getPlayerCannonShot();
    const yawOrigin = yawShot?.muzzle ?? boat.bowCannon.elevationRoot.getAbsolutePosition();
    const desiredWorldYaw = Math.atan2(worldTarget.x - yawOrigin.x, worldTarget.z - yawOrigin.z);
    cannonYaw = clamp(normalizeAngle(desiredWorldYaw - heading), -cannonYawLimit, cannonYawLimit);
    updatePlayerCannonMount();

    cannonPitch = bestCannonPitchForWorldPoint(worldTarget);
    updatePlayerCannonMount();
  }

  const shot = getPlayerCannonShot();
  const miss = shot?.direction
    ? distancePointToRay(worldTarget, shot.position, shot.direction)
    : null;
  const result = {
    target: { x: worldTarget.x, y: worldTarget.y, z: worldTarget.z },
    yaw: cannonYaw,
    pitch: cannonPitch,
    miss: Number.isFinite(miss) ? miss : null,
    shot: shot
      ? {
        position: { x: shot.position.x, y: shot.position.y, z: shot.position.z },
        muzzle: { x: shot.muzzle.x, y: shot.muzzle.y, z: shot.muzzle.z },
        direction: { x: shot.direction.x, y: shot.direction.y, z: shot.direction.z }
      }
      : null
  };
  document.body.dataset.scenarioCannonAim = JSON.stringify(result);
  return result;
}

function bestCannonPitchForWorldPoint(worldTarget) {
  let low = cannonMinPitch;
  let high = cannonMaxPitch;
  let bestPitch = cannonPitch;
  let bestError = Number.POSITIVE_INFINITY;

  for (let step = 0; step < 18; step += 1) {
    const mid = (low + high) / 2;
    cannonPitch = mid;
    updatePlayerCannonMount();

    const shot = getPlayerCannonShot();
    const signedError = shot ? signedRayVerticalMiss(worldTarget, shot.position, shot.direction) : 0;
    const absError = Math.abs(signedError);
    if (absError < bestError) {
      bestError = absError;
      bestPitch = mid;
    }

    if (signedError > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return clamp(bestPitch, cannonMinPitch, cannonMaxPitch);
}

function distancePointToRay(point, origin, direction) {
  const toPoint = point.subtract(origin);
  const along = Math.max(0, Vector3.Dot(toPoint, direction));
  const closest = origin.add(direction.scale(along));
  return Vector3.Distance(point, closest);
}

function signedRayVerticalMiss(point, origin, direction) {
  const toPoint = point.subtract(origin);
  const along = Math.max(0, Vector3.Dot(toPoint, direction));
  const closest = origin.add(direction.scale(along));
  return closest.y - point.y;
}

function getPlayerCannonShot() {
  const shot = getCannonShotFromModel(boat.bowCannon, heading, speed);
  return shot
    ? { ...shot, weaponYaw: cannonYaw, weaponPitch: cannonPitch }
    : null;
}

function getCannonShotFromModel(cannon, baseHeading = 0, baseSpeed = 0) {
  const elevationRoot = cannon?.elevationRoot;
  if (!elevationRoot) return null;

  const worldMatrix = elevationRoot.computeWorldMatrix(true);
  const muzzleZ = cannon.muzzleZ ?? 0.52;
  const barrelY = 0;
  const muzzle = Vector3.TransformCoordinates(new Vector3(0, barrelY, muzzleZ), worldMatrix);
  const aimTarget = Vector3.TransformCoordinates(new Vector3(0, barrelY, 80), worldMatrix);
  const direction = aimTarget.subtract(muzzle).normalize();

  return {
    position: muzzle.add(direction.scale(0.12)),
    muzzle,
    direction,
    velocity: direction.scale(cannonProjectileSpeed).add(getForwardVector(baseHeading).scale(baseSpeed))
  };
}

function triggerCannonBarrelRecoil(cannon, now) {
  if (!cannon?.barrel) return;
  cannon.recoilStart = now;
}

function updateCannonBarrelRecoil(cannon, now) {
  if (!cannon?.barrel || !Number.isFinite(cannon.barrelBaseZ)) return;
  if (!Number.isFinite(cannon.recoilStart)) {
    cannon.barrel.position.z = cannon.barrelBaseZ;
    return;
  }

  const t = (now - cannon.recoilStart) / cannonBarrelRecoilDuration;
  if (t >= 1) {
    cannon.recoilStart = null;
    cannon.barrel.position.z = cannon.barrelBaseZ;
    return;
  }

  const recoil = t < 0.24
    ? t / 0.24
    : Math.pow(1 - (t - 0.24) / 0.76, 2);
  cannon.barrel.position.z = cannon.barrelBaseZ - cannonBarrelRecoilDistance * recoil;
}

function cannonShotWouldHitOwnBoat(shot) {
  if (!shot?.position || !shot?.direction || !boat?.root) return true;
  const inverse = boat.root.computeWorldMatrix(true).clone();
  inverse.invert();
  for (let distance = 0.65; distance <= 7.5; distance += 0.85) {
    const worldPoint = shot.position.add(shot.direction.scale(distance));
    const localPoint = Vector3.TransformCoordinates(worldPoint, inverse);
    if (ownBoatFlakHitArea(localPoint) === "critical") {
      return true;
    }
  }
  return false;
}

async function reportPlayerCannonShot(shot) {
  if (!playerServerShipId || !playerId || !playerTeamId || !shot) return;
  try {
    const response = await fetch(getFireCannonEndpoint(), {
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
        vz: shot.velocity.z,
        weaponYaw: shot.weaponYaw ?? cannonYaw,
        weaponPitch: shot.weaponPitch ?? cannonPitch
      })
    });
    if (response.status === 403) {
      expireActiveLogin("fire-cannon-403");
      return;
    }
    document.body.dataset.cannonFireSync = response.ok ? "ok" : `http-${response.status}`;
  } catch (error) {
    document.body.dataset.cannonFireSync = "error";
    document.body.dataset.cannonFireSyncError = error.message;
  }
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
        vz: shot.velocity.z,
        weaponYaw: shot.weaponYaw ?? flakYaw,
        weaponPitch: shot.weaponPitch ?? flakPitch
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

async function reportLocalPlaneHit(hit, weaponType) {
  if (!playerServerShipId || !playerId || !playerTeamId || !hit?.motion || !hit?.position) return;
  const key = hit.reportId ?? `${weaponType}:${hit.motion.id}:${Math.round(time * 1000)}`;
  if (reportedLocalPlaneHitIds.has(key)) return;
  reportedLocalPlaneHitIds.add(key);
  if (reportedLocalPlaneHitIds.size > 40) {
    reportedLocalPlaneHitIds = new Set(Array.from(reportedLocalPlaneHitIds).slice(-24));
  }
  try {
    const response = await fetch(getReportPlaneHitEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        teamId: playerTeamId,
        shipId: playerServerShipId,
        targetShipId: hit.motion.id,
        weaponType,
        x: hit.position.x,
        y: hit.position.y,
        z: hit.position.z
      })
    });
    if (response.status === 403) {
      expireActiveLogin("report-plane-hit-403");
      return;
    }
    document.body.dataset.localPlaneHitSync = response.ok ? "ok" : `http-${response.status}`;
  } catch (error) {
    document.body.dataset.localPlaneHitSync = "error";
    document.body.dataset.localPlaneHitSyncError = error.message;
  }
}

function getPlayerFlakShot() {
  const shot = getFlakShotFromElevationRoot(
    boat.sternFlak?.elevationRoot,
    playerSternFlakScale,
    null,
    getForwardVector(heading).scale(speed)
  );
  return shot
    ? { ...shot, weaponYaw: flakYaw, weaponPitch: flakPitch }
    : null;
}

function flakShotWouldHitOwnBoat(shot) {
  if (!shot?.position || !shot?.direction || !boat?.root) return true;
  const inverse = boat.root.computeWorldMatrix(true).clone();
  inverse.invert();
  for (let distance = 0.35; distance <= 8.0; distance += 1.5) {
    const worldPoint = shot.position.add(shot.direction.scale(distance));
    const localPoint = Vector3.TransformCoordinates(worldPoint, inverse);
    if (ownBoatFlakHitArea(localPoint) !== "miss") {
      return true;
    }
  }
  return false;
}

function ownBoatFlakHitArea(point) {
  const absRight = Math.abs(point.x);
  if (point.y >= 0.72 && point.y <= 1.72 && point.z >= 0.32 && point.z <= 1.24 && absRight <= 0.62) {
    return "critical";
  }
  if (point.y >= 0.78 && point.y <= 1.92 && point.z >= -1.5 && point.z <= 0.24 && absRight <= 0.26) {
    return "critical";
  }
  const deckClearance = getTorpedoBoatDeckY(point.z) + 0.025;
  if (point.y >= 0.1 && point.y <= deckClearance && isForwardInsideTorpedoBoatHull(point.z, 0.18) && absRight <= getTorpedoBoatHullTopHalfWidthAt(point.z) + 0.18) {
    return "surface";
  }
  return "miss";
}

function isForwardInsideTorpedoBoatHull(forward, margin = 0) {
  const sections = torpedoBoatHullSections();
  return forward >= sections[0].z - margin && forward <= sections[sections.length - 1].z + margin;
}

function getTorpedoBoatHullTopHalfWidthAt(forward) {
  const sections = torpedoBoatHullSections().map((section) => ({
    z: section.z,
    halfWidth: section.topWidth * 0.5
  }));
  if (forward <= sections[0].z) return sections[0].halfWidth;
  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = sections[index];
    const next = sections[index + 1];
    if (forward <= next.z) {
      const t = (forward - current.z) / (next.z - current.z);
      return current.halfWidth + (next.halfWidth - current.halfWidth) * t;
    }
  }
  return sections[sections.length - 1].halfWidth;
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

function createSpreadFlakShot(shot, seed) {
  const sideSpread = (stableUnitNoise(seed * 2 + 11) - 0.5) * 0.022;
  const verticalSpread = (stableUnitNoise(seed * 2 + 37) - 0.5) * 0.012;
  const velocity = spreadFlakVelocity(shot.velocity, sideSpread, verticalSpread);
  const direction = velocity.lengthSquared() > 0.0001 ? velocity.normalizeToNew() : shot.direction.clone();
  return {
    ...shot,
    direction,
    velocity
  };
}

function stableUnitNoise(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function spreadFlakVelocity(velocity, sideSpread, verticalSpread) {
  const speed = velocity.length();
  if (speed <= 0.001 || (sideSpread === 0 && verticalSpread === 0)) {
    return velocity.clone();
  }

  const direction = velocity.scale(1 / speed);
  let right = new Vector3(direction.z, 0, -direction.x);
  if (right.lengthSquared() <= 0.0001) {
    right = new Vector3(1, 0, 0);
  } else {
    right.normalize();
  }

  return direction
    .add(right.scale(sideSpread))
    .add(new Vector3(0, verticalSpread, 0))
    .normalize()
    .scale(speed);
}

function createFlakProjectile(system, position, velocity, direction, options = {}) {
  const id = system.nextId;
  system.nextId += 1;

  const root = new TransformNode(`flak_shell_${id}`, system.scene);
  root.parent = system.root;
  root.position.copyFrom(position);

  const core = MeshBuilder.CreateSphere(`${root.name}_core`, {
    diameter: 0.2,
    segments: 10
  }, system.scene);
  core.parent = root;
  core.material = system.materials.flakTracer;

  const trail = [];
  const trailSegments = options.trailSegments ?? 0;
  for (let i = 0; i < trailSegments; i += 1) {
    const segment = MeshBuilder.CreateSphere(`${root.name}_trail_${i}`, {
      diameter: 0.16 - i * 0.018,
      segments: 8
    }, system.scene);
    segment.parent = system.root;
    segment.material = system.materials.flakTracerTrail;
    segment.position.copyFrom(position.add(direction.scale(-0.18 - i * 0.28)));
    trail.push(segment);
  }

  const light = new PointLight(`${root.name}_light`, position, system.scene);
  light.diffuse = new Color3(0.96, 0.98, 1.0);
  light.specular = new Color3(0.9, 0.96, 1.0);
  light.intensity = 1.25;
  light.range = 32;

  system.active.push({
    id,
    weaponType: "flak",
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
    samplePositions: Array.from({ length: trailSegments + 1 }, (_, index) => position.add(direction.scale(-0.18 - index * 0.28)))
  });
  return system.active[system.active.length - 1];
}

function createCannonProjectile(system, position, velocity, direction) {
  const id = system.nextId;
  system.nextId += 1;

  const root = new TransformNode(`cannon_shell_${id}`, system.scene);
  root.parent = system.root;
  root.position.copyFrom(position);

  const core = MeshBuilder.CreateSphere(`${root.name}_core`, {
    diameter: 0.68,
    segments: 12
  }, system.scene);
  core.parent = root;
  core.material = system.materials.flakTracer;

  const trail = [];
  for (let i = 0; i < 4; i += 1) {
    const segment = MeshBuilder.CreateSphere(`${root.name}_trail_${i}`, {
      diameter: 0.48 - i * 0.06,
      segments: 8
    }, system.scene);
    segment.parent = system.root;
    segment.material = system.materials.flakTracerTrail;
    segment.position.copyFrom(position.add(direction.scale(-0.28 - i * 0.42)));
    trail.push(segment);
  }

  const light = new PointLight(`${root.name}_light`, position, system.scene);
  light.diffuse = new Color3(0.96, 0.98, 1.0);
  light.specular = new Color3(0.9, 0.96, 1.0);
  light.intensity = 3.15;
  light.range = 66;

  system.active.push({
    id,
    weaponType: "cannon",
    root,
    core,
    trail,
    light,
    position: position.clone(),
    previousPosition: position.subtract(direction.scale(0.65)),
    velocity,
    age: 0,
    lifetime: cannonProjectileLifetime,
    direction: direction.clone(),
    samplePositions: Array.from({ length: 5 }, (_, index) => position.add(direction.scale(-0.28 - index * 0.42)))
  });
  return system.active[system.active.length - 1];
}

function createFlakMuzzleFlash(system, position, direction) {
  const flash = MeshBuilder.CreateSphere(`flak_muzzle_flash_${system.nextId}`, {
    diameter: 0.24,
    segments: 10
  }, system.scene);
  flash.parent = system.root;
  flash.material = system.materials.flakFlash;
  flash.position.copyFrom(position.add(direction.scale(0.08)));

  const light = new PointLight(`${flash.name}_light`, flash.position.clone(), system.scene);
  light.diffuse = new Color3(1.0, 0.76, 0.42);
  light.specular = new Color3(1.0, 0.78, 0.5);
  light.intensity = 2.0;
  light.range = 28;

  system.flashes.push({
    mesh: flash,
    light,
    origin: flash.position.clone(),
    age: 0,
    lifetime: 0.16,
    lightIntensity: 2.0,
    direction: direction.clone()
  });
}

function createCannonMuzzleBlast(system, position, direction) {
  const flashId = system.nextId;
  const flash = MeshBuilder.CreateSphere(`cannon_muzzle_flash_${flashId}`, {
    diameter: 0.68,
    segments: 12
  }, system.scene);
  flash.parent = system.root;
  flash.material = system.materials.flakFlash;
  flash.position.copyFrom(position.add(direction.scale(0.18)));
  flash.isPickable = false;

  const light = new PointLight(`${flash.name}_light`, flash.position.clone(), system.scene);
  light.diffuse = new Color3(1.0, 0.78, 0.42);
  light.specular = new Color3(1.0, 0.86, 0.62);
  light.intensity = 4.4;
  light.range = 58;

  system.flashes.push({
    mesh: flash,
    light,
    origin: flash.position.clone(),
    age: 0,
    lifetime: 0.24,
    lightIntensity: 4.4,
    direction: direction.clone()
  });

  for (let index = 0; index < 4; index += 1) {
    const puff = MeshBuilder.CreateSphere(`cannon_muzzle_smoke_${flashId}_${index}`, {
      diameter: 0.34 + index * 0.055,
      segments: 10
    }, system.scene);
    puff.parent = system.root;
    puff.material = system.materials.volcanicSmoke;
    puff.position.copyFrom(position.add(direction.scale(0.12 + index * 0.12)).add(new Vector3(
      (stableUnitNoise(flashId + index * 13) - 0.5) * 0.18,
      (stableUnitNoise(flashId + index * 17) - 0.5) * 0.12,
      (stableUnitNoise(flashId + index * 19) - 0.5) * 0.18
    )));
    puff.isPickable = false;
    system.airHitEffects.push({
      mesh: puff,
      age: 0,
      lifetime: 0.82 + index * 0.07,
      origin: puff.position.clone(),
      velocity: direction.scale(0.62 + index * 0.14).add(new Vector3(0, 0.2 + index * 0.035, 0)),
      gravity: 0.02,
      baseScale: new Vector3(0.34, 0.28, 0.34),
      grow: new Vector3(1.18, 0.82, 1.18),
      alpha: 0.26
    });
  }
}

function getLocalProjectileScoutPlaneHit(projectile, weaponType) {
  if (!projectile?.position || !projectile?.previousPosition) return null;
  const candidates = enemyMotions.filter((motion) => (
    isScoutPlaneMotion(motion) &&
    motion.state === "active" &&
    motion.serverState === "active" &&
    motion.root?.isEnabled?.() &&
    distanceToProjectileSegment2D(projectile.previousPosition, projectile.position, motion.root.position) <= 10.0
  ));
  if (!candidates.length) return null;

  const movement = projectile.position.subtract(projectile.previousPosition);
  const segmentLength = movement.length();
  const samples = Math.max(1, Math.ceil(segmentLength / 1.6));
  for (const motion of candidates) {
    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples;
      const position = projectile.previousPosition.add(movement.scale(t));
      if (pointHitsScoutPlaneMotion(position, motion)) {
        return {
          motion,
          position,
          reportId: `${weaponType}:${projectile.id}:${motion.id}`
        };
      }
    }
  }
  return null;
}

function distanceToProjectileSegment2D(start, end, point) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared <= 0.0001
    ? 0
    : clamp(((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared, 0, 1);
  const x = start.x + dx * t;
  const z = start.z + dz * t;
  return Math.hypot(point.x - x, point.z - z);
}

function pointHitsScoutPlaneMotion(position, motion) {
  const planePosition = motion.root.position;
  const dx = position.x - planePosition.x;
  const dz = position.z - planePosition.z;
  const right = dx * Math.cos(motion.heading) - dz * Math.sin(motion.heading);
  const forward = dx * Math.sin(motion.heading) + dz * Math.cos(motion.heading);
  const vertical = position.y - planePosition.y;
  const bank = clamp(motion.visualBank ?? 0, -0.72, 0.72);
  const cosBank = Math.cos(bank);
  const sinBank = Math.sin(bank);
  const modelRight = right * cosBank + vertical * sinBank;
  const modelVertical = -right * sinBank + vertical * cosBank;
  return pointHitsScoutPlanePart(
    forward,
    modelRight,
    modelVertical,
    -scoutPlaneHitHalfLength,
    scoutPlaneHitHalfLength,
    scoutPlaneHitFuselageHalfWidth
  ) || pointHitsScoutPlanePart(
    forward,
    modelRight,
    modelVertical,
    scoutPlaneHitWingForwardMin,
    scoutPlaneHitWingForwardMax,
    scoutPlaneHitWingHalfWidth
  ) || pointHitsScoutPlanePart(
    forward,
    modelRight,
    modelVertical,
    scoutPlaneHitTailForwardMin,
    scoutPlaneHitTailForwardMax,
    scoutPlaneHitTailHalfWidth
  );
}

function pointHitsScoutPlanePart(forward, right, vertical, forwardMin, forwardMax, halfWidth) {
  return forward >= forwardMin - scoutPlaneHitMargin &&
    forward <= forwardMax + scoutPlaneHitMargin &&
    Math.abs(right) <= halfWidth + scoutPlaneHitMargin &&
    Math.abs(vertical) <= scoutPlaneHitVerticalHalfHeight + scoutPlaneHitMargin;
}

function handleLocalProjectileScoutPlaneHit(system, projectile, hit, weaponType, now) {
  const hitId = `local-${hit.reportId}`;
  if (!flakSystem.hitEffectIds.has(hitId)) {
    flakSystem.hitEffectIds.add(hitId);
  }
  beginEnemyScoutPlaneAirHit(hit.motion, {
    id: hitId,
    shipId: playerServerShipId,
    targetShipId: hit.motion.id,
    x: hit.position.x,
    y: hit.position.y,
    z: hit.position.z,
    t: now
  }, now);
  reportLocalPlaneHit(hit, weaponType);
  disposeFlakProjectile(projectile);
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

    const planeHit = getLocalProjectileScoutPlaneHit(projectile, "flak");
    if (planeHit) {
      handleLocalProjectileScoutPlaneHit(system, projectile, planeHit, "flak", now);
      return false;
    }

    const pulse = 0.72 + Math.sin(now * 80 + projectile.age * 13) * 0.18;
    projectile.core.scaling.setAll(getProjectileVisibilityScale(projectile.position, flakProjectileMaxVisualScale));
    projectile.core.visibility = pulse;
    projectile.samplePositions.unshift(projectile.position.clone());
    projectile.samplePositions = projectile.samplePositions.slice(0, projectile.trail.length + 1);
    projectile.trail.forEach((segment, index) => {
      const sample = projectile.samplePositions[index + 1] ?? projectile.previousPosition;
      segment.position.copyFrom(sample);
      const fade = Math.max(0.16, pulse - index * 0.16);
      segment.scaling.setAll(1 - index * 0.1);
      segment.visibility = fade;
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
    flash.mesh.scaling.setAll(1 + t * 2.35);
    flash.mesh.position.copyFrom(flash.origin.add(flash.direction.scale(t * 0.7)));
    flash.light.position.copyFrom(flash.mesh.position);
    flash.light.intensity = (flash.lightIntensity ?? 0.85) * fade;
    return true;
  });

  system.airHitEffects = system.airHitEffects.filter((effect) => updateAirHitEffect(effect, dt));
  system.scheduledHitEffects = system.scheduledHitEffects.filter((effect) => updateScheduledHitEffect(system, effect, dt));

  document.body.dataset.flakProjectiles = String(system.active.length);
}

function updateCannonSystem(system, dt, now, landZones) {
  system.active = system.active.filter((projectile) => {
    projectile.age += dt;
    if (projectile.age >= projectile.lifetime) {
      disposeFlakProjectile(projectile);
      return false;
    }

    projectile.previousPosition.copyFrom(projectile.position);
    projectile.velocity.y -= cannonProjectileGravity * dt;
    projectile.position.addInPlace(projectile.velocity.scale(dt));
    projectile.root.position.copyFrom(projectile.position);
    projectile.direction = projectile.position.subtract(projectile.previousPosition).normalize();

    const planeHit = getLocalProjectileScoutPlaneHit(projectile, "cannon");
    if (planeHit) {
      handleLocalProjectileScoutPlaneHit(system, projectile, planeHit, "cannon", now);
      return false;
    }

    const impact = getCannonProjectileImpact(projectile, landZones);
    if (impact) {
      if (impact.kind === "land") {
        createFlakLandImpactEffect(system, impact.position);
      } else {
        createCannonWaterImpactEffect(system, impact.position, projectile.direction);
      }
      disposeFlakProjectile(projectile);
      return false;
    }

    const pulse = 0.82 + Math.sin(now * 46 + projectile.age * 11) * 0.1;
    projectile.core.scaling.setAll(getProjectileVisibilityScale(projectile.position, cannonProjectileMaxVisualScale));
    projectile.core.visibility = pulse;
    projectile.samplePositions.unshift(projectile.position.clone());
    projectile.samplePositions = projectile.samplePositions.slice(0, projectile.trail.length + 1);
    projectile.trail.forEach((segment, index) => {
      const sample = projectile.samplePositions[index + 1] ?? projectile.previousPosition;
      segment.position.copyFrom(sample);
      segment.visibility = Math.max(0.14, pulse - index * 0.24);
      segment.scaling.setAll(1 - index * 0.16);
    });
    projectile.light.position.copyFrom(projectile.position);
    projectile.light.intensity = 0.55 + pulse * 0.55;
    return true;
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
    flash.mesh.scaling.setAll(1 + t * 3.05);
    flash.mesh.position.copyFrom(flash.origin.add(flash.direction.scale(t * 1.05)));
    flash.light.position.copyFrom(flash.mesh.position);
    flash.light.intensity = (flash.lightIntensity ?? 2.15) * fade;
    return true;
  });

  system.airHitEffects = system.airHitEffects.filter((effect) => updateAirHitEffect(effect, dt));
  document.body.dataset.cannonProjectiles = String(system.active.length);
  document.body.dataset.cannonReload = Math.max(0, nextCannonFireTime - now).toFixed(1);
  document.body.dataset.cannonReloading = nextCannonFireTime > now ? "true" : "false";
}

function getProjectileVisibilityScale(position, maxScale) {
  const distance = Vector3.Distance(camera.position, position);
  const t = clamp((distance - 220) / 1280, 0, 1);
  return 1 + t * (maxScale - 1);
}

function getCannonProjectileImpact(projectile, landZones) {
  const position = projectile.position;
  if (isCannonProjectileInLand(position, landZones)) {
    return { kind: "land", position: position.clone() };
  }
  if (position.y <= 0.03) {
    return { kind: "water", position: new Vector3(position.x, 0.03, position.z) };
  }
  return null;
}

function isCannonProjectileInLand(position, landZones) {
  if (position.y > 3.2) return false;
  return landZones.some((zone) => {
    const distance = getZoneShapeDistance(position, zone, zone.rx, zone.rz);
    return distance < getZoneBlockDistance(zone, "navigation") && !isInLandWater(position, zone);
  });
}

function createCannonWaterImpactEffect(system, position, direction = null) {
  const impactPosition = new Vector3(position.x, 0.06, position.z);
  const heading = direction && Math.abs(direction.x) + Math.abs(direction.z) > 0.001
    ? Math.atan2(direction.x, direction.z)
    : 0;
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);
  const effectId = system.nextId++;

  for (let i = 0; i < 6; i += 1) {
    const patch = createJaggedSurfacePatch(`cannon_water_churn_${effectId}_${i}`, system.scene, 0.62 + i * 0.16, 0.42 + i * 0.08, effectId + i * 31);
    patch.parent = system.root;
    patch.material = system.materials.foam;
    patch.position.copyFrom(
      impactPosition
        .add(forward.scale((i - 2) * 0.05))
        .add(right.scale(((i % 3) - 1) * 0.1))
        .add(new Vector3(0, 0.006 + i * 0.003, 0))
    );
    patch.rotation.y = heading + i * 0.51;
    system.airHitEffects.push({
      mesh: patch,
      age: 0,
      lifetime: 0.82 + i * 0.045,
      origin: patch.position.clone(),
      velocity: forward.scale(-0.035 * i).add(right.scale(((i % 2) * 2 - 1) * 0.055)).add(new Vector3(0, 0.02, 0)),
      gravity: 0.03,
      baseScale: patch.scaling.clone(),
      grow: new Vector3(1.55 + i * 0.14, 0.08, 1.05 + i * 0.1),
      seed: effectId + i
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const spray = createJaggedHitWall(`cannon_water_spray_${effectId}_${i}`, system.scene, 0.16 + i * 0.026, 0.42 + i * 0.08, effectId + i * 37);
    spray.parent = system.root;
    spray.material = system.materials.foam;
    spray.position.copyFrom(impactPosition.add(new Vector3(0, 0.17 + i * 0.035, 0)));
    spray.rotation.y = heading + (i - 2) * 0.28;
    system.airHitEffects.push({
      mesh: spray,
      age: 0,
      lifetime: 0.55 + i * 0.04,
      origin: spray.position.clone(),
      velocity: forward.scale(0.05 + i * 0.025).add(right.scale((i - 2) * 0.09)).add(new Vector3(0, 0.48 + i * 0.065, 0)),
      gravity: 0.42,
      baseScale: spray.scaling.clone(),
      grow: new Vector3(0.72, 0.42, 0.72),
      seed: effectId + 40 + i
    });
  }
}

function createScoutPlaneHitSequence(system, position) {
  createScoutPlaneSmokeBurst(system, position);
  createAirHitSpark(system, position);
  createAirHitFire(system, position);
  system.scheduledHitEffects.push({
    age: 0,
    delay: 0.62,
    position: position.clone()
  });
}

function createFlakWaterImpactEffect(system, position) {
  const effectId = system.nextId++;
  const surfacePosition = new Vector3(position.x, 0.055, position.z);
  createFlakImpactFlash(system, effectId, surfacePosition.add(new Vector3(0, 0.62, 0)), 0.72, 28, 2.18);

  const core = MeshBuilder.CreateSphere(`flak_water_impact_core_${effectId}`, {
    diameter: 0.46,
    segments: 10
  }, system.scene);
  core.parent = system.root;
  core.material = system.materials.flakFlash;
  core.position.copyFrom(surfacePosition.add(new Vector3(0, 0.16, 0)));
  core.isPickable = false;
  system.airHitEffects.push({
    mesh: core,
    age: 0,
    lifetime: 0.24,
    origin: core.position.clone(),
    velocity: new Vector3(0, 0.12, 0),
    baseScale: new Vector3(0.62, 0.48, 0.62),
    grow: new Vector3(1.85, 1.05, 1.85),
    alpha: 0.96
  });

  for (let index = 0; index < 5; index += 1) {
    const patch = createJaggedSurfacePatch(`flak_water_impact_${effectId}_${index}`, system.scene, 0.42 + index * 0.12, 0.3 + index * 0.06, effectId + index * 17);
    patch.parent = system.root;
    patch.material = system.materials.foam;
    patch.position.copyFrom(surfacePosition.add(new Vector3(
      (stableUnitNoise(effectId + index * 7) - 0.5) * 0.24,
      index * 0.006,
      (stableUnitNoise(effectId + index * 11) - 0.5) * 0.24
    )));
    patch.rotation.y = stableUnitNoise(effectId + index * 13) * Math.PI * 2;
    patch.isPickable = false;
    system.airHitEffects.push({
      mesh: patch,
      age: 0,
      lifetime: 0.58 + index * 0.08,
      origin: patch.position.clone(),
      velocity: new Vector3(0, 0.06 + index * 0.022, 0),
      gravity: 0.05,
      baseScale: new Vector3(0.72, 0.72, 0.72),
      grow: new Vector3(2.05, 0.1, 1.55),
      alpha: 0.86
    });
  }

  for (let index = 0; index < 4; index += 1) {
    const spray = createJaggedHitWall(`flak_water_spray_${effectId}_${index}`, system.scene, 0.15 + index * 0.04, 0.46 + index * 0.12, effectId + index * 29);
    spray.parent = system.root;
    spray.material = system.materials.foam;
    spray.position.copyFrom(surfacePosition.add(new Vector3(0, 0.24 + index * 0.07, 0)));
    spray.rotation.y = stableUnitNoise(effectId + index * 31) * Math.PI * 2;
    spray.isPickable = false;
    system.airHitEffects.push({
      mesh: spray,
      age: 0,
      lifetime: 0.54 + index * 0.055,
      origin: spray.position.clone(),
      velocity: new Vector3(
        (stableUnitNoise(effectId + index * 37) - 0.5) * 0.96,
        0.74 + index * 0.105,
        (stableUnitNoise(effectId + index * 41) - 0.5) * 0.96
      ),
      gravity: 0.62,
      baseScale: new Vector3(0.78, 0.92, 0.78),
      grow: new Vector3(0.62, 0.78, 0.62),
      alpha: 0.96
    });
  }
}

function createFlakLandImpactEffect(system, position) {
  const effectId = system.nextId++;
  createFlakImpactFlash(system, effectId, position.add(new Vector3(0, 0.42, 0)), 0.58, 30, 2.25);

  const core = MeshBuilder.CreateSphere(`flak_land_impact_core_${effectId}`, {
    diameter: 0.5,
    segments: 10
  }, system.scene);
  core.parent = system.root;
  core.material = system.materials.explosionCore;
  core.position.copyFrom(position.add(new Vector3(0, 0.16, 0)));
  core.isPickable = false;
  system.airHitEffects.push({
    mesh: core,
    age: 0,
    lifetime: 0.28,
    origin: core.position.clone(),
    velocity: new Vector3(0, 0.22, 0),
    baseScale: new Vector3(0.66, 0.66, 0.66),
    grow: new Vector3(1.7, 1.25, 1.7),
    alpha: 0.96
  });

  const spark = MeshBuilder.CreateSphere(`flak_land_impact_spark_${effectId}`, {
    diameter: 0.62,
    segments: 8
  }, system.scene);
  spark.parent = system.root;
  spark.material = system.materials.flakFlash;
  spark.position.copyFrom(position.add(new Vector3(0, 0.08, 0)));
  spark.isPickable = false;
  system.airHitEffects.push({
    mesh: spark,
    age: 0,
    lifetime: 0.26,
    origin: spark.position.clone(),
    velocity: Vector3.Zero(),
    baseScale: new Vector3(0.64, 0.64, 0.64),
    grow: new Vector3(1.7, 1.28, 1.7),
    alpha: 0.94
  });

  const dust = MeshBuilder.CreateSphere(`flak_land_impact_dust_${effectId}`, {
    diameter: 0.72,
    segments: 8
  }, system.scene);
  dust.parent = system.root;
  dust.material = system.materials.volcanicSmokeWarm;
  dust.position.copyFrom(position.add(new Vector3(0, 0.18, 0)));
  dust.isPickable = false;
  system.airHitEffects.push({
    mesh: dust,
    age: 0,
    lifetime: 0.94,
    origin: dust.position.clone(),
    velocity: new Vector3(0, 0.56, 0),
    gravity: 0.18,
    baseScale: new Vector3(0.5, 0.34, 0.5),
    grow: new Vector3(1.7, 1.0, 1.7),
    alpha: 0.5
  });
}

function createFlakImpactFlash(system, effectId, position, lifetime, range, intensity) {
  const light = new PointLight(`flak_impact_flash_${effectId}`, position, system.scene);
  light.diffuse = new Color3(0.98, 0.96, 0.82);
  light.specular = new Color3(1.0, 0.92, 0.72);
  light.intensity = intensity;
  light.range = range;
  system.airHitEffects.push({
    light,
    age: 0,
    lifetime,
    intensity,
    range
  });
}

function createScoutPlaneSmokeBurst(system, position) {
  for (let index = 0; index < 5; index += 1) {
    createScoutPlaneSmokePuff(system, position.add(new Vector3(
      (stableUnitNoise(system.nextId + index * 13) - 0.5) * 1.1,
      (stableUnitNoise(system.nextId + index * 17) - 0.5) * 0.7,
      (stableUnitNoise(system.nextId + index * 19) - 0.5) * 1.1
    )));
  }
}

function createAirHitSpark(system, position) {
  const spark = MeshBuilder.CreateSphere(`scout_plane_hit_spark_${system.nextId}_${system.airHitEffects.length}`, {
    diameter: 1.1,
    segments: 10
  }, system.scene);
  spark.parent = system.root;
  spark.material = system.materials.flakFlash;
  spark.position.copyFrom(position);
  spark.isPickable = false;
  system.airHitEffects.push({
    mesh: spark,
    age: 0,
    lifetime: 0.24,
    origin: position.clone(),
    velocity: Vector3.Zero(),
    baseScale: new Vector3(0.8, 0.8, 0.8),
    grow: new Vector3(1.2, 1.2, 1.2),
    alpha: 0.9
  });
}

function updateScheduledHitEffect(system, effect, dt) {
  effect.age += dt;
  if (effect.age < effect.delay) return true;
  createScoutPlaneAirExplosion(system, effect.position);
  return false;
}

function createAirHitFire(system, position) {
  for (let index = 0; index < 4; index += 1) {
    const flame = MeshBuilder.CreateSphere(`scout_plane_hit_flame_${system.nextId}_${index}`, {
      diameter: 0.62 + index * 0.08,
      segments: 10
    }, system.scene);
    flame.parent = system.root;
    flame.material = system.materials.volcanicSmokeWarm;
    flame.position.copyFrom(position.add(new Vector3(
      (stableUnitNoise(system.nextId + index * 23) - 0.5) * 0.9,
      (stableUnitNoise(system.nextId + index * 29) - 0.5) * 0.5,
      (stableUnitNoise(system.nextId + index * 31) - 0.5) * 0.9
    )));
    flame.isPickable = false;
    system.airHitEffects.push({
      mesh: flame,
      age: 0,
      lifetime: 0.82 + index * 0.06,
      origin: flame.position.clone(),
      velocity: new Vector3(
        (stableUnitNoise(system.nextId + index * 37) - 0.5) * 1.1,
        0.8 + stableUnitNoise(system.nextId + index * 41) * 0.7,
        (stableUnitNoise(system.nextId + index * 43) - 0.5) * 1.1
      ),
      baseScale: new Vector3(0.5, 0.5, 0.5),
      grow: new Vector3(1.25, 1.05, 1.25),
      alpha: 0.7
    });
  }
}

function createBurningScoutPlaneTrail(system, position, drift = Vector3.Zero()) {
  createScoutPlaneSmokePuff(system, position.add(drift));
  for (let index = 0; index < 2; index += 1) {
    const flame = MeshBuilder.CreateSphere(`scout_plane_burning_flame_${system.nextId}_${system.airHitEffects.length}_${index}`, {
      diameter: 0.48 + stableUnitNoise(system.nextId + index * 19) * 0.28,
      segments: 10
    }, system.scene);
    flame.parent = system.root;
    flame.material = system.materials.volcanicSmokeWarm;
    flame.position.copyFrom(position.add(drift).add(new Vector3(
      (stableUnitNoise(system.nextId + index * 23) - 0.5) * 0.8,
      (stableUnitNoise(system.nextId + index * 29) - 0.5) * 0.35,
      (stableUnitNoise(system.nextId + index * 31) - 0.5) * 0.8
    )));
    flame.isPickable = false;
    system.airHitEffects.push({
      mesh: flame,
      age: 0,
      lifetime: 0.72,
      origin: flame.position.clone(),
      velocity: new Vector3(
        (stableUnitNoise(system.nextId + index * 37) - 0.5) * 0.8,
        0.55 + stableUnitNoise(system.nextId + index * 41) * 0.35,
        (stableUnitNoise(system.nextId + index * 43) - 0.5) * 0.8
      ),
      baseScale: new Vector3(0.45, 0.45, 0.45),
      grow: new Vector3(0.75, 0.65, 0.75),
      alpha: 0.74
    });
  }
}

function createScoutPlaneSmokePuff(system, position) {
  const id = `${system.nextId}_${system.airHitEffects.length}`;
  const puff = MeshBuilder.CreateSphere(`scout_plane_hit_smoke_${id}`, {
    diameter: 1.0,
    segments: 10
  }, system.scene);
  puff.parent = system.root;
  puff.material = system.materials.volcanicSmoke;
  puff.position.copyFrom(position.add(new Vector3(
    (stableUnitNoise(system.nextId + 17) - 0.5) * 1.2,
    -0.2 + stableUnitNoise(system.nextId + 23) * 0.5,
    (stableUnitNoise(system.nextId + 31) - 0.5) * 1.2
  )));
  puff.isPickable = false;
  system.airHitEffects.push({
    mesh: puff,
    age: 0,
    lifetime: 1.55,
    origin: puff.position.clone(),
    velocity: new Vector3(
      (stableUnitNoise(system.nextId + 41) - 0.5) * 0.7,
      1.15 + stableUnitNoise(system.nextId + 47) * 0.55,
      (stableUnitNoise(system.nextId + 53) - 0.5) * 0.7
    ),
    baseScale: new Vector3(0.7, 0.55, 0.7),
    grow: new Vector3(2.4, 1.8, 2.4),
    alpha: 0.56
  });
}

function createScoutPlaneAirExplosion(system, position) {
  const center = position.add(new Vector3(0, 0.15, 0));
  createAirExplosionCore(system, center);
  createAirExplosionLight(system, center);
  createAirExplosionDebris(system, center);
  createAirExplosionFireBloom(system, center);
  for (let i = 0; i < 10; i += 1) {
    const puff = MeshBuilder.CreateSphere(`scout_plane_explosion_smoke_${system.nextId}_${i}`, {
      diameter: 1.0,
      segments: 10
    }, system.scene);
    puff.parent = system.root;
    puff.material = i % 3 === 0 ? system.materials.volcanicSmokeWarm : system.materials.volcanicSmoke;
    puff.position.copyFrom(center);
    puff.isPickable = false;
    const angle = i * Math.PI * 0.25;
    const lateral = 2.2 + stableUnitNoise(system.nextId + i * 7) * 1.2;
    system.airHitEffects.push({
      mesh: puff,
      age: 0,
      lifetime: 1.7 + i * 0.045,
      origin: center.clone(),
      velocity: new Vector3(Math.cos(angle) * lateral, 0.75 + i * 0.07, Math.sin(angle) * lateral),
      baseScale: new Vector3(0.65, 0.65, 0.65),
      grow: new Vector3(2.8, 2.15, 2.8),
      alpha: i % 3 === 0 ? 0.5 : 0.44
    });
  }
}

function createAirExplosionFireBloom(system, position) {
  for (let i = 0; i < 5; i += 1) {
    const flame = MeshBuilder.CreateSphere(`scout_plane_explosion_fire_${system.nextId}_${i}`, {
      diameter: 1.0,
      segments: 10
    }, system.scene);
    flame.parent = system.root;
    flame.material = system.materials.volcanicSmokeWarm;
    flame.position.copyFrom(position);
    flame.isPickable = false;
    const angle = i * Math.PI * 0.4;
    system.airHitEffects.push({
      mesh: flame,
      age: 0,
      lifetime: 0.86 + i * 0.05,
      origin: position.clone(),
      velocity: new Vector3(Math.cos(angle) * 2.7, 1.0 + i * 0.08, Math.sin(angle) * 2.7),
      baseScale: new Vector3(0.75, 0.75, 0.75),
      grow: new Vector3(1.8, 1.45, 1.8),
      alpha: 0.66
    });
  }
}

function createAirExplosionDebris(system, position) {
  for (let i = 0; i < 16; i += 1) {
    const glowing = i < 6;
    const fragment = MeshBuilder.CreateBox(`scout_plane_explosion_fragment_${system.nextId}_${i}`, {
      width: glowing ? 0.22 : 0.34,
      height: glowing ? 0.08 : 0.11,
      depth: glowing ? 0.34 : 0.52
    }, system.scene);
    fragment.parent = system.root;
    fragment.material = glowing ? system.materials.explosionCore : system.materials.funnel;
    fragment.position.copyFrom(position);
    fragment.isPickable = false;
    const angle = i * 2.399;
    const speedOut = glowing ? 7.4 + stableUnitNoise(system.nextId + i * 5) * 4.6 : 4.8 + stableUnitNoise(system.nextId + i * 7) * 3.8;
    const lift = glowing ? 2.9 + stableUnitNoise(system.nextId + i * 11) * 1.7 : 1.2 + stableUnitNoise(system.nextId + i * 13) * 2.1;
    system.airHitEffects.push({
      mesh: fragment,
      age: 0,
      lifetime: glowing ? 1.75 : 2.85,
      origin: position.clone(),
      velocity: new Vector3(Math.cos(angle) * speedOut, lift, Math.sin(angle) * speedOut),
      gravity: glowing ? 4.1 : 5.2,
      baseScale: new Vector3(1, 1, 1),
      grow: glowing ? new Vector3(-0.45, -0.45, -0.45) : new Vector3(-0.2, -0.2, -0.2),
      alpha: glowing ? 0.92 : 0.66,
      spin: new Vector3(3.4 + i * 0.17, 4.2 + i * 0.11, 2.8 + i * 0.13)
    });
  }
}

function createAirExplosionCore(system, position) {
  const core = MeshBuilder.CreateSphere(`scout_plane_explosion_core_${system.nextId}`, {
    diameter: 3.0,
    segments: 12
  }, system.scene);
  core.parent = system.root;
  core.material = system.materials.explosionCore;
  core.position.copyFrom(position);
  core.isPickable = false;
  system.airHitEffects.push({
    mesh: core,
    age: 0,
    lifetime: 0.42,
    origin: position.clone(),
    velocity: Vector3.Zero(),
    baseScale: new Vector3(0.65, 0.65, 0.65),
    grow: new Vector3(2.7, 2.7, 2.7),
    alpha: 0.95
  });
}

function createAirExplosionLight(system, position) {
  const light = new PointLight(`scout_plane_explosion_light_${system.nextId}`, position.clone(), system.scene);
  light.diffuse = new Color3(1.0, 0.72, 0.36);
  light.specular = new Color3(1.0, 0.82, 0.52);
  light.intensity = 6.4;
  light.range = 145;
  system.airHitEffects.push({
    light,
    age: 0,
    lifetime: 0.72,
    intensity: 6.4,
    range: 145
  });
}

function updateAirHitEffect(effect, dt) {
  effect.age += dt;
  const t = effect.age / effect.lifetime;
  if (t >= 1) {
    disposeAirHitEffect(effect);
    return false;
  }

  const fade = 1 - t;
  if (effect.mesh) {
    effect.mesh.position.copyFrom(effect.origin.add(effect.velocity.scale(effect.age)));
    if (Number.isFinite(effect.gravity)) {
      effect.mesh.position.y -= effect.gravity * effect.age * effect.age * 0.5;
    }
    effect.mesh.scaling.set(
      effect.baseScale.x + effect.grow.x * t,
      effect.baseScale.y + effect.grow.y * t,
      effect.baseScale.z + effect.grow.z * t
    );
    effect.mesh.visibility = (effect.alpha ?? 0.5) * fade;
    if (effect.spin) {
      effect.mesh.rotation.x += effect.spin.x * dt;
      effect.mesh.rotation.y += effect.spin.y * dt;
      effect.mesh.rotation.z += effect.spin.z * dt;
    }
  }
  if (effect.light) {
    effect.light.intensity = effect.intensity * fade;
    effect.light.range = effect.range * (0.65 + t * 0.35);
  }
  return true;
}

function disposeAirHitEffect(effect) {
  effect.mesh?.dispose();
  effect.light?.dispose();
}

function disposeFlakProjectile(projectile) {
  projectile.disposed = true;
  projectile.light.dispose();
  projectile.trail.forEach((segment) => segment.dispose());
  projectile.root.getChildMeshes().forEach((mesh) => mesh.dispose());
  projectile.root.dispose();
}

function syncServerFlakProjectiles(projectiles, snapshotClientTime = time) {
  const activeFlakIds = new Set();
  const activeCannonIds = new Set();
  projectiles
    .filter((snapshot) => snapshot.shipId !== playerServerShipId)
    .forEach((snapshot) => {
      const system = isCannonServerProjectile(snapshot.id) ? cannonSystem : flakSystem;
      const visualId = getServerProjectileVisualId(snapshot);
      if (system === cannonSystem) {
        activeCannonIds.add(visualId);
      } else {
        activeFlakIds.add(visualId);
      }
      const visual = system.serverVisuals.get(visualId) ?? createServerFlakProjectile(system, snapshot, snapshotClientTime, visualId);
      applyServerFlakProjectileSnapshot(visual, snapshot, snapshotClientTime);
    });

  flakSystem.serverVisuals.forEach((visual, id) => {
    if (!activeFlakIds.has(id)) {
      disposeFlakProjectile(visual);
      flakSystem.serverVisuals.delete(id);
    }
  });
  cannonSystem.serverVisuals.forEach((visual, id) => {
    if (!activeCannonIds.has(id)) {
      disposeFlakProjectile(visual);
      cannonSystem.serverVisuals.delete(id);
    }
  });
}

function getServerProjectileVisualId(snapshot) {
  const firedAt = Number.isFinite(snapshot?.firedAt) ? snapshot.firedAt.toFixed(3) : "unknown";
  return `${snapshot?.id ?? "projectile"}@${firedAt}`;
}

function createServerFlakProjectile(system, snapshot, snapshotClientTime = time, visualId = getServerProjectileVisualId(snapshot)) {
  const isCannonProjectile = isCannonServerProjectile(snapshot.id);
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
  const visual = createFlakProjectile(system, position, velocity, direction, {
    trailSegments: isCannonProjectile ? 4 : 0
  });
  visual.serverId = snapshot.id;
  visual.weaponType = isCannonProjectile ? "cannon" : "flak";
  if (isCannonProjectile) {
    emphasizeServerCannonProjectile(visual);
  }
  visual.age = Math.max(0, snapshotClientTime - (Number.isFinite(snapshot.firedAt) ? snapshot.firedAt : snapshotClientTime));
  system.serverVisuals.set(visualId, visual);
  createRemoteMuzzleEffectForProjectile(snapshot);
  return visual;
}

function emphasizeServerCannonProjectile(visual) {
  visual.core?.scaling?.setAll(2.1);
  visual.trail?.forEach((segment, index) => {
    segment.scaling.setAll(1.85 - index * 0.18);
  });
  if (visual.light) {
    visual.light.intensity = 2.6;
    visual.light.range = 58;
  }
}

function createRemoteMuzzleEffectForProjectile(snapshot) {
  const motion = snapshot?.shipId ? enemyMotions.find((candidate) => candidate.id === snapshot.shipId) : null;
  if (!motion || motion.id === playerServerShipId || !motion.root?.isEnabled?.()) return;
  const isCannonProjectile = isCannonServerProjectile(snapshot.id);
  const shot = isCannonProjectile
    ? getCannonShotFromModel(motion.boat?.bowCannon, motion.heading, motion.speed)
    : getRemoteFlakShot(motion);
  const fallbackDirection = getProjectileDirectionFromSnapshot(snapshot);
  const muzzle = shot?.muzzle ?? new Vector3(
    Number.isFinite(snapshot.x) ? snapshot.x : motion.root.position.x,
    Number.isFinite(snapshot.y) ? snapshot.y : motion.root.position.y,
    Number.isFinite(snapshot.z) ? snapshot.z : motion.root.position.z
  );
  const direction = shot?.direction ?? fallbackDirection;
  if (isCannonProjectile) {
    triggerCannonBarrelRecoil(motion.boat?.bowCannon, time);
    createCannonMuzzleBlast(cannonSystem, muzzle, direction);
  } else {
    createFlakMuzzleFlash(flakSystem, muzzle, direction);
  }
}

function getRemoteFlakShot(motion) {
  return getFlakShotFromElevationRoot(
    motion?.boat?.sternFlak?.elevationRoot,
    0.75,
    null,
    getForwardVector(motion?.heading ?? 0).scale(motion?.speed ?? 0)
  );
}

function getProjectileDirectionFromSnapshot(snapshot) {
  const velocity = new Vector3(
    Number.isFinite(snapshot?.vx) ? snapshot.vx : 0,
    Number.isFinite(snapshot?.vy) ? snapshot.vy : 0,
    Number.isFinite(snapshot?.vz) ? snapshot.vz : 1
  );
  return velocity.lengthSquared() > 0.0001 ? velocity.normalizeToNew() : Vector3.Forward();
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
  const tubeStartZ = tuning.startZ;
  const waterEntryZ = tuning.waterEntryZ;
  const runStartZ = tuning.runStartZ;
  const launchStart = shipRoot.position
    .add(right.scale(tubeX))
    .add(forward.scale(tubeStartZ))
    .add(new Vector3(0, tuning.startY, 0));
  const muzzleEffectStart = shipRoot.position
    .add(right.scale(tubeX))
    .add(forward.scale(tubeStartZ))
    .add(new Vector3(0, tuning.startY, 0));
  const launchEnd = shipRoot.position
    .add(right.scale(tubeX))
    .add(forward.scale(waterEntryZ))
    .add(new Vector3(0, -0.04, 0));
  const muzzlePuffPoint = shipRoot.position
    .add(right.scale(tubeX))
    .add(forward.scale(waterEntryZ + 0.12))
    .add(new Vector3(0, 0.02, 0));
  const runStart = shipRoot.position
    .add(right.scale(tubeX))
    .add(forward.scale(runStartZ))
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
    speed: shipTorpedoBaseSpeed + Math.max(0, shipSpeed) * shipTorpedoSpeedGain,
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

function syncServerTorpedoes(torpedoes, impacts = [], snapshotReceivedAt = time, snapshotServerTime = null) {
  const activeIds = new Set();

  torpedoes.forEach((snapshot) => {
    activeIds.add(snapshot.id);
    const visual = torpedoSystem.serverVisuals.get(snapshot.id) ?? createServerTorpedoVisual(torpedoSystem, snapshot, snapshotReceivedAt, snapshotServerTime);
    applyServerTorpedoSnapshot(visual, snapshot, snapshotReceivedAt);
  });

  renderServerTorpedoImpacts(impacts);

  torpedoSystem.serverVisuals.forEach((visual, id) => {
    if (activeIds.has(id)) return;

    disposeServerTorpedoVisual(visual);
    torpedoSystem.serverVisuals.delete(id);
    torpedoSystem.serverSourceVehicleTypes.delete(id);
  });
  document.body.dataset.serverTorpedoVisuals = String(torpedoSystem.serverVisuals.size);
}

function renderServerTorpedoImpacts(impacts) {
  impacts.forEach((impact) => {
    const key = `${impact.id}:${impact.reason}:${impact.t}`;
    if (torpedoSystem.serverImpactIds.has(key)) return;
    torpedoSystem.serverImpactIds.add(key);
    const sourceVehicleType = torpedoSystem.serverSourceVehicleTypes.get(impact.id);
    notifyOwnWeaponImpact(impact, "Torpedo", "torpedo", sourceVehicleType === "scout-plane" ? sourceVehicleType : null);

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

function createServerTorpedoVisual(system, snapshot, snapshotReceivedAt = time, snapshotServerTime = null) {
  const root = new TransformNode(`server_torpedo_${snapshot.id}`, system.scene);
  root.parent = system.root;
  const launch = getServerTorpedoLaunch(system, snapshot, snapshotServerTime);
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

  const speedValue = Number.isFinite(snapshot.speed) ? snapshot.speed : fallbackServerTorpedoSpeed(launch);
  const launchIsBeingReplayed = launch.mode === "local-tube" || launch.mode === "air-drop";
  const initialRunDistance = launchIsBeingReplayed
    ? 0
    : Math.max(0, getServerTorpedoAge(snapshot, snapshotServerTime) * speedValue);

  const visual = {
    id: snapshot.id,
    root,
    body,
    nose,
    wake: createTorpedoWake(system.scene, system.materials, root.name),
    heading: Number.isFinite(snapshot.heading) ? snapshot.heading : 0,
    forward: getForwardVector(Number.isFinite(snapshot.heading) ? snapshot.heading : 0),
    speed: speedValue,
    serverPosition: new Vector3(snapshot.x, 0.05, snapshot.z),
    serverSnapshotTime: snapshotReceivedAt,
    runDistance: initialRunDistance,
    launchStart: launch.start.clone(),
    launchWaterStart: launch.waterStart?.clone?.() ?? null,
    launchRunStart: launch.runStart?.clone?.() ?? null,
    launchMode: launch.mode,
    launchBlendUntil: launch.blendUntil,
    launchBlendDuration: launch.blendDuration ?? 0.35,
    localTubeSideOffset: Number.isFinite(launch.sideOffset) ? launch.sideOffset : 0,
    localTubeReleased: launch.mode !== "local-tube",
    airDropSplashCreated: false,
    airDropSurfaced: launch.mode !== "air-drop",
    airDropSubmergedUntilDistance: launch.mode === "air-drop" ? airDroppedTorpedoSubmergedDistance : 0,
    airDropSplashPosition: launch.splashPosition?.clone?.() ?? null
  };
  system.serverVisuals.set(snapshot.id, visual);
  if (launch.sourceVehicleType === "scout-plane") {
    system.serverSourceVehicleTypes.set(snapshot.id, "scout-plane");
  }

  if (snapshot.shipId === playerServerShipId || snapshot.shipId === pendingPlayerServerShip?.id) {
    sendClientGameEvent("own-torpedo-visual-created", {
      torpedoId: snapshot.id,
      torpedoShipId: snapshot.shipId ?? "",
      launchMode: launch.mode,
      torpedoAge: Number(getServerTorpedoAge(snapshot, snapshotServerTime).toFixed(2)),
      initialRunDistance: Number(initialRunDistance.toFixed(2)),
      serverPosition: summarizeVector(visual.serverPosition),
      visualStart: summarizeVector(root.position),
      snapshotReceivedAt: Number(snapshotReceivedAt.toFixed(2)),
      snapshotServerTime: Number.isFinite(snapshotServerTime) ? Number(snapshotServerTime.toFixed(2)) : null,
      firedAt: Number.isFinite(snapshot.firedAt) ? Number(snapshot.firedAt.toFixed(2)) : null,
      serverClockOffset: Number.isFinite(serverClockOffset) ? Number(serverClockOffset.toFixed(3)) : null
    });
  }

  if (launch.showMuzzleEffect) {
    createLaunchPuff(system, launch.puffPosition, launch.heading, launch.tubeSide);
    createMuzzleEffect(system, launch.muzzlePosition, launch.heading, launch.tubeSide);
  }
  return visual;
}

function getServerTorpedoLaunch(system, snapshot, snapshotServerTime = null) {
  const heading = Number.isFinite(snapshot.heading) ? snapshot.heading : 0;
  const serverPosition = new Vector3(snapshot.x, 0.05, snapshot.z);
  const isOwnTorpedo = snapshot.shipId && (snapshot.shipId === playerServerShipId || snapshot.shipId === pendingPlayerServerShip?.id);
  const isPendingOwnTorpedo = snapshot.shipId && snapshot.shipId === pendingPlayerServerShip?.id;
  const shooterShip = snapshot.shipId ? serverShipsById.get(snapshot.shipId) : null;
  const shooterMotion = snapshot.shipId ? enemyMotions.find((motion) => motion.id === snapshot.shipId) : null;
  const isAirDropped = shooterShip?.vehicleType === "scout-plane" || shooterMotion?.vehicleType === "scout-plane";
  const torpedoAge = getServerTorpedoAge(snapshot, snapshotServerTime);
  const isFreshShipLaunch = torpedoAge <= serverTorpedoFreshLaunchSeconds;
  const isFreshAirDrop = torpedoAge <= airDroppedTorpedoFallSeconds + 0.15;

  if (isAirDropped && isFreshAirDrop) {
    const sourcePosition = shooterMotion?.root?.position
      ? shooterMotion.root.position.clone()
      : new Vector3(serverPosition.x, remoteVehicleY(shooterShip), serverPosition.z);
    sourcePosition.y = Math.max(8, sourcePosition.y - 0.7);
    document.body.dataset.serverTorpedoLaunch = "air-drop";
    return {
      mode: "air-drop",
      heading,
      start: sourcePosition,
      waterStart: serverPosition.clone(),
      splashPosition: serverPosition.clone(),
      puffPosition: serverPosition,
      muzzlePosition: serverPosition,
      tubeSide: 1,
      blendUntil: time + airDroppedTorpedoFallSeconds,
      blendDuration: airDroppedTorpedoFallSeconds,
      showMuzzleEffect: false,
      sourceVehicleType: "scout-plane"
    };
  }

  if (isOwnTorpedo && isFreshShipLaunch && boat?.root?.position && distance2D(boat.root.position, serverPosition) < 35) {
    const launchHeading = Number.isFinite(heading) ? heading : 0;
    const forward = getForwardVector(launchHeading);
    const right = getRightVector(launchHeading);
    const tuning = torpedoLaunchDefaults;
    const serverOffset = serverPosition.subtract(boat.root.position);
    const sideOffset = serverOffset.x * right.x + serverOffset.z * right.z;
    const snapshotTubeSide = snapshot.tubeSide === -1 || snapshot.tubeSide === 1 ? snapshot.tubeSide : null;
    const pendingTubeSide = system.pendingOwnTubeSide === -1 || system.pendingOwnTubeSide === 1
      ? system.pendingOwnTubeSide
      : null;
    const inferredTubeSide = Math.abs(sideOffset) > tuning.tubeX * 0.35
      ? Math.sign(sideOffset)
      : (system.nextTube === 0 ? -1 : 1);
    const tubeSide = snapshotTubeSide ?? pendingTubeSide ?? inferredTubeSide;
    if (pendingTubeSide !== null) {
      system.pendingOwnTubeSide = null;
    }
    system.nextTube = tubeSide < 0 ? 1 : 0;
    const tubeX = tubeSide * tuning.tubeX;
    const tubeStartZ = tuning.startZ;
    const waterEntryZ = tuning.waterEntryZ;
    const start = boat.root.position
      .add(right.scale(tubeX))
      .add(forward.scale(tubeStartZ))
      .add(new Vector3(0, tuning.startY, 0));
    const waterStart = boat.root.position
      .add(right.scale(tubeX))
      .add(forward.scale(waterEntryZ))
      .add(new Vector3(0, 0.05, 0));
    const runStart = boat.root.position
      .add(right.scale(tubeX))
      .add(forward.scale(tuning.runStartZ))
      .add(new Vector3(0, 0.05, 0));
    const puffPosition = boat.root.position
      .add(right.scale(tubeX))
      .add(forward.scale(waterEntryZ + 0.12))
      .add(new Vector3(0, 0.02, 0));
    const muzzlePosition = boat.root.position
      .add(right.scale(tubeX))
      .add(forward.scale(tubeStartZ))
      .add(new Vector3(0, tuning.startY, 0));

    document.body.dataset.ownServerTorpedoLaunch = "local";
    return {
      mode: "local-tube",
      heading: launchHeading,
      start,
      waterStart,
      runStart,
      puffPosition,
      muzzlePosition,
      tubeSide,
      sideOffset: tubeX,
      blendUntil: time + 0.35,
      blendDuration: 0.35,
      showMuzzleEffect: true,
      sourceVehicleType: null
    };
  }

  if (isAirDropped) {
    document.body.dataset.serverTorpedoLaunch = "air-drop-restored";
  }

  return {
    mode: isPendingOwnTorpedo ? "pending-own-server-position" : "server-position",
    heading,
    start: serverPosition,
    puffPosition: serverPosition,
    muzzlePosition: serverPosition,
    tubeSide: 1,
    blendUntil: 0,
    showMuzzleEffect: false,
    sourceVehicleType: isAirDropped ? "scout-plane" : null
  };
}

function fallbackServerTorpedoSpeed(launch) {
  return launch?.mode === "air-drop"
    ? shipTorpedoBaseSpeed * airTorpedoSpeedFactor
    : shipTorpedoBaseSpeed;
}

function getServerTorpedoAge(snapshot, snapshotServerTime = null) {
  if (!Number.isFinite(snapshot?.firedAt)) return 0;
  if (!Number.isFinite(snapshotServerTime)) return 0;
  return Math.max(0, snapshotServerTime - snapshot.firedAt);
}

function applyServerTorpedoSnapshot(visual, snapshot, snapshotReceivedAt = time) {
  visual.serverPosition = new Vector3(snapshot.x, 0.05, snapshot.z);
  visual.serverSnapshotTime = snapshotReceivedAt;
  visual.heading = Number.isFinite(snapshot.heading) ? snapshot.heading : visual.heading;
  visual.forward = getForwardVector(visual.heading);
  visual.speed = Number.isFinite(snapshot.speed) ? snapshot.speed : visual.speed;

  if (!visual.root.rotationQuaternion) {
    visual.root.rotationQuaternion = Quaternion.FromEulerAngles(0, visual.heading, 0);
  }
  const visualDistance = distance2D(visual.root.position, visual.serverPosition);
  if (!visual.reportedLargeCorrection && snapshot.shipId === playerServerShipId && visualDistance > 20) {
    visual.reportedLargeCorrection = true;
    sendClientGameEvent("torpedo-visual-large-correction", {
      torpedoId: snapshot.id,
      shipId: snapshot.shipId ?? "",
      distance: Number(visualDistance.toFixed(2)),
      visualPosition: summarizeVector(visual.root.position),
      serverPosition: summarizeVector(visual.serverPosition),
      snapshotReceivedAt: Number(snapshotReceivedAt.toFixed(2)),
      snapshotT: Number.isFinite(snapshot.t) ? Number(snapshot.t.toFixed(2)) : null
    });
  }
  if (time >= (visual.launchBlendUntil ?? 0) && distance2D(visual.root.position, visual.serverPosition) > 45) {
    visual.root.position.copyFrom(visual.serverPosition);
  }
}

function updateServerTorpedoVisuals(system, dt, now) {
  system.serverVisuals.forEach((visual) => {
    const forward = visual.forward;
    const right = getRightVector(visual.heading);
    const snapshotAge = Math.max(0, now - (visual.serverSnapshotTime ?? now));
    const projected = visual.serverPosition
      .add(forward.scale(visual.speed * snapshotAge))
      .add(right.scale(visual.localTubeSideOffset ?? 0));
    const step = visual.speed * dt;

    if (now < (visual.launchBlendUntil ?? 0) && visual.launchMode === "local-tube") {
      const duration = visual.launchBlendDuration || 0.35;
      const t = 1 - clamp((visual.launchBlendUntil - now) / duration, 0, 1);
      const eased = easeOutCubic(t);
      const waterStart = visual.launchWaterStart ?? visual.launchRunStart ?? visual.serverPosition;
      visual.root.position.x = visual.launchStart.x + (waterStart.x - visual.launchStart.x) * eased;
      visual.root.position.z = visual.launchStart.z + (waterStart.z - visual.launchStart.z) * eased;
      visual.root.position.y = visual.launchStart.y + (0.05 - visual.launchStart.y) * (t * t);
      visual.root.rotationQuaternion = Quaternion.FromEulerAngles(0.28 * (1 - eased), visual.heading, 0);
    } else if (now < (visual.launchBlendUntil ?? 0) && visual.launchMode === "air-drop") {
      const duration = visual.launchBlendDuration || airDroppedTorpedoFallSeconds;
      const t = 1 - clamp((visual.launchBlendUntil - now) / duration, 0, 1);
      const eased = easeInOutCubic(t);
      const waterStart = visual.launchWaterStart ?? visual.serverPosition;
      visual.root.position.x = visual.launchStart.x + (waterStart.x - visual.launchStart.x) * eased;
      visual.root.position.z = visual.launchStart.z + (waterStart.z - visual.launchStart.z) * eased;
      visual.root.position.y = visual.launchStart.y + (0.05 - visual.launchStart.y) * (t * t);
      visual.root.rotationQuaternion = Quaternion.FromEulerAngles(0.52 * (1 - eased), visual.heading, 0);
    } else {
      if (visual.launchMode === "local-tube" && !visual.localTubeReleased) {
        visual.localTubeReleased = true;
        if (visual.launchRunStart) {
          visual.root.position.copyFrom(visual.launchRunStart);
        }
      }
      if (visual.launchMode === "air-drop" && !visual.airDropSplashCreated) {
        visual.airDropSplashCreated = true;
        const splashPosition = visual.airDropSplashPosition ?? visual.root.position;
        visual.root.position.copyFrom(splashPosition);
        visual.root.position.y = -0.22;
        visual.body?.setEnabled(false);
        visual.nose?.setEnabled(false);
        createAirDroppedTorpedoSplash(system, splashPosition, visual.heading);
      }
      visual.root.position.addInPlace(forward.scale(step));
      visual.root.position.x += (projected.x - visual.root.position.x) * Math.min(1, dt * 4.5);
      visual.root.position.z += (projected.z - visual.root.position.z) * Math.min(1, dt * 4.5);
      if (visual.launchMode === "air-drop" && !visual.airDropSurfaced && visual.runDistance < visual.airDropSubmergedUntilDistance) {
        visual.root.position.y = -0.22;
      } else {
        if (visual.launchMode === "air-drop" && !visual.airDropSurfaced) {
          visual.airDropSurfaced = true;
          visual.body?.setEnabled(true);
          visual.nose?.setEnabled(true);
          createAirDroppedTorpedoSurfaceWake(system, visual.root.position, visual.heading);
        }
        visual.root.position.y = 0.05;
      }
      visual.root.rotationQuaternion = Quaternion.FromEulerAngles(0, visual.heading, 0);
    }
    visual.runDistance += step;
    updateTorpedoWake(visual, visual.root.position.y <= 0.08 && visual.airDropSurfaced !== false, now);
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
  const serverPosition = new Vector3(
    Number.isFinite(snapshot.x) ? snapshot.x : 0,
    Number.isFinite(snapshot.y) ? snapshot.y : 0,
    Number.isFinite(snapshot.z) ? snapshot.z : 0
  );
  const launch = getServerBombLaunch(snapshot, serverPosition, snapshotClientTime);
  root.position.copyFrom(launch.start);
  root.rotationQuaternion = Quaternion.FromEulerAngles(Math.PI / 2, Number.isFinite(snapshot.heading) ? snapshot.heading : 0, 0);

  const body = MeshBuilder.CreateCylinder(`${root.name}_body`, {
    diameter: 0.22,
    height: 0.88,
    tessellation: 12
  }, system.scene);
  body.parent = root;
  body.rotation.x = Math.PI / 2;
  body.material = system.materials.funnel;

  const nose = MeshBuilder.CreateCylinder(`${root.name}_nose`, {
    diameterTop: 0,
    diameterBottom: 0.22,
    height: 0.22,
    tessellation: 12
  }, system.scene);
  nose.parent = root;
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.55;
  nose.material = system.materials.funnel;

  const fin = MeshBuilder.CreateBox(`${root.name}_fin`, { width: 0.34, height: 0.05, depth: 0.14 }, system.scene);
  fin.parent = root;
  fin.position.z = -0.48;
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
    serverPosition,
    serverSnapshotTime: snapshotClientTime,
    launchStart: launch.start.clone(),
    launchBlendUntil: launch.blendUntil,
    launchBlendDuration: launch.blendDuration
  };
  system.serverVisuals.set(snapshot.id, visual);
  return visual;
}

function getServerBombLaunch(snapshot, serverPosition, snapshotClientTime = time) {
  const start = getServerBombLaunchPosition(snapshot);
  if (!start) {
    return { start: serverPosition, blendUntil: 0, blendDuration: 0 };
  }
  const needsIntroBlend = distance2D(start, serverPosition) > 0.05 || Math.abs(start.y - serverPosition.y) > 0.05;
  return {
    start,
    blendUntil: needsIntroBlend ? snapshotClientTime + 0.24 : 0,
    blendDuration: needsIntroBlend ? 0.24 : 0
  };
}

function getServerBombLaunchPosition(snapshot) {
  if (!Number.isFinite(snapshot.launchX) || !Number.isFinite(snapshot.launchY) || !Number.isFinite(snapshot.launchZ)) {
    return null;
  }
  return new Vector3(snapshot.launchX, snapshot.launchY, snapshot.launchZ);
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
  const finishedBombs = [];
  system.serverVisuals.forEach((visual) => {
    const forward = getForwardVector(visual.heading);
    const snapshotAge = Math.max(0, now - (visual.serverSnapshotTime ?? now));
    const projected = visual.serverPosition.add(forward.scale(visual.speed * snapshotAge));
    const verticalSpeed = Number.isFinite(visual.verticalSpeed) ? visual.verticalSpeed : 0;
    const projectedY = visual.serverPosition.y + verticalSpeed * snapshotAge - 0.5 * bombGravity * snapshotAge * snapshotAge;

    if (now < (visual.launchBlendUntil ?? 0)) {
      const duration = visual.launchBlendDuration || 0.24;
      const t = 1 - clamp((visual.launchBlendUntil - now) / duration, 0, 1);
      const eased = easeInOutCubic(t);
      visual.root.position.x = visual.launchStart.x + (projected.x - visual.launchStart.x) * eased;
      visual.root.position.y = visual.launchStart.y + (projectedY - visual.launchStart.y) * eased;
      visual.root.position.z = visual.launchStart.z + (projected.z - visual.launchStart.z) * eased;
      visual.root.rotationQuaternion = Quaternion.FromEulerAngles(Math.PI / 2, visual.heading, 0);
      return;
    }

    visual.root.position.addInPlace(forward.scale(visual.speed * dt));
    if (Number.isFinite(visual.verticalSpeed)) {
      visual.verticalSpeed -= bombGravity * dt;
      visual.root.position.y += visual.verticalSpeed * dt;
    }
    visual.root.position.x += (projected.x - visual.root.position.x) * Math.min(1, dt * 4.5);
    visual.root.position.y += (projectedY - visual.root.position.y) * Math.min(1, dt * 2);
    visual.root.position.z += (projected.z - visual.root.position.z) * Math.min(1, dt * 4.5);
    if (visual.root.position.y <= 0) {
      const impactKey = `visual-water:${visual.id}`;
      if (!system.serverImpactIds.has(impactKey)) {
        system.serverImpactIds.add(impactKey);
        createHitChurn(torpedoSystem, new Vector3(visual.root.position.x, 0.05, visual.root.position.z), visual.heading);
      }
      finishedBombs.push(visual.id);
      return;
    }
    visual.root.rotationQuaternion = Quaternion.FromEulerAngles(Math.PI / 2, visual.heading, 0);
  });
  finishedBombs.forEach((id) => {
    const visual = system.serverVisuals.get(id);
    if (!visual) return;
    disposeServerBombVisual(visual);
    system.serverVisuals.delete(id);
  });
}

function updateBombSightMarker(system, forward) {
  if (!system.sightMarker) return;
  if (!scoutPlaneMode || !bombBayViewActive || playerDamageState !== "active") {
    system.sightMarker.setEnabled(false);
    document.body.dataset.bombSight = "off";
    return;
  }

  const preview = getBombDropPreview();
  system.sightMarker.position.set(preview.centerImpact.x, 0.2, preview.centerImpact.z);
  system.sightMarker.rotation.y = preview.sightHeading;
  updateBombSightPattern(system.sightMarker, preview);
  system.sightMarker.setEnabled(true);
  document.body.dataset.bombSight = `${preview.centerImpact.x.toFixed(1)},${preview.centerImpact.z.toFixed(1)}`;
}

function updateBombSightPattern(marker, preview) {
  const parts = marker.metadata ?? {};
  const impactPoints = preview.impactPoints.map((point) => {
    return worldPointToBombSightLocal(point, { x: marker.position.x, z: marker.position.z }, marker.rotation.y);
  });
  const xs = impactPoints.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const centerX = 0;
  const centerZ = 0;
  const fixedSpreadXs = Array.from({ length: bombsPerDrop }, (_, index) => getBombPatternOffset(index));
  const fixedImpactWidth = Math.max(...fixedSpreadXs) - Math.min(...fixedSpreadXs);
  const impactWidth = Math.max(2.8, preview.bounds.width + 1.2, fixedImpactWidth + 1.2);
  const impactLength = Math.max(4.4, preview.bounds.length + 3.0);
  const armLength = bombSightArmLength;
  const gapX = impactWidth * 0.5;
  const gapZ = impactLength * 0.5;

  (parts.crossParts ?? []).forEach(({ mesh, part }) => {
    if (part === "upper" || part === "lower") {
      mesh.scaling.x = 1;
      mesh.scaling.z = armLength;
      mesh.position.x = centerX;
      mesh.position.z = centerZ + (part === "upper" ? gapZ + armLength * 0.5 : -gapZ - armLength * 0.5);
      return;
    }
    mesh.scaling.x = armLength;
    mesh.scaling.z = 1;
    mesh.position.x = centerX + (part === "right" ? gapX + armLength * 0.5 : -gapX - armLength * 0.5);
    mesh.position.z = centerZ;
  });
}

function renderServerBombImpacts(impacts) {
  impacts.forEach((impact) => {
    const key = `${impact.id}:${impact.reason}:${impact.t}`;
    if (bombSystem.serverImpactIds.has(key)) return;
    bombSystem.serverImpactIds.add(key);
    notifyOwnWeaponImpact(impact, "Bomben", "bomb", "scout-plane");

    const position = new Vector3(
      Number.isFinite(impact.x) ? impact.x : 0,
      0.05,
      Number.isFinite(impact.z) ? impact.z : 0
    );
    bombSystem.hits += 1;
    torpedoSystem.hits += 1;
    createHitChurn(torpedoSystem, position, Number.isFinite(impact.heading) ? impact.heading : 0);
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
  const side = tubeSide < 0 ? -1 : 1;

  for (let i = 0; i < 9; i += 1) {
    const seed = system.nextId * 29 + i * 13;
    const patch = createJaggedSurfacePatch(
      `torpedo_puff_${system.nextId}_${i}`,
      system.scene,
      0.22 + i * 0.04,
      0.28 + i * 0.06,
      seed
    );
    patch.parent = system.root;
    patch.material = system.materials.foam;
    const sideSpread = (stableUnitNoise(seed + 5) - 0.5) * 0.035;
    patch.position.copyFrom(
      position
        .add(forward.scale(i * 0.08))
        .add(right.scale(side * (0.055 + i * 0.018) + sideSpread))
        .add(new Vector3(0, -0.02, 0))
    );
    patch.rotation.y = heading;
    system.puffs.push({ mesh: patch, age: 0, lifetime: 0.52 + i * 0.035, seed: i });
  }
}

function createMuzzleEffect(system, position, heading, tubeSide) {
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);
  const side = tubeSide < 0 ? -1 : 1;

  for (let i = 0; i < 4; i += 1) {
    const seed = system.nextId * 43 + i * 17;
    const sizeJitter = 0.82 + stableUnitNoise(seed + 3) * 0.48;
    const sideJitter = (stableUnitNoise(seed + 7) - 0.5) * 0.025;
    const liftJitter = (stableUnitNoise(seed + 11) - 0.5) * 0.06;
    const steam = MeshBuilder.CreateSphere(`torpedo_muzzle_steam_${system.nextId}_${i}`, {
      diameter: (0.2 + i * 0.035) * sizeJitter,
      segments: 8
    }, system.scene);
    steam.parent = system.root;
    steam.material = system.materials.foam;
    steam.position.copyFrom(
      position
        .add(forward.scale(0.26 + i * 0.2 + stableUnitNoise(seed + 13) * 0.07))
        .add(right.scale(side * (0.07 + i * 0.022) + sideJitter))
        .add(new Vector3(0, 0.22 + i * 0.035 + liftJitter, 0))
    );
    steam.scaling.x = 1.12 + stableUnitNoise(seed + 19) * 0.45;
    steam.scaling.y = 0.72 + stableUnitNoise(seed + 23) * 0.24;
    steam.scaling.z = 0.82 + stableUnitNoise(seed + 29) * 0.52;
    steam.rotation.y = heading + (stableUnitNoise(seed + 31) - 0.5) * 0.42;
    system.muzzleEffects.push({
      mesh: steam,
      age: 0,
      lifetime: 0.42 + stableUnitNoise(seed + 37) * 0.16,
      seed: i + 1,
      kind: "steam",
      forward: forward.clone(),
      side
    });
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
    if (effect.kind === "steam") {
      const grow = 1 + t * 1.25;
      effect.mesh.scaling.x = grow;
      effect.mesh.scaling.z = 1 + t * 1.65;
      effect.mesh.position.addInPlace(effect.forward.scale(dt * (0.55 + effect.seed * 0.08)));
      effect.mesh.position.y += dt * (0.09 + effect.seed * 0.01);
      effect.mesh.rotation.y += dt * 0.18 * (effect.side || 1);
    } else {
      const scale = effect.kind === "ring" ? 1 + t * 1.7 : 1 + t * 0.8;
      effect.mesh.scaling.x = scale;
      effect.mesh.scaling.y = scale;
      effect.mesh.scaling.z = scale;
      effect.mesh.position.y += dt * (effect.kind === "ring" ? 0.04 : -0.02);
    }
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
  return getTorpedoBoatHullTopHalfWidthAt(forward);
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

function createAirDroppedTorpedoSplash(system, position, heading) {
  const splashPosition = new Vector3(position.x, 0.06, position.z);
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);
  const effectId = system.nextId++;
  createExplosionLightFlash(system, splashPosition);

  for (let i = 0; i < 10; i += 1) {
    const patch = createJaggedSurfacePatch(`air_torpedo_splash_${effectId}_${i}`, system.scene, 0.9 + i * 0.18, 0.58 + i * 0.09, effectId + i * 19);
    patch.parent = system.root;
    patch.material = system.materials.foam;
    patch.position.copyFrom(
      splashPosition
        .add(forward.scale((i - 2) * 0.08))
        .add(right.scale(((i % 3) - 1) * 0.14))
        .add(new Vector3(0, 0.006 + i * 0.003, 0))
    );
    patch.rotation.y = heading + i * 0.47;
    system.hitEffects.push({
      mesh: patch,
      age: 0,
      lifetime: 1.05 + i * 0.045,
      origin: patch.position.clone(),
      velocity: forward.scale(-0.052 * i).add(right.scale(((i % 2) * 2 - 1) * 0.085)).add(new Vector3(0, 0.042, 0)),
      gravity: 0.035,
      baseScale: patch.scaling.clone(),
      grow: new Vector3(2.15 + i * 0.18, 0.12, 1.5 + i * 0.13),
      seed: effectId + i
    });
  }

  for (let i = 0; i < 9; i += 1) {
    const spray = createJaggedHitWall(`air_torpedo_spray_${effectId}_${i}`, system.scene, 0.24 + i * 0.034, 0.66 + i * 0.1, effectId + i * 23);
    spray.parent = system.root;
    spray.material = system.materials.foam;
    spray.position.copyFrom(splashPosition.add(new Vector3(0, 0.2 + i * 0.035, 0)));
    spray.rotation.y = heading + (i - 2.5) * 0.22;
    system.hitEffects.push({
      mesh: spray,
      age: 0,
      lifetime: 0.7 + i * 0.04,
      origin: spray.position.clone(),
      velocity: forward.scale(0.2 + i * 0.034).add(right.scale((i - 4) * 0.145)).add(new Vector3(0, 0.82 + i * 0.065, 0)),
      gravity: 0.72,
      baseScale: spray.scaling.clone(),
      grow: new Vector3(0.96, 0.54, 0.96),
      seed: effectId + 60 + i
    });
  }
}

function createAirDroppedTorpedoSurfaceWake(system, position, heading) {
  const surfacePosition = new Vector3(position.x, 0.055, position.z);
  const forward = getForwardVector(heading);
  const right = getRightVector(heading);
  const effectId = system.nextId++;

  for (let i = 0; i < 5; i += 1) {
    const patch = createJaggedSurfacePatch(`air_torpedo_surface_${effectId}_${i}`, system.scene, 0.46 + i * 0.1, 0.3 + i * 0.045, effectId + i * 29);
    patch.parent = system.root;
    patch.material = system.materials.foam;
    patch.position.copyFrom(
      surfacePosition
        .add(forward.scale(-0.18 - i * 0.08))
        .add(right.scale((i - 2) * 0.07))
        .add(new Vector3(0, 0.004 + i * 0.002, 0))
    );
    patch.rotation.y = heading + i * 0.36;
    system.hitEffects.push({
      mesh: patch,
      age: 0,
      lifetime: 0.55 + i * 0.035,
      origin: patch.position.clone(),
      velocity: forward.scale(-0.08 - i * 0.02).add(right.scale((i - 2) * 0.025)),
      gravity: 0.02,
      baseScale: patch.scaling.clone(),
      grow: new Vector3(1.1 + i * 0.12, 0.06, 0.78 + i * 0.08),
      seed: effectId + i
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

function createFleetPartMaterial(scene, fleetId, part, palette) {
  const material = new StandardMaterial(`${fleetId}_party_${part}_material`, scene);
  material.diffuseColor = new Color3(...palette.diffuse);
  material.specularColor = new Color3(...palette.specular);
  if (palette.emissive) {
    material.emissiveColor = new Color3(...palette.emissive);
  }
  material.backFaceCulling = true;
  return material;
}

function createFleetMaterials(scene, fleetId, palette) {
  const bodyMaterial = createFleetPartMaterial(scene, fleetId, "body", palette.body);
  return {
    hull: bodyMaterial,
    deck: bodyMaterial,
    cabin: bodyMaterial,
    funnel: bodyMaterial
  };
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

  const lightBridgeWindow = new StandardMaterial("light_bridge_window_material", scene);
  lightBridgeWindow.diffuseColor = new Color3(0.09, 0.1, 0.105);
  lightBridgeWindow.emissiveColor = new Color3(0.012, 0.014, 0.016);
  lightBridgeWindow.specularColor = new Color3(0.32, 0.36, 0.38);
  lightBridgeWindow.backFaceCulling = false;

  const darkBridgeWindow = new StandardMaterial("dark_bridge_window_material", scene);
  darkBridgeWindow.diffuseColor = new Color3(0.025, 0.06, 0.095);
  darkBridgeWindow.emissiveColor = new Color3(0.004, 0.014, 0.028);
  darkBridgeWindow.specularColor = new Color3(0.18, 0.28, 0.36);
  darkBridgeWindow.backFaceCulling = false;

  const lightFleetMaterials = createFleetMaterials(scene, "light", shipFleetMaterialPalettes.light);
  const playerLightFleetMaterials = createFleetMaterials(scene, "player_light", shipFleetMaterialPalettes.light);
  const darkFleetMaterials = createFleetMaterials(scene, "dark", shipFleetMaterialPalettes.dark);
  const greenFleetMaterials = createFleetMaterials(scene, "green", shipFleetMaterialPalettes.green);
  const sandFleetMaterials = createFleetMaterials(scene, "sand", shipFleetMaterialPalettes.sand);

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

  const flakHitboxDebug = new StandardMaterial("flak_hitbox_debug_material", scene);
  flakHitboxDebug.diffuseColor = new Color3(0.38, 0.95, 1.0);
  flakHitboxDebug.emissiveColor = new Color3(0.18, 0.62, 0.72);
  flakHitboxDebug.specularColor = Color3.Black();
  flakHitboxDebug.alpha = 0.18;
  flakHitboxDebug.wireframe = true;
  flakHitboxDebug.disableLighting = true;
  flakHitboxDebug.backFaceCulling = false;

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
    lightBridgeWindow,
    darkBridgeWindow,
    lightHull: lightFleetMaterials.hull,
    lightDeck: lightFleetMaterials.deck,
    lightCabin: lightFleetMaterials.cabin,
    lightFunnel: lightFleetMaterials.funnel,
    playerLightHull: playerLightFleetMaterials.hull,
    playerLightDeck: playerLightFleetMaterials.deck,
    playerLightCabin: playerLightFleetMaterials.cabin,
    playerLightFunnel: playerLightFleetMaterials.funnel,
    darkHull: darkFleetMaterials.hull,
    darkDeck: darkFleetMaterials.deck,
    darkCabin: darkFleetMaterials.cabin,
    darkFunnel: darkFleetMaterials.funnel,
    greenHull: greenFleetMaterials.hull,
    greenDeck: greenFleetMaterials.deck,
    greenCabin: greenFleetMaterials.cabin,
    greenFunnel: greenFleetMaterials.funnel,
    sandHull: sandFleetMaterials.hull,
    sandDeck: sandFleetMaterials.deck,
    sandCabin: sandFleetMaterials.cabin,
    sandFunnel: sandFleetMaterials.funnel,
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
    beaconBeam,
    flakHitboxDebug
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
    context.lineWidth = i % 3 === 0 ? 1.35 : 0.75;

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
  const waveTravelAngle = windAngle + Math.PI / 2;

  for (let i = 0; i < count; i += 1) {
    const seed = seededFoam(i);
    const foamLength = openSeaFoamLengthMin + seed.length * openSeaFoamLengthVariance;
    const patch = MeshBuilder.CreateBox(`foam_patch_${i}`, {
      width: openSeaFoamWidthMin + seed.width * openSeaFoamWidthVariance,
      height: openSeaFoamHeight,
      depth: foamLength
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
      checkLength: foamLength,
      driftX: Math.sin(waveTravelAngle) * openSeaFoamDriftSpeed + (seed.driftX - 0.5) * openSeaFoamRandomDrift,
      driftZ: Math.cos(waveTravelAngle) * openSeaFoamDriftSpeed + (seed.driftZ - 0.5) * openSeaFoamRandomDrift,
      baseAngle: windAngle,
      baseLength: 0.86 + seed.length * 0.18,
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
function createPlayerBow(scene, materials, name = "player_bow", teamId = "light", designation = "") {
  const root = new TransformNode(name, scene);
  const teamMaterials = getPlayerShipTeamMaterials(materials, teamId);
  const hullMaterial = teamMaterials.hull;
  const deckMaterial = teamMaterials.deck;
  const tubeMaterial = teamMaterials.hull;

  const hull = createBoatHullMesh(`${name}_hull`, scene);
  hull.parent = root;
  hull.material = hullMaterial;

  const deck = createBoatDeckMesh(`${name}_deck`, scene);
  deck.parent = root;
  deck.material = deckMaterial;
  const bowBulwarkCap = createBoatBowBulwarkCapMesh(`${name}_bow_bulwark_cap`, scene);
  bowBulwarkCap.parent = root;
  bowBulwarkCap.material = hullMaterial;
  const superstructureMeshes = createTorpedoBoatSuperstructure(scene, materials, root, name, teamMaterials, true);

  for (let i = 0; i < 2; i += 1) {
    const tube = MeshBuilder.CreateCylinder(`${name}_torpedo_tube_${i}`, {
      diameter: 0.14,
      height: 1.76,
      tessellation: 12
    }, scene);
    tube.parent = root;
    tube.position.x = i === 0 ? -0.56 : 0.56;
    tube.position.y = 0.795;
    tube.position.z = 1.38;
    tube.rotation.x = Math.PI / 2;
    tube.material = tubeMaterial;

    for (let j = 0; j < 2; j += 1) {
      const saddle = MeshBuilder.CreateBox(`${name}_torpedo_saddle_${i}_${j}`, { width: 0.2, height: 0.08, depth: 0.12 }, scene);
      saddle.parent = root;
      saddle.position.x = tube.position.x;
      saddle.position.y = 0.755;
      saddle.position.z = 0.8 + j * 0.74;
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
    cap.position.z = 2.26;
    cap.rotation.x = Math.PI / 2;
    cap.material = tubeMaterial;
  }

  const hatch = MeshBuilder.CreateBox(`${name}_deck_hatch`, { width: 0.46, height: 0.11, depth: 0.52 }, scene);
  hatch.parent = root;
  hatch.position.y = 0.91;
  hatch.position.z = -0.56;
  hatch.material = teamMaterials.cabin;

  const bowCannon = createBowCannon(scene, materials, root, name, teamMaterials, 2.54, true);
  const sternFlak = createSternFlak(scene, materials, root, name, teamMaterials, playerSternFlakZ, true);

  return {
    root,
    bowCannon,
    sternFlak,
    flakDeckView: null,
    flakViewHiddenMeshes: sternFlak.viewHiddenMeshes ?? [],
    cannonViewHiddenMeshes: bowCannon.viewHiddenMeshes ?? [],
    bridgeViewHiddenMeshes: superstructureMeshes.filter((mesh) => (
      mesh.name.includes("_bridge_base")
      || mesh.name.includes("_bridge_house")
      || mesh.name.includes("_bridge_window")
    ))
  };
}

function createScoutPlane(scene, materials, name = "scout_plane", teamId = "light", isPlayer = false) {
  const root = new TransformNode(name, scene);
  const teamMaterials = isPlayer ? getPlayerShipTeamMaterials(materials, teamId) : getShipTeamMaterials(materials, teamId);
  const bodyMaterial = createScoutPlaneMaterial(scene, `${name}_body_material`, teamMaterials.cabin.diffuseColor, 1);
  const wingMaterial = createScoutPlaneMaterial(scene, `${name}_wing_material`, teamMaterials.hull.diffuseColor, 1);

  const fuselage = MeshBuilder.CreateBox(`${name}_fuselage`, { width: 0.95, height: 0.48, depth: 7.15 }, scene);
  fuselage.parent = root;
  fuselage.position.z = -0.1;
  fuselage.material = bodyMaterial;

  const nose = MeshBuilder.CreateCylinder(`${name}_nose`, {
    diameterTop: 0.12,
    diameterBottom: 0.9,
    height: 0.92,
    tessellation: 12
  }, scene);
  nose.parent = root;
  nose.position.z = 3.95;
  nose.rotation.x = Math.PI / 2;
  nose.material = bodyMaterial;

  const cockpit = MeshBuilder.CreateBox(`${name}_cockpit`, { width: 0.56, height: 0.28, depth: 1.05 }, scene);
  cockpit.parent = root;
  cockpit.position.y = 0.36;
  cockpit.position.z = 1.2;
  cockpit.material = bodyMaterial;

  const wing = MeshBuilder.CreateBox(`${name}_wing`, { width: 10.8, height: 0.14, depth: 1.38 }, scene);
  wing.parent = root;
  wing.position.z = 0.28;
  wing.material = wingMaterial;

  const bombBay = MeshBuilder.CreateBox(`${name}_bomb_bay`, { width: 0.64, height: 0.08, depth: 1.35 }, scene);
  bombBay.parent = root;
  bombBay.position.y = -0.28;
  bombBay.position.z = -0.45;
  bombBay.material = materials.funnel;

  const tailWing = MeshBuilder.CreateBox(`${name}_tail_wing`, { width: 3.45, height: 0.1, depth: 0.66 }, scene);
  tailWing.parent = root;
  tailWing.position.z = -3.36;
  tailWing.position.y = 0.08;
  tailWing.material = wingMaterial;

  const fin = MeshBuilder.CreateBox(`${name}_fin`, { width: 0.14, height: 0.94, depth: 0.7 }, scene);
  fin.parent = root;
  fin.position.y = 0.54;
  fin.position.z = -3.68;
  fin.material = wingMaterial;

  const propellerRoots = [-2.35, 2.35].map((x, index) => {
    const engine = MeshBuilder.CreateCylinder(`${name}_engine_${index + 1}`, {
      diameter: 0.58,
      height: 1.18,
      tessellation: 14
    }, scene);
    engine.parent = root;
    engine.position.x = x;
    engine.position.y = -0.03;
    engine.position.z = 0.76;
    engine.rotation.x = Math.PI / 2;
    engine.material = bodyMaterial;

    const cowling = MeshBuilder.CreateCylinder(`${name}_engine_cowling_${index + 1}`, {
      diameterTop: 0.5,
      diameterBottom: 0.62,
      height: 0.28,
      tessellation: 14
    }, scene);
    cowling.parent = root;
    cowling.position.x = x;
    cowling.position.y = -0.03;
    cowling.position.z = 1.47;
    cowling.rotation.x = Math.PI / 2;
    cowling.material = materials.funnel;

    const propellerRoot = new TransformNode(`${name}_propeller_root_${index + 1}`, scene);
    propellerRoot.parent = root;
    propellerRoot.position.x = x;
    propellerRoot.position.y = -0.03;
    propellerRoot.position.z = 1.66;
    const propellerA = MeshBuilder.CreateBox(`${name}_propeller_${index + 1}_a`, { width: 0.13, height: 1.34, depth: 0.04 }, scene);
    propellerA.parent = propellerRoot;
    propellerA.material = materials.funnel;
    const propellerB = MeshBuilder.CreateBox(`${name}_propeller_${index + 1}_b`, { width: 1.34, height: 0.13, depth: 0.04 }, scene);
    propellerB.parent = propellerRoot;
    propellerB.material = materials.funnel;
    return propellerRoot;
  });

  if (flakHitboxDebugEnabled) {
    addScoutPlaneFlakHitboxDebug(scene, materials, root, name);
  }

  return { root, propellerRoot: propellerRoots[0], propellerRoots };
}

function addScoutPlaneFlakHitboxDebug(scene, materials, root, name) {
  const verticalSize = 4.5;
  const parts = [
    { suffix: "fuselage", width: 3.3, height: verticalSize, depth: 9.2, z: 0 },
    { suffix: "wing", width: 10.5, height: verticalSize, depth: 3.6, z: 0.25 },
    { suffix: "tail", width: 5.1, height: verticalSize, depth: 2.95, z: -2.475 }
  ];

  parts.forEach((part) => {
    const box = MeshBuilder.CreateBox(`${name}_flak_hitbox_${part.suffix}`, {
      width: part.width,
      height: part.height,
      depth: part.depth
    }, scene);
    box.parent = root;
    box.position.z = part.z;
    box.material = materials.flakHitboxDebug;
    box.isPickable = false;
  });
}

function createScoutPlaneMaterial(scene, name, color, alpha) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.08, 0.09, 0.09);
  material.alpha = alpha;
  material.backFaceCulling = alpha < 1 ? false : true;
  return material;
}

function updateScoutPlaneVisual(plane, speed, time) {
  const roots = plane.propellerRoots ?? (plane.propellerRoot ? [plane.propellerRoot] : []);
  const propellerRate = Math.max(16, Math.abs(speed) * 11.5);
  roots.forEach((propellerRoot, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    propellerRoot.rotation.z = direction * (time * propellerRate + index * Math.PI * 0.5);
  });
  if (!plane.propellerRoot && roots[0]) {
    plane.propellerRoot = roots[0];
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

  return createMeshFromData(name, scene, positions, indices, { reverseFaces: true });
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
    pushOrientedQuad(indices, positions, a, a + 1, b + 1, b, Vector3.Up());
  }

  return createMeshFromData(name, scene, positions, indices, { reverseFaces: true });
}

function torpedoBoatHullSections() {
  return [
    { z: -4.2, topWidth: 0.62, chineWidth: 0.5, top: 0.52, chine: 0.2, keel: 0.02 },
    { z: -3.45, topWidth: 1.06, chineWidth: 0.86, top: 0.54, chine: 0.18, keel: -0.02 },
    { z: -2.25, topWidth: 1.46, chineWidth: 1.18, top: 0.56, chine: 0.16, keel: -0.04 },
    { z: -1.1, topWidth: 1.58, chineWidth: 1.28, top: 0.57, chine: 0.15, keel: -0.05 },
    { z: -0.22, topWidth: 1.58, chineWidth: 1.28, top: 0.57, chine: 0.15, keel: -0.05 },
    { z: -0.04, topWidth: 1.56, chineWidth: 1.24, top: 0.74, chine: 0.15, keel: -0.05 },
    { z: 1.25, topWidth: 1.34, chineWidth: 1.06, top: 0.74, chine: 0.14, keel: -0.04 },
    { z: 2.42, topWidth: 0.872, chineWidth: 0.67, top: 0.74, chine: 0.121, keel: -0.021 },
    { z: 2.452, topWidth: 0.859, chineWidth: 0.658, top: 0.74, chine: 0.12, keel: -0.02 },
    { z: 2.469, topWidth: 0.849, chineWidth: 0.651, top: 0.74, chine: 0.119, keel: -0.019 },
    { z: 2.72, topWidth: 0.7, chineWidth: 0.52, top: 0.736, chine: 0.112, keel: -0.008 },
    { z: 3.18, topWidth: 0.42, chineWidth: 0.28, top: 0.73, chine: 0.1, keel: 0.01 },
    { z: 3.68, topWidth: 0.02, chineWidth: 0.02, top: 0.73, chine: 0.1, keel: 0.04 }
  ];
}

function getTorpedoBoatDeckY(z) {
  const sections = torpedoBoatHullSections();
  if (z <= sections[0].z) return sections[0].top;
  for (let i = 0; i < sections.length - 1; i += 1) {
    const from = sections[i];
    const to = sections[i + 1];
    if (z <= to.z) {
      const t = (z - from.z) / (to.z - from.z);
      return from.top + (to.top - from.top) * t;
    }
  }
  return sections[sections.length - 1].top;
}

function getTorpedoBoatBowBulwarkLift(z) {
  const lift = 0.13;
  const rampAngle = 67.5 * Math.PI / 180;
  const aftDropEndZ = 2.42;
  const flatFrontStartZ = aftDropEndZ + lift / Math.tan(rampAngle);
  if (z <= aftDropEndZ) return 0;
  if (z >= flatFrontStartZ) return lift;
  return ((z - aftDropEndZ) / (flatFrontStartZ - aftDropEndZ)) * lift;
}

function createBoatHullMesh(name, scene) {
  const sections = torpedoBoatHullSections();
  const positions = [];
  const indices = [];

  sections.forEach((section) => {
    const top = section.topWidth / 2;
    const chine = section.chineWidth / 2;
    const topY = section.top + getTorpedoBoatBowBulwarkLift(section.z);
    positions.push(
      -top, topY, section.z,
      top, topY, section.z,
      -chine, section.chine, section.z,
      chine, section.chine, section.z,
      0, section.keel, section.z
    );
  });

  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = i * 5;
    const b = (i + 1) * 5;
    pushOrientedQuad(indices, positions, a, a + 2, b + 2, b, new Vector3(-1, 0, 0));
    pushOrientedQuad(indices, positions, a + 1, b + 1, b + 3, a + 3, new Vector3(1, 0, 0));
    pushOrientedQuad(indices, positions, a + 2, a + 4, b + 4, b + 2, new Vector3(-1, -0.2, 0));
    pushOrientedQuad(indices, positions, a + 3, b + 3, b + 4, a + 4, new Vector3(1, -0.2, 0));
  }

  pushOrientedTriangle(indices, positions, 0, 2, 4, new Vector3(0, 0, -1));
  pushOrientedTriangle(indices, positions, 0, 4, 3, new Vector3(0, 0, -1));
  pushOrientedTriangle(indices, positions, 0, 3, 1, new Vector3(0, 0, -1));
  const last = (sections.length - 1) * 5;
  pushOrientedTriangle(indices, positions, last, last + 4, last + 2, new Vector3(0, 0, 1));
  pushOrientedTriangle(indices, positions, last, last + 3, last + 4, new Vector3(0, 0, 1));
  pushOrientedTriangle(indices, positions, last, last + 1, last + 3, new Vector3(0, 0, 1));

  return createMeshFromData(name, scene, positions, indices, { reverseFaces: true });
}

function createBoatDeckMesh(name, scene) {
  const sections = torpedoBoatHullSections();
  const positions = [];
  const indices = [];

  sections.forEach((section) => {
    const halfWidth = Math.max(0.01, section.topWidth / 2 - 0.004);
    positions.push(
      -halfWidth, section.top + 0.004, section.z,
      halfWidth, section.top + 0.004, section.z
    );
  });

  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = i * 2;
    const b = (i + 1) * 2;
    pushOrientedQuad(indices, positions, a, a + 1, b + 1, b, Vector3.Up());
  }

  return createMeshFromData(name, scene, positions, indices, { reverseFaces: true });
}

function createBoatBowBulwarkCapMesh(name, scene) {
  const sections = torpedoBoatHullSections().filter((section) => section.z >= 2.42);
  const positions = [];
  const indices = [];

  [-1, 1].forEach((side) => {
    const start = positions.length / 3;
    sections.forEach((section) => {
      const halfWidth = section.topWidth * 0.5;
      const rimWidth = Math.min(0.065, halfWidth * 0.55);
      const outerX = side * halfWidth;
      const innerX = side * Math.max(0, halfWidth - rimWidth);
      const topY = section.top + getTorpedoBoatBowBulwarkLift(section.z);
      positions.push(
        outerX, topY, section.z,
        innerX, topY, section.z,
        innerX, section.top + 0.006, section.z
      );
    });

    for (let i = 0; i < sections.length - 1; i += 1) {
      const a = start + i * 3;
      const b = a + 3;
      pushOrientedQuad(indices, positions, a, b, b + 1, a + 1, Vector3.Up());
      pushOrientedQuad(indices, positions, a + 1, b + 1, b + 2, a + 2, new Vector3(-side, 0, 0));
    }
  });

  return createMeshFromData(name, scene, positions, indices, { reverseFaces: true });
}

function createDeckFittedBox(name, scene, width, height, depth, z, extra = -0.004) {
  const halfWidth = width * 0.5;
  const backZ = z - depth * 0.5;
  const frontZ = z + depth * 0.5;
  const backBottomY = getTorpedoBoatDeckY(backZ) + extra;
  const frontBottomY = getTorpedoBoatDeckY(frontZ) + extra;
  const topY = Math.max(backBottomY, frontBottomY) + height;
  const mesh = createBoxMeshFromCorners(name, scene, {
    minX: -halfWidth,
    maxX: halfWidth,
    backBottomY,
    frontBottomY,
    topY,
    backZ,
    frontZ
  });
  mesh.metadata = { ...(mesh.metadata ?? {}), deckTopY: topY };
  return mesh;
}

function createDeckStandingBox(name, scene, width, height, depth, z, extra = -0.004) {
  const halfWidth = width * 0.5;
  const backZ = z - depth * 0.5;
  const frontZ = z + depth * 0.5;
  const bottomY = Math.min(getTorpedoBoatDeckY(backZ), getTorpedoBoatDeckY(frontZ)) + extra;
  const topY = bottomY + height;
  const mesh = createBoxMeshFromCorners(name, scene, {
    minX: -halfWidth,
    maxX: halfWidth,
    backBottomY: bottomY,
    frontBottomY: bottomY,
    topY,
    backZ,
    frontZ
  });
  mesh.metadata = { ...(mesh.metadata ?? {}), deckTopY: topY };
  return mesh;
}

function createBoxMeshFromCorners(name, scene, bounds) {
  const { minX, maxX, backBottomY, frontBottomY, topY, backZ, frontZ } = bounds;
  const positions = [
    minX, backBottomY, backZ,
    maxX, backBottomY, backZ,
    minX, frontBottomY, frontZ,
    maxX, frontBottomY, frontZ,
    minX, topY, backZ,
    maxX, topY, backZ,
    minX, topY, frontZ,
    maxX, topY, frontZ
  ];
  const indices = [];
  pushOrientedQuad(indices, positions, 4, 5, 7, 6, Vector3.Up());
  pushOrientedQuad(indices, positions, 0, 2, 6, 4, new Vector3(-1, 0, 0));
  pushOrientedQuad(indices, positions, 1, 5, 7, 3, new Vector3(1, 0, 0));
  pushOrientedQuad(indices, positions, 0, 4, 5, 1, new Vector3(0, 0, -1));
  pushOrientedQuad(indices, positions, 2, 3, 7, 6, new Vector3(0, 0, 1));
  pushOrientedQuad(indices, positions, 0, 1, 3, 2, Vector3.Down());

  return createMeshFromData(name, scene, positions, indices, { flatShaded: true, reverseFaces: true });
}

function createShipDesignationPlates(scene, parent, name, designation) {
  if (!designation) return [];

  const material = createShipDesignationMaterial(scene, `${name}_designation_material`, designation);
  const sternPlate = MeshBuilder.CreatePlane(`${name}_stern_designation_plate`, {
    width: 0.5,
    height: 0.2
  }, scene);
  sternPlate.parent = parent;
  sternPlate.position.x = 0;
  sternPlate.position.y = 0.39;
  sternPlate.position.z = -4.214;
  sternPlate.rotation.y = Math.PI;
  sternPlate.scaling.x = -1;
  sternPlate.material = material;
  sternPlate.isPickable = false;

  return [sternPlate];
}

function createShipDesignationMaterial(scene, name, designation) {
  const texture = new DynamicTexture(`${name}_texture`, { width: 256, height: 96 }, scene, true);
  texture.hasAlpha = true;
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 256, 96);
  const maxTextWidth = 222;
  let fontSize = 46;
  do {
    ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
    fontSize -= 2;
  } while (ctx.measureText(designation).width > maxTextWidth && fontSize >= 28);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.16));
  ctx.strokeStyle = "rgba(3, 12, 16, 0.92)";
  ctx.fillStyle = "rgba(235, 242, 238, 0.98)";
  ctx.strokeText(designation, 128, 50);
  ctx.fillText(designation, 128, 50);
  texture.update(false);

  const material = new StandardMaterial(name, scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  material.specularColor = new Color3(0.04, 0.05, 0.05);
  material.emissiveColor = new Color3(0.42, 0.46, 0.43);
  return material;
}

function getBridgeWindowMaterial(materials, teamMaterials) {
  const color = teamMaterials.cabin?.diffuseColor;
  const brightness = color ? (color.r + color.g + color.b) / 3 : 0;
  return brightness > 0.28
    ? materials.lightBridgeWindow
    : materials.darkBridgeWindow;
}

function createTorpedoBoatSuperstructure(scene, materials, parent, name, teamMaterials, includeWindows = true) {
  const cabinMaterial = teamMaterials.cabin;
  const funnelMaterial = teamMaterials.funnel;
  const meshes = [];

  const aftDeckhouse = createDeckFittedBox(`${name}_aft_deckhouse`, scene, 0.92, 0.18, 0.58, -0.02);
  aftDeckhouse.parent = parent;
  aftDeckhouse.material = cabinMaterial;
  meshes.push(aftDeckhouse);

  const bridgeBase = createDeckFittedBox(`${name}_bridge_base`, scene, 0.82, 0.414, 0.76, 0.64);
  bridgeBase.parent = parent;
  bridgeBase.material = cabinMaterial;
  meshes.push(bridgeBase);

  const bridgeHouseHeight = 0.2898;
  const bridgeHouseWidth = 0.72;
  const bridgeHouseDepth = 0.46;
  const bridgeHouseZ = 0.72;
  const bridgeHouseBottomY = bridgeBase.metadata.deckTopY;
  const bridgeHouseTopY = bridgeHouseBottomY + bridgeHouseHeight;
  const bridgeHouse = createBoxMeshFromCorners(`${name}_bridge_house`, scene, {
    minX: -bridgeHouseWidth * 0.5,
    maxX: bridgeHouseWidth * 0.5,
    backBottomY: bridgeHouseBottomY,
    frontBottomY: bridgeHouseBottomY,
    topY: bridgeHouseTopY,
    backZ: bridgeHouseZ - bridgeHouseDepth * 0.5,
    frontZ: bridgeHouseZ + bridgeHouseDepth * 0.5
  });
  bridgeHouse.parent = parent;
  bridgeHouse.material = cabinMaterial;
  meshes.push(bridgeHouse);

  if (includeWindows) {
    const windowHeight = 0.074;
    const windowWidth = 0.078;
    const windowDepth = 0.012;
    const windowGap = 0.032;
    const windowCount = 5;
    const windowMaterial = getBridgeWindowMaterial(materials, teamMaterials);
    for (let i = 0; i < windowCount; i += 1) {
      const window = MeshBuilder.CreateBox(`${name}_bridge_window_${i}`, {
        width: windowWidth,
        height: windowHeight,
        depth: windowDepth
      }, scene);
      window.parent = parent;
      window.position.x = (i - (windowCount - 1) * 0.5) * (windowWidth + windowGap);
      window.position.y = bridgeHouseBottomY + bridgeHouseHeight * 0.62;
      window.position.z = bridgeHouseZ + bridgeHouseDepth * 0.5 - windowDepth * 0.5 + 0.003;
      window.material = windowMaterial;
      meshes.push(window);
    }
  }

  const funnelBaseHeight = 0.34;
  const funnelBase = createDeckStandingBox(`${name}_funnel_base`, scene, 0.64, funnelBaseHeight, 0.76, -0.5);
  funnelBase.parent = parent;
  funnelBase.material = cabinMaterial;
  meshes.push(funnelBase);

  const funnel = MeshBuilder.CreateCylinder(`${name}_funnel`, {
    diameterTop: 0.31,
    diameterBottom: 0.39,
    height: 0.9,
    tessellation: 12
  }, scene);
  funnel.parent = parent;
  funnel.position.y = funnelBase.metadata.deckTopY + 0.45 - 0.001;
  funnel.position.z = -0.44;
  funnel.material = funnelMaterial;
  meshes.push(funnel);

  return meshes;
}

function pushQuad(indices, a, b, c, d) {
  indices.push(a, b, c, a, c, d);
}

function pushOrientedQuad(indices, positions, a, b, c, d, expectedNormal) {
  if (quadNormalDot(positions, a, b, c, expectedNormal) < 0) {
    pushQuad(indices, a, d, c, b);
  } else {
    pushQuad(indices, a, b, c, d);
  }
}

function pushOrientedTriangle(indices, positions, a, b, c, expectedNormal) {
  if (quadNormalDot(positions, a, b, c, expectedNormal) < 0) {
    indices.push(a, c, b);
  } else {
    indices.push(a, b, c);
  }
}

function quadNormalDot(positions, a, b, c, expectedNormal) {
  const ax = positions[a * 3];
  const ay = positions[a * 3 + 1];
  const az = positions[a * 3 + 2];
  const ux = positions[b * 3] - ax;
  const uy = positions[b * 3 + 1] - ay;
  const uz = positions[b * 3 + 2] - az;
  const vx = positions[c * 3] - ax;
  const vy = positions[c * 3 + 1] - ay;
  const vz = positions[c * 3 + 2] - az;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  return nx * expectedNormal.x + ny * expectedNormal.y + nz * expectedNormal.z;
}

function createMeshFromData(name, scene, positions, indices, options = {}) {
  const mesh = new Mesh(name, scene);
  const meshIndices = options.reverseFaces ? reverseTriangleWinding(indices) : indices;
  const normals = [];
  VertexData.ComputeNormals(positions, meshIndices, normals);

  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = meshIndices;
  vertexData.normals = normals;
  vertexData.applyToMesh(mesh);
  if (options.flatShaded) {
    mesh.convertToFlatShadedMesh();
  }

  return mesh;
}

function reverseTriangleWinding(indices) {
  const reversed = [];
  for (let index = 0; index < indices.length; index += 3) {
    reversed.push(indices[index], indices[index + 2], indices[index + 1]);
  }
  return reversed;
}

function createBowCannon(scene, materials, parent, name, teamMaterials, bowZ = 2.35, isPlayer = false) {
  const deckMaterial = teamMaterials.deck;
  const turretMaterial = teamMaterials.cabin ?? teamMaterials.hull;
  const metalMaterial = teamMaterials.funnel ?? materials.funnel;
  const scale = isPlayer ? 0.648 : 0.78;
  const cannonScale = scale * 1.045;
  const platformHeight = 0.075 * cannonScale;
  const platformY = getTorpedoBoatDeckY(bowZ) + platformHeight * 0.5 + 0.002;
  const turretBaseHeight = 0.234 * cannonScale;

  const platform = MeshBuilder.CreateCylinder(`${name}_cannon_platform`, {
    diameter: 0.52 * cannonScale,
    height: platformHeight,
    tessellation: 28
  }, scene);
  platform.parent = parent;
  platform.position.y = platformY;
  platform.position.z = bowZ;
  platform.material = deckMaterial;

  const mount = new TransformNode(`${name}_cannon_mount`, scene);
  mount.parent = parent;
  mount.position.y = platform.position.y + platformHeight * 0.5;
  mount.position.z = bowZ;

  const turretBase = MeshBuilder.CreateCylinder(`${name}_cannon_turret_base`, {
    diameter: 0.42 * cannonScale,
    height: turretBaseHeight,
    tessellation: 22
  }, scene);
  turretBase.parent = mount;
  turretBase.position.y = turretBaseHeight * 0.5;
  turretBase.material = turretMaterial;

  const turretRoof = MeshBuilder.CreateSphere(`${name}_cannon_turret_roof`, {
    diameter: 0.42 * cannonScale,
    segments: 18
  }, scene);
  turretRoof.parent = mount;
  turretRoof.position.y = turretBaseHeight;
  turretRoof.scaling.y = 0.28;
  turretRoof.material = turretMaterial;

  const elevationRoot = new TransformNode(`${name}_cannon_elevation`, scene);
  elevationRoot.parent = mount;
  elevationRoot.position.y = turretBaseHeight * 0.92;
  elevationRoot.position.z = 0.18 * cannonScale;

  const barrelLength = 0.63 * cannonScale;
  const barrel = MeshBuilder.CreateCylinder(`${name}_cannon_barrel`, {
    diameter: 0.07 * cannonScale,
    height: barrelLength,
    tessellation: 14
  }, scene);
  barrel.parent = elevationRoot;
  barrel.position.z = barrelLength * 0.34;
  barrel.rotation.x = Math.PI / 2;
  barrel.material = metalMaterial;

  return {
    mount,
    elevationRoot,
    barrel,
    barrelBaseZ: barrel.position.z,
    muzzleZ: barrel.position.z + barrelLength * 0.5,
    viewHiddenMeshes: isPlayer ? [platform, turretBase, turretRoof, barrel] : []
  };
}

function createSlottedFlakDome(name, scene, scale) {
  const radius = 0.25 * scale;
  const heightScale = 0.58;
  const rings = 8;
  const segments = 28;
  const slotHalfAngle = 0.24;
  const startAngle = slotHalfAngle;
  const endAngle = Math.PI * 2 - slotHalfAngle;
  const positions = [];
  const indices = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const theta = (ring / rings) * (Math.PI / 2);
    const y = Math.cos(theta) * radius * heightScale;
    const ringRadius = Math.sin(theta) * radius;
    for (let segment = 0; segment <= segments; segment += 1) {
      const phi = startAngle + (segment / segments) * (endAngle - startAngle);
      positions.push(
        Math.sin(phi) * ringRadius,
        y,
        Math.cos(phi) * ringRadius
      );
    }
  }

  const row = segments + 1;
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * row + segment;
      const b = a + row;
      pushQuad(indices, a, a + 1, b + 1, b);
    }
  }

  return createMeshFromData(name, scene, positions, indices, { reverseFaces: true });
}

function createOpenFlakTurretWall(name, scene, scale) {
  const outerRadius = 0.29 * scale;
  const innerRadius = 0.215 * scale;
  const height = 0.145 * scale;
  const segments = 9;
  const arcs = [
    { start: 0.74, end: 1.98 },
    { start: Math.PI * 2 - 1.98, end: Math.PI * 2 - 0.74 }
  ];
  const positions = [];
  const indices = [];

  arcs.forEach((arc) => {
    const base = positions.length / 3;
    for (let segment = 0; segment <= segments; segment += 1) {
      const phi = arc.start + (segment / segments) * (arc.end - arc.start);
      const sin = Math.sin(phi);
      const cos = Math.cos(phi);
      positions.push(sin * outerRadius, 0, cos * outerRadius);
      positions.push(sin * outerRadius, height, cos * outerRadius);
      positions.push(sin * innerRadius, height, cos * innerRadius);
      positions.push(sin * innerRadius, 0, cos * innerRadius);
    }

    for (let segment = 0; segment < segments; segment += 1) {
      const a = base + segment * 4;
      const b = a + 4;
      pushQuad(indices, a, b, b + 1, a + 1);
      pushQuad(indices, a + 1, b + 1, b + 2, a + 2);
      pushQuad(indices, a + 2, b + 2, b + 3, a + 3);
      pushQuad(indices, a + 3, b + 3, b, a);
    }

    const last = base + segments * 4;
    pushQuad(indices, base, base + 1, base + 2, base + 3);
    pushQuad(indices, last, last + 3, last + 2, last + 1);
  });

  return createMeshFromData(name, scene, positions, indices);
}

function createSternFlak(scene, materials, parent, name, teamMaterials, sternZ = -3.45, isPlayer = false) {
  const deckMaterial = teamMaterials.deck;
  const metalMaterial = teamMaterials.funnel ?? materials.funnel;
  const shieldMaterial = teamMaterials.cabin ?? teamMaterials.hull;
  const scale = isPlayer ? playerSternFlakScale : 0.75;
  const platformHeight = 0.12 * scale;
  const platformY = getTorpedoBoatDeckY(sternZ) + platformHeight * 0.5 + 0.002;
  const turretBaseHeight = 0.14 * scale;
  const turretWallHeight = 0.145 * scale;
  const turretTopY = platformY + platformHeight * 0.5 + turretBaseHeight + turretWallHeight;

  const platform = MeshBuilder.CreateCylinder(`${name}_flak_platform`, {
    diameter: 0.78 * scale,
    height: platformHeight,
    tessellation: 28
  }, scene);
  platform.parent = parent;
  platform.position.y = platformY;
  platform.position.z = sternZ;
  platform.material = deckMaterial;

  const pedestal = MeshBuilder.CreateCylinder(`${name}_flak_pedestal`, {
    diameter: 0.54 * scale,
    height: turretBaseHeight,
    tessellation: 20
  }, scene);
  pedestal.parent = parent;
  pedestal.position.y = platform.position.y + platformHeight * 0.5 + turretBaseHeight * 0.5;
  pedestal.position.z = sternZ;
  pedestal.material = shieldMaterial;

  const mount = new TransformNode(`${name}_flak_mount`, scene);
  mount.parent = parent;
  mount.position.y = turretTopY;
  mount.position.z = sternZ;
  mount.rotation.y = Math.PI;

  const turretWall = createOpenFlakTurretWall(`${name}_flak_turret_wall`, scene, scale);
  turretWall.parent = mount;
  turretWall.position.y = -turretWallHeight;
  turretWall.material = shieldMaterial;

  const cradle = MeshBuilder.CreateCylinder(`${name}_flak_cradle`, {
    diameter: 0.105 * scale,
    height: 0.34 * scale,
    tessellation: 12
  }, scene);
  cradle.parent = mount;
  cradle.position.y = -0.015 * scale;
  cradle.position.z = -0.03 * scale;
  cradle.rotation.z = Math.PI / 2;
  cradle.material = metalMaterial;

  const elevationRoot = new TransformNode(`${name}_flak_elevation`, scene);
  elevationRoot.parent = mount;
  elevationRoot.position.y = 0.03 * scale;
  elevationRoot.position.z = 0.16 * scale;

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
    { x: -0.041, y: 0, width: 0.048, height: 0.002 },
    { x: 0.041, y: 0, width: 0.048, height: 0.002 },
    { x: 0, y: -0.041, width: 0.002, height: 0.048 },
    { x: 0, y: 0.041, width: 0.002, height: 0.048 }
  ];
  sightSpokes.forEach((spoke, index) => {
    const mesh = MeshBuilder.CreateBox(`${name}_flak_ring_sight_spoke_${index}`, {
      width: spoke.width * scale,
      height: spoke.height * scale,
      depth: 0.006 * scale
    }, scene);
    mesh.parent = elevationRoot;
    mesh.position.x = spoke.x * scale;
    mesh.position.y = sightYOffset + spoke.y * scale;
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

  return {
    mount,
    elevationRoot,
    viewHiddenMeshes: []
  };
}

// Low-poly external ship model for opponents. Keep it cheap: enemies may appear in groups later.
function createEnemyTorpedoBoat(scene, materials, name = "enemy_boat", teamId = "dark", designation = "", hasFlak = false) {
  const root = new TransformNode(name, scene);
  const teamMaterials = getShipTeamMaterials(materials, teamId);
  const hullMaterial = teamMaterials.hull;
  const deckMaterial = teamMaterials.deck;
  const cabinMaterial = teamMaterials.cabin;
  const funnelMaterial = teamMaterials.funnel;

  const hull = createBoatHullMesh(`${name}_hull`, scene);
  hull.parent = root;
  hull.material = hullMaterial;

  const deck = createBoatDeckMesh(`${name}_deck`, scene);
  deck.parent = root;
  deck.material = deckMaterial;
  const bowBulwarkCap = createBoatBowBulwarkCapMesh(`${name}_bow_bulwark_cap`, scene);
  bowBulwarkCap.parent = root;
  bowBulwarkCap.material = hullMaterial;

  createTorpedoBoatSuperstructure(scene, materials, root, name, teamMaterials, true);

  for (let i = 0; i < 2; i += 1) {
    const tube = MeshBuilder.CreateCylinder(`${name}_tube_${i}`, {
      diameter: 0.15,
      height: 1.76,
      tessellation: 10
    }, scene);
    tube.parent = root;
    tube.position.x = i === 0 ? -0.56 : 0.56;
    tube.position.y = 0.76;
    tube.position.z = 1.38;
    tube.rotation.x = Math.PI / 2;
    tube.material = funnelMaterial;
  }

  const bowCannon = createBowCannon(scene, materials, root, name, teamMaterials, 2.42, false);
  const sternFlak = hasFlak
    ? createSternFlak(scene, materials, root, name, teamMaterials, remoteSternFlakZ, false)
    : null;

  const bowWake = createEnemyBowWake(scene, materials, root, name);

  return { root, bowWake, bowCannon, sternFlak };
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
