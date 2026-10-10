import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
    const serverRestartPending = false, playerDamageState = 'active', playerServerShipId = 'boat';
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

test('position rejection is visible, blocks play and only an accepted reply releases it', () => {
  const messages = [];
  const run = new Function('showDamageMessage', `
    let playerMotionBlocked = false, playerServerTarget;
    const serverRestartPending = false, playerDamageState = 'active', playerServerShipId = 'boat';
    const crewState = null, time = 1, document = { body: { dataset: {} } };
    const alignPlayerBoatToServerShip = () => {};
    ${fn('blockPlayerMotion')}
    ${fn('reconcilePlayerMotionAcknowledgement')}
    return (ships, motion) => ({ accepted: reconcilePlayerMotionAcknowledgement({ ships }, motion, null), blocked: playerMotionBlocked });
  `)(message => messages.push(message));
  const ship = { id: 'boat', state: 'active', x: 0, z: 0 };
  assert.deepEqual(run([ship], { x: 0, z: 80 }), { accepted: false, blocked: true });
  assert.match(messages[0], /80.0 m/);
  assert.deepEqual(run([], { x: 0, z: 0 }), { accepted: false, blocked: true });
  assert.deepEqual(run([ship], { x: 0, z: 0 }), { accepted: true, blocked: false });
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
