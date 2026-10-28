import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMotionSyncHealth } from '../src/motionSyncHealth.js';

globalThis.motionSyncHealth = createMotionSyncHealth({ report: () => {}, warn: () => {} });

test('real acknowledgement path warns only after sustained rejections and recovers on accepted motion', () => {
  let clock = 0;
  const warnings = [], reports = [];
  const health = createMotionSyncHealth({ now: () => clock, warn: value => warnings.push(value), report: (...args) => reports.push(args) });
  const reconcile = new Function('motionSyncHealth', `
    const playerLifeRevision = 0, serverRestartPending = false, playerDamageState = 'active', playerServerShipId = 'boat';
    const crewState = null, document = { body: { dataset: {} } };
    let playerServerTarget, playerMotionBlocked = false;
    const alignPlayerBoatToServerShip = () => {};
    ${fn('reconcilePlayerMotionAcknowledgement')}
    return reconcilePlayerMotionAcknowledgement;
  `)(health);
  const snapshot = { ships: [{ id: 'boat', state: 'active', x: 0, z: 0 }] };
  for (clock = 0; clock < 3000; clock += 250) {
    reconcile(snapshot, { x: .2, z: 0 }, null);
    health.tick();
  }
  assert.equal(warnings.length, 0);
  health.tick();
  assert.equal(warnings.length, 1);
  reconcile(snapshot, { x: 0, z: 0 }, null);
  assert.equal(reports[1][0], 'motion-sync-recovered');
  assert.equal(reports[0][1].last.distance, .2);
});

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
function fn(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}

test('station handover uses response motion rather than an old streamed position', () => {
  const aligned = [];
  const apply = new Function('alignPlayerBoatToServerShip', `
    let crewState = { station: 'flak', revision: 1, lookoutReset: 0 };
    let playerServerTarget = { stale: true }, lookoutYaw, lookoutPitch;
    const showSubmarineWarning = () => {}, setBattleStation = () => {};
    const updateBattleStationButtons = () => {}, updateLookoutAimRequests = () => {};
    ${fn('applyCrewView')}
    return view => { applyCrewView(view); return playerServerTarget; };
  `)(ship => aligned.push(ship));
  const ship = { id: 'boat', state: 'active', x: 3, z: -8, speed: -2 };
  assert.equal(apply({ station: 'bridge', revision: 2, shipId: 'boat', ship, lookoutReset: 0 }), null);
  assert.deepEqual(aligned, [ship]);
  apply({ station: 'flak', revision: 1, shipId: 'boat', ship: { ...ship, z: 100 } });
  assert.equal(aligned.length, 1, 'late crew response cannot rewind the boat');
});

test('rejected bridge motion is corrected, accepted motion and old station replies are not', () => {
  const aligned = [];
  const crew = { station: 'bridge', revision: 2, shipId: 'boat' };
  const reconcile = new Function('alignPlayerBoatToServerShip', 'crewState', `
    const playerLifeRevision = 0, serverRestartPending = false, playerDamageState = 'active', playerServerShipId = 'boat';
    const document = { body: { dataset: {} } };
    let playerServerTarget, playerMotionBlocked = false;
    const blockPlayerMotion = () => { playerMotionBlocked = true; };
    ${fn('reconcilePlayerMotionAcknowledgement')}
    return reconcilePlayerMotionAcknowledgement;
  `)(ship => aligned.push(ship), crew);
  const ship = { id: 'boat', state: 'active', x: 0, z: -1, speed: -2 };
  reconcile({ ships: [ship] }, { x: 0, z: -1 }, crew);
  assert.equal(aligned.length, 0);
  reconcile({ ships: [ship] }, { x: 0, z: -100 }, { ...crew, revision: 1 });
  assert.equal(aligned.length, 0);
  reconcile({ ships: [ship] }, { x: 0, z: -100 }, crew);
  assert.deepEqual(aligned, [ship]);
});

