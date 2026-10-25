import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlakSound, flakSpatialMix } from '../src/flakSound.js';

test('distant flak is quieter and duller, stereo follows heading, underwater is muffled', () => {
  const listener = { x: 0, z: 0, heading: 0 };
  const near = flakSpatialMix({ x: 10, z: 0 }, listener);
  const far = flakSpatialMix({ x: 200, z: 0 }, listener);
  assert.ok(near.gain > far.gain && near.frequency > far.frequency);
  assert.equal(near.pan, 1);
  assert.equal(flakSpatialMix({ x: -10, z: 0 }, listener).pan, -1);
  assert.ok(flakSpatialMix({ x: 10, z: 0 }, { ...listener, heading: Math.PI }).pan < -.99);
  assert.equal(flakSpatialMix({ x: 600, z: 0 }, listener).gain, 0);
  assert.equal(flakSpatialMix({ x: 10, z: 0 }, { ...listener, muted: true }).gain, 0);
  const deep = flakSpatialMix({ x: 10, z: 0 }, { ...listener, underwater: true });
  assert.ok(deep.gain < near.gain && deep.frequency < near.frequency);
});

test('sustained fire reuses one source per ship with a strict voice cap and own-ship priority', async () => {
  const original = globalThis.fetch;
  let loads = 0, sources = 0, stopped = 0;
  const param = () => ({ value: 0, setTargetAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), pan: param(), frequency: param() });
  const context = { currentTime: 1, state: 'running', destination: {},
    decodeAudioData: async () => ({}), createGain: node, createBiquadFilter: node,
    createStereoPanner: node,
    createBufferSource: () => { sources++; return { ...node(), start() {}, stop() { stopped++; } }; } };
  try {
    globalThis.fetch = async () => { loads++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(2) }; };
    const sound = createFlakSound({ context, url: '/flak.wav', maxVoices: 3 });
    await Promise.all([sound.unlock(), sound.unlock()]);
    sound.update({ x: 0, z: 0, heading: 0 });
    for (let i = 0; i < 1000; i++) sound.shot('same', { x: 20, z: 0 });
    assert.equal(sources, 1);
    sound.shot('other', { x: 40, z: 0 });
    sound.shot('third', { x: 60, z: 0 });
    sound.shot('farther', { x: 100, z: 0 });
    assert.equal(sources, 3);
    sound.shot('own', { x: 0, z: 0 }, true);
    assert.equal(sound.state().voices, 3);
    assert.equal(stopped, 1);
    sound.shot('inaudible', { x: 700, z: 0 });
    assert.equal(sources, 4);
    context.currentTime += .6;
    sound.update({ x: 0, z: 0, heading: 0 });
    assert.equal(sound.state().voices, 0);
    assert.equal(stopped, 4);
    assert.equal(loads, 1);
    sound.dispose();
  } finally { globalThis.fetch = original; }
});
