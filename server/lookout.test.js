import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function getPlayerCameraSetup(');
const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));

test('lookout stays one world metre above roof and turns through all headings', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI * 2]) {
    const camera = new Function('lookoutViewActive', 'getBridgeWindowCameraLocalPosition',
      'transformLocalShipPointWithoutTilt', 'torpedoBoatVisualScale', 'heading', 'lookoutYaw',
      'lookoutPitch', 'Vector3', `${fn}; return getPlayerCameraSetup();`)(true,
      () => ({ roofPosition: new Vector3(0, 2, 1) }), p => p.scale(3), 3, 0, yaw, 0, Vector3);
    assert.equal(camera.position.y, 7);
    assert.ok(Math.abs(camera.target.x - camera.position.x - Math.sin(yaw) * 100) < 1e-10);
    assert.ok(Math.abs(camera.target.z - camera.position.z - Math.cos(yaw) * 100) < 1e-10);
  }
});

test('lookout direction keys do not operate ship or weapons', () => {
  const start = source.indexOf('function pressDirectionalInput(');
  const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));
  const held = new Set();
  const press = new Function('lookoutViewActive', 'lookoutHeldDirections', `let lookoutYawStartTime = 0, lookoutPitchStartTime = 0; const time = 1; ${fn}; return pressDirectionalInput;`)(true, held);
  for (const direction of ['left', 'right', 'up', 'down']) press(direction);
  assert.equal(held.size, 4);
});

test('lookout uses the cannon ramp and key repeats do not restart acceleration', () => {
  const start = source.indexOf('function pressDirectionalInput(');
  const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));
  const run = new Function(`
    const lookoutViewActive = true, lookoutHeldDirections = new Set();
    let lookoutYawStartTime = 0, lookoutPitchStartTime = 0, time = 1;
    ${fn}
    pressDirectionalInput('right');
    time = 2; pressDirectionalInput('right', { repeat: true });
    pressDirectionalInput('up');
    return [lookoutYawStartTime, lookoutPitchStartTime];
  `);
  assert.deepEqual(run(), [1, 2]);
  assert.match(source, /getHeldCannonSpeed\(lookoutYawStartTime, cannonYawFineSpeed, cannonYawExtremeSpeed, sightLevel\)/);
  assert.match(source, /getHeldCannonSpeed\(lookoutPitchStartTime, cannonPitchFineSpeed, cannonPitchExtremeSpeed, sightLevel\)/);
});

test('approved lookout aim is applied once, never by a pending or declined message', () => {
  const start = source.indexOf('function updateLookoutAimRequests(');
  const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));
  const nodes = new Map();
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { dataset: {}, hidden: true, textContent: '' });
    return nodes.get(id);
  } };
  const harness = new Function('document', `
    let crewState, flakYaw = 0, flakPitch = 0, cannonYaw = 0, cannonPitch = 0;
    const playerId = 'gunner', handledLookoutDecisions = new Set();
    let lookoutRequestWasPending = false;
    const lookoutViewActive = false, lookoutFeedback = {}, cancelWeaponAlignment = () => {};
    const weaponHeadingHold = { align() {} };
    ${fn}
    return status => {
      crewState = { members: [], aimRequests: [{ id: 'one', recipient: 'gunner', weapon: 'flak', yaw: 1, pitch: .2, status }] };
      updateLookoutAimRequests();
      const result = [flakYaw, flakPitch];
      flakYaw = 2; flakPitch = .3;
      return result;
    };
  `)(document);
  assert.deepEqual(harness('pending'), [0, 0]);
  assert.equal(nodes.get('lookoutAimRequest').hidden, false);
  assert.deepEqual(harness('declined'), [2, .3]);
  assert.deepEqual(harness('accepted'), [1, .2]);
  assert.deepEqual(harness('accepted'), [2, .3]);
  assert.equal(nodes.get('lookoutAimRequest').hidden, true);
});
