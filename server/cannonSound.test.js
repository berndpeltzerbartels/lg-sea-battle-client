import test from 'node:test';
import assert from 'node:assert/strict';
import { createCannonSound, cannonSpatialMix } from '../src/cannonSound.js';

test('cannon is audible further away and is muffled underwater', () => {
  const listener = { x: 0, z: 0, heading: 0 };
  assert.ok(cannonSpatialMix({ x: 650, z: 0 }, listener).gain > 0);
  assert.equal(cannonSpatialMix({ x: 1200, z: 0 }, listener).gain, 0);
  const normal = cannonSpatialMix({ x: 80, z: 0 }, listener);
  const deep = cannonSpatialMix({ x: 80, z: 0 }, { ...listener, underwater: true });
  assert.equal(deep.gain, 0);
  const wet = cannonSpatialMix({ x: 80, z: 0 }, { ...listener, underwater: true }, 1, { waterExplosion: true });
  const deeper = cannonSpatialMix({ x: 80, z: 0 }, { ...listener, underwater: true, deepSubmerged: true }, 1, { waterExplosion: true });
  assert.equal(wet.gain, normal.gain);
  assert.equal(deeper.gain, normal.gain);
  assert.ok(wet.frequency < normal.frequency && deeper.frequency < wet.frequency);
});

test('cannon plays once per event, preserves shot decay and releases bounded sources', async () => {
  const original = globalThis.fetch;
  let loads = 0, stops = 0;
  const sources = [], gains = [];
  const param = () => ({ value: 0, setTargetAtTime(value) { this.target = value; } });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), pan: param() });
  const context = { currentTime: 0, state: 'running', destination: {},
    decodeAudioData: async () => ({ duration: 3.95 }),
    createGain: () => { const gain = node(); gains.push(gain); return gain; }, createBiquadFilter: node,
    createStereoPanner: node, createBufferSource: () => {
      const source = { ...node(), playbackRate: param(), start() {}, stop() { stops++; } }; sources.push(source); return source;
    } };
  try {
    globalThis.fetch = async () => { loads++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(2) }; };
    const sound = createCannonSound({ context, url: '/cannon.wav', maxVoices: 2 });
    await Promise.all([sound.unlock(), sound.unlock()]);
    sound.shot('first', { x: 50, z: 0 }, false, { rate: .92, underwaterRate: .82, waterExplosion: true });
    assert.equal(sources[0].playbackRate.target, .92);
    sound.update({ x: 0, z: 0, heading: 0, underwater: true, deepSubmerged: true }, true);
    assert.equal(sources[0].playbackRate.target, .92 * .82);
    sound.update({ x: 0, z: 0, heading: 0 }, true);
    assert.equal(sources[0].playbackRate.target, .92, 'surfacing restores the original pitch');
    sound.shot('first', { x: 50, z: 0 });
    assert.equal(sources.length, 1);
    assert.equal(sources[0].loop, false);
    sound.shot('second', { x: 80, z: 0 });
    sound.shot('distant', { x: 500, z: 0 });
    assert.equal(sources.length, 2);
    sound.shot('own', { x: 0, z: 0 }, true);
    assert.equal(stops, 1);
    assert.equal(sound.state().voices, 2);
    const ownLevel = gains[2].gain.value;
    assert.ok(ownLevel > 1, 'own cannon has raised gain');
    sound.update({ x: 0, z: 0, heading: 0 }, true);
    assert.equal(gains[2].gain.target, ownLevel, 'other active shots must not duck the own cannon');
    sources[2].onended();
    assert.equal(sound.state().voices, 1);
    sound.dispose();
    assert.equal(sound.state().voices, 0);
    assert.equal(loads, 1);
  } finally { globalThis.fetch = original; }
});

test('underwater-only effects cannot be heard above water and mute on surfacing', async () => {
  const original = globalThis.fetch;
  const params = [];
  const node = () => ({ connect() {}, disconnect() {},
    gain: { value: 0, setTargetAtTime(value) { this.target = value; } },
    frequency: { value: 0, setTargetAtTime() {} } });
  const context = { currentTime: 0, state: 'running', destination: {},
    decodeAudioData: async () => ({}),
    createGain: () => { const n = node(); params.push(n.gain); return n; },
    createBiquadFilter: node,
    createBufferSource: () => ({ connect() {}, disconnect() {}, start() {}, stop() {} }) };
  try {
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(2) });
    const audio = createCannonSound({ context, url: '/underwater.wav' });
    await audio.unlock();
    audio.update({ x: 0, z: 0, heading: 0, underwater: false }, true);
    audio.shot('above', { x: 0, z: 0 }, true, { underwaterOnly: true });
    assert.equal(audio.state().voices, 0);
    audio.update({ x: 0, z: 0, heading: 0, underwater: true }, true);
    audio.shot('below', { x: 0, z: 0 }, true, { underwaterOnly: true });
    assert.equal(audio.state().voices, 1);
    assert.ok(params[0].target > 0);
    audio.update({ x: 0, z: 0, heading: 0, underwater: false }, true);
    assert.equal(params[0].target, 0);
    audio.dispose();
  } finally { globalThis.fetch = original; }
});

test('heavy explosion distance profile is stronger at combat distance without increasing maximum hearing range', () => {
  const listener = { x: 0, z: 0, heading: 0 };
  const ordinary = cannonSpatialMix({ x: 500, z: 0 }, listener);
  const heavy = cannonSpatialMix({ x: 500, z: 0 }, listener, 3);
  assert.ok(heavy.gain > ordinary.gain * 4);
  assert.equal(cannonSpatialMix({ x: 1200, z: 0 }, listener, 3).gain, 0);
});


test('darker torpedo filtering retains gain and respects stronger deep-water filtering', () => {
  const listener = { x: 0, z: 0, heading: 0 };
  const position = { x: 50, z: 0 };
  const options = { waterExplosion: true, lowpassHz: 750, underwaterLowpassHz: 650, deepUnderwaterLowpassHz: 300 };
  const normal = cannonSpatialMix(position, listener, 3);
  const dark = cannonSpatialMix(position, listener, 3, options);
  assert.equal(dark.gain, normal.gain);
  assert.equal(dark.frequency, 750);
  const periscope = cannonSpatialMix(position, { ...listener, underwater: true, deepSubmerged: false }, 3, options);
  assert.equal(periscope.frequency, 650);
  assert.equal(periscope.gain, dark.gain);
  const deep = cannonSpatialMix(position, { ...listener, underwater: true, deepSubmerged: true }, 3, options);
  assert.equal(deep.frequency, 300);
  assert.equal(deep.gain, dark.gain);
});


test('depth charge underwater boost preserves surface gain, deep filtering and mute', () => {
  const position = { x: 30, z: 0 }, listener = { x: 0, z: 0, heading: 0 };
  const options = { waterExplosion: true, underwaterGain: 2 };
  const surface = cannonSpatialMix(position, listener, 3, options);
  assert.equal(surface.gain, cannonSpatialMix(position, listener, 3).gain);
  const submerged = { ...listener, underwater: true, deepSubmerged: true };
  assert.equal(cannonSpatialMix(position, submerged, 3, options).gain, surface.gain * 2);
  assert.equal(cannonSpatialMix(position, submerged, 3, { ...options, underwaterGain: 3 }).gain, surface.gain * 3);
  assert.equal(cannonSpatialMix(position, submerged, 3, options).frequency, 450);
  assert.equal(cannonSpatialMix(position, { ...submerged, muted: true }, 3, options).gain, 0);
});
