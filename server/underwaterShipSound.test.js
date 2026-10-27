import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnderwaterShipSound, propellerSpatialMix, propellerDoppler, sonarSpatialMix } from '../src/underwaterShipSound.js';

test('hydrophone listening is underwater only, directional and distance dependent', () => {
  const listener = { x: 0, y: -10, z: 0, heading: 0, underwater: true };
  const near = propellerSpatialMix({ x: 10, y: 0, z: 0 }, listener);
  assert.ok(near.gain > propellerSpatialMix({ x: 200, z: 0 }, listener).gain);
  assert.ok(near.pan > 0);
  assert.ok(propellerSpatialMix({ x: -10, z: 0 }, listener).pan < 0);
  assert.equal(propellerSpatialMix({ x: 10, z: 0 }, { ...listener, underwater: false }).gain, 0);
  assert.equal(propellerSpatialMix({ x: 10, z: 0 }, { ...listener, muted: true }).gain, 0);
  assert.ok(propellerSpatialMix({ x: 300, z: 0 }, listener).gain > .05);
  assert.ok(propellerSpatialMix({ x: 500, z: 0 }, listener).gain > 0);
  assert.equal(propellerSpatialMix({ x: 601, z: 0 }, listener).gain, 0);
});

test('uses at most four screws and one intermittent ping, excluding own, stopped and aircraft sources', async () => {
  const original = globalThis.fetch;
  let loads = 0;
  const sources = [];
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), pan: param(), frequency: param() });
  const context = { currentTime: 1, state: 'running', destination: {},
    decodeAudioData: async () => ({}), createGain: node, createBiquadFilter: node, createStereoPanner: node,
    createBufferSource: () => { const source = { ...node(), playbackRate: param(), start() {}, stop() {} }; sources.push(source); return source; } };
  try {
    globalThis.fetch = async () => { loads++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(2) }; };
    const sound = createUnderwaterShipSound({ context, propellerUrl: '/screws.wav', sonarUrl: '/ping.wav' });
    await sound.unlock();
    const listener = { x: 0, y: -6, z: 0, heading: 0, underwater: true };
    const ships = Array.from({ length: 20 }, (_, i) => ({ id: `ship-${i}`, state: 'active',
      vehicleType: 'torpedo-boat', speed: 10, x: i + 10, z: 0 }));
    ships.unshift({ ...ships[0], id: 'own', x: 0 }, { ...ships[0], id: 'stop', speed: 0 },
      { ...ships[0], id: 'plane', vehicleType: 'scout-plane' });
    sound.update(listener, ships, true, 'own');
    assert.equal(sound.state().propellers.voices, 4);
    assert.equal(sound.state().sonar.voices, 1);
    assert.equal(sources.filter(s => s.loop).length, 4);
    for (let i = 0; i < 20; i++) { context.currentTime += .2; sound.update(listener, ships, true, 'own'); }
    assert.equal(sources.length, 5, 'Steady contacts reuse their loops; ping does not repeat within eight seconds');
    sound.update({ ...listener, muted: true }, ships, true, 'own');
    context.currentTime += .8;
    sound.update({ ...listener, underwater: false }, ships, true, 'own');
    assert.equal(sound.state().propellers.voices, 0);
    assert.equal(loads, 2);
    sound.dispose();
  } finally { globalThis.fetch = original; }
});


test('propeller Doppler follows approach, recession, listener motion and reverse gear', () => {
  const listener = { x: 0, z: 0 };
  const approaching = { x: 0, z: 50, heading: Math.PI, speed: 15 };
  assert.ok(propellerDoppler(approaching, listener) > 1);
  assert.ok(propellerDoppler({ ...approaching, heading: 0 }, listener) < 1);
  assert.ok(propellerDoppler({ ...approaching, heading: 0, speed: -15 }, listener) > 1);
  assert.equal(propellerDoppler({ ...approaching, heading: 0 }, { ...listener, vz: 15 }), 1);
  assert.equal(propellerDoppler({ ...approaching, x: 0, z: 0 }, listener), 1);
  for (const speed of [-10000, 0, 10000]) {
    const rate = propellerDoppler({ ...approaching, speed }, listener);
    assert.ok(Number.isFinite(rate) && rate >= .85 && rate <= 1.18);
  }
});


test('sonar is strong only close by and fades steeply to silence at echo range', () => {
  const listener = { x: 0, z: 0, heading: 0, underwater: true };
  const level = distance => sonarSpatialMix({ x: distance, z: 0 }, listener).gain;
  assert.ok(level(10) > level(70) * 5);
  assert.ok(level(70) > level(120) * 5);
  assert.equal(level(141.84), 0);
  assert.equal(level(300), 0);
  assert.equal(sonarSpatialMix({ x: 10, z: 0 }, { ...listener, muted: true }).gain, 0);
  assert.equal(sonarSpatialMix({ x: 10, z: 0 }, { ...listener, underwater: false }).gain, 0);
});