test('a corrected position restores control, but missing confirmation blocks play', () => {
  const messages = [];
  const run = new Function('showDamageMessage', `
    let playerMotionBlocked = false, playerServerTarget;
    const playerLifeRevision = 0, serverRestartPending = false, playerDamageState = 'active', playerServerShipId = 'boat';
    const crewState = null, time = 1, document = { body: { dataset: {} } };
    const alignPlayerBoatToServerShip = () => {};
    ${fn('blockPlayerMotion')}
    ${fn('reconcilePlayerMotionAcknowledgement')}
    return (ships, motion) => ({ accepted: reconcilePlayerMotionAcknowledgement({ ships }, motion, null), blocked: playerMotionBlocked });
  `)(message => messages.push(message));
  const ship = { id: 'boat', state: 'active', x: 0, z: 0 };
  assert.deepEqual(run([ship], { x: 0, z: 80 }), { accepted: false, blocked: false });
  assert.equal(messages.length, 0, 'successful correction is silent');
  for (let i = 0; i < 10; i++) {
    assert.deepEqual(run([ship], { x: 0, z: .18 }), { accepted: false, blocked: false });
  }
  assert.equal(messages.length, 0, 'small corrected offsets do not repeatedly obscure the view');
  assert.deepEqual(run([{ ...ship, x: NaN }], { x: 0, z: 0 }), { accepted: false, blocked: true });
  assert.deepEqual(run([ship], { x: 0, z: 0 }), { accepted: true, blocked: false });
});

test('destroyed or removed ship enters sinking without a position warning', () => {
  for (const ships of [[], [{ id: 'boat', state: 'sunk', x: 0, z: 0 }]]) {
    const snapshots = [], messages = [];
    const reconcile = new Function('applyServerGameSnapshot', 'showDamageMessage', `
      const playerLifeRevision = 0, playerServerShipId = 'boat', serverRestartPending = false, playerDamageState = 'active';
      const crewState = null, time = 0;
      let playerMotionBlocked = false;
      ${fn('blockPlayerMotion')}
      ${fn('reconcilePlayerMotionAcknowledgement')}
      return reconcilePlayerMotionAcknowledgement;
    `)(snapshot => snapshots.push(snapshot), message => messages.push(message));
    assert.equal(reconcile({ ships }, { x: 100, z: 100 }, null), false);
    assert.equal(snapshots.length, 1);
    assert.deepEqual(messages, []);
  }
});

test('late replies and connection errors during sinking do not replace the death message', () => {
  for (const state of ['sinking', 'active']) {
    const messages = [];
    const run = new Function('playerDamageState', 'showDamageMessage', `
      const playerLifeRevision = 0, playerServerShipId = 'new-boat', serverRestartPending = false, time = 0;
      let playerMotionBlocked = false;
      ${fn('blockPlayerMotion')}
      ${fn('reconcilePlayerMotionAcknowledgement')}
      return () => {
        if (playerDamageState === 'sinking') blockPlayerMotion('connection error');
        return reconcilePlayerMotionAcknowledgement({ ships: [] }, {}, null, 'old-boat');
      };
    `)(state, message => messages.push(message));
    assert.equal(run(), false);
    assert.deepEqual(messages, []);
  }
});

test('torpedo launch never reaches the fire endpoint if position confirmation fails', async () => {
  let confirmations = 0;
  const start = source.indexOf('async function requestPlayerTorpedoFire(');
  const end = source.indexOf('\nfunction ', start + 1);
  // This branch must return before constructing or sending any weapon request.
  const fire = new Function('sendPlayerState', `
    const crewState = null, playerDamageState = 'active', playerStateRequestPromise = null;
    let fireTorpedoRequestInFlight = false, playerMotionBlocked = false;
    const document = { body: { dataset: {} } };
    ${source.slice(start, end)}
    return requestPlayerTorpedoFire;
  `)(async () => { confirmations++; return false; });
  await fire();
  await fire();
  assert.equal(confirmations, 2, 'aborted launch releases the in-flight guard');
});

test('reused active ship ID owned by a bot is a lifecycle change, not a position rejection', () => {
  const snapshots = [];
  const reconcile = new Function('applyServerGameSnapshot', `
    const playerLifeRevision = 1, playerServerShipId = 'boat', playerDamageState = 'active', serverRestartPending = false;
    const crewState = null;
    let playerMotionBlocked = false;
    const blockPlayerMotion = () => { throw new Error('unexpected position warning'); };
    ${fn('reconcilePlayerMotionAcknowledgement')}
    return reconcilePlayerMotionAcknowledgement;
  `)(s => snapshots.push(s));
  const snapshot = { ships: [{ id: 'boat', controlledBy: 'bot', state: 'active', x: 900, z: 900 }] };
  assert.equal(reconcile(snapshot, { playerId: 'player-test', x: 0, z: 0 }, null), false);
  assert.deepEqual(snapshots, [snapshot]);
});

