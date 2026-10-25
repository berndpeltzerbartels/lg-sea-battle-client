import test from 'node:test';
import assert from 'node:assert/strict';
import { createCannonSound, cannonSpatialMix } from '../src/cannonSound.js';

test('cannon is audible further away and is muffled underwater', () => {
  const listener = { x: 0, z: 0, heading: 0 };
  assert.ok(cannonSpatialMix({ x: 650, z: 0 }, listener).gain > 0);
  assert.equal(cannonSpatialMix({ x: 1200, z: 0 }, listener).gain, 0);
  const normal = cannonSpatialMix({ x: 80, z: 0 }, listener);
  const deep = cannonSpatialMix({ x: 80, z: 0 }, { ...listener, underwater: true });
  assert.ok(deep.gain < normal.gain && deep.frequency < normal.frequency);
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
      const source = { ...node(), start() {}, stop() { stops++; } }; sources.push(source); return source;
    } };
  try {
    globalThis.fetch = async () => { loads++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(2) }; };
    const sound = createCannonSound({ context, url: '/cannon.wav', maxVoices: 2 });
    await Promise.all([sound.unlock(), sound.unlock()]);
    sound.shot('first', { x: 50, z: 0 });
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