test('same-ID response from before sinking is ignored after respawn', () => {
  const run = new Function(`
    let playerLifeRevision = 0, playerMotionBlocked = true, flakHitAlertUntil = 9;
    const playerServerShipId = 'boat', playerDamageState = 'active', serverRestartPending = false;
    ${fn('invalidatePlayerMotionLife')}
    ${fn('reconcilePlayerMotionAcknowledgement')}
    return () => {
      const sentLife = playerLifeRevision;
      invalidatePlayerMotionLife();
      invalidatePlayerMotionLife();
      return { accepted: reconcilePlayerMotionAcknowledgement({ ships: [] }, {}, null, 'boat', sentLife),
        blocked: playerMotionBlocked, alertUntil: flakHitAlertUntil };
    };
  `)();
  assert.deepEqual(run(), { accepted: false, blocked: false, alertUntil: 0 });
});

test('respawn before crew assignment waits without sending old-ship motion or reporting an error', async () => {
  const start = source.indexOf('async function transmitPlayerState(');
  const end = source.indexOf('\nfunction ', start + 1);
  const run = new Function(`
    const serverRestartPending = false, scoutPlaneMode = false, pendingPlayerServerShip = null;
    const crewState = { shipId: 'destroyed-boat', station: 'bridge' };
    let playerLifeRevision = 1, playerMotionBlocked = false, playerAwaitingServerAssignment = false;
    let playerRespawnIndex = 0, heading, speed, turnVelocity, rudderDegrees, engineOrder, ramShake;
    let playerDamageState = 'sinking', playerServerShipId = 'destroyed-boat';
    let playerServerTarget = { position: 'old wreck' }, flakHitAlertUntil = 0;
    const playerRespawnPoints = [{ position: { x: 0, z: 0 }, heading: 0 }];
    const document = { body: { dataset: {} } }, Quaternion = { FromEulerAngles: () => ({}) };
    const resetTransientWeaponVisualsAfterRespawn = () => {}, resetPlayerSubmarineDepthAfterRespawn = () => {};
    const resetWakeAtPosition = () => {}, updateSinkingWaterOverlay = () => {}, sendClientGameEvent = () => {};
    ${fn('invalidatePlayerMotionLife')}
    ${fn('respawnPlayerBoat')}
    ${source.slice(start, end)}
    return async () => {
      respawnPlayerBoat({ root: { position: { copyFrom() {} } } });
      const sent = await transmitPlayerState();
      return { sent, waiting: playerAwaitingServerAssignment, blocked: playerMotionBlocked,
        ship: playerServerShipId, target: playerServerTarget };
    };
  `)();
  assert.deepEqual(await run(), { sent: false, waiting: true, blocked: true, ship: null, target: null });
});

test('first position reply without an assigned ship is assignment, not a mismatch', () => {
  const snapshots = [];
  const reconcile = new Function('applyServerGameSnapshot', `
    const playerLifeRevision = 2, playerServerShipId = null, playerDamageState = 'active';
    const serverRestartPending = false, crewState = null;
    ${fn('reconcilePlayerMotionAcknowledgement')}
    return reconcilePlayerMotionAcknowledgement;
  `)(snapshot => snapshots.push(snapshot));
  const snapshot = { ships: [{ id: 'new-boat', controlledBy: 'player-test', state: 'active', x: 1500, z: 400 }] };
  assert.equal(reconcile(snapshot, { playerId: 'player-test', x: 0, z: 0 }, null), false);
  assert.deepEqual(snapshots, [snapshot]);
});

test('blocked reverse motion stops without repeatedly shifting the hull along the coast', () => {
  const start = source.indexOf('    if (!scoutPlaneMode && movementSafety.isBlocked) {');
  const end = source.indexOf('\n    if (scoutPlaneMode)', start);
  assert.ok(start >= 0 && end > start);
  const run = new Function(`
    const scoutPlaneMode = false, movementSafety = { isBlocked: true };
    const previousPosition = { x: 10, z: 20 };
    const position = { x: 10, z: 19.9, copyFrom(p) { this.x = p.x; this.z = p.z; } };
    const boat = { root: { position } };
    let speed = -1, turnVelocity = .1, engineGroundedUntil = 0;
    const time = 0;
    for (let frame = 0; frame < 60; frame++) {
      ${source.slice(start, end)}
    }
    return { x: position.x, z: position.z, speed };
  `);
  assert.deepEqual(run(), { x: 10, z: 20, speed: 0 });
});
