import test from 'node:test';
import assert from 'node:assert/strict';
import { torpedoSpatialMix } from '../src/torpedoSound.js';

test('torpedo acoustics follow actual three-dimensional distance and listening side', () => {
  const listener = { x: 0, y: -10, z: 0, heading: 0, underwater: true };
  const near = torpedoSpatialMix({ x: 10, y: -10, z: 0 }, listener);
  const far = torpedoSpatialMix({ x: 50, y: -10, z: 0 }, listener);
  const below = torpedoSpatialMix({ x: 10, y: -60, z: 0 }, listener);
  assert.ok(near.gain > far.gain && near.gain > below.gain);
  assert.equal(near.pan, 1);
  assert.equal(torpedoSpatialMix({ x: -10, y: -10, z: 0 }, listener).pan, -1);
  assert.equal(torpedoSpatialMix({ x: 130, y: -10, z: 0 }, listener).gain, 0);
  assert.equal(torpedoSpatialMix({ x: 10, y: -10, z: 0 }, { ...listener, muted: true }).gain, 0);
  assert.ok(torpedoSpatialMix({ x: 10, y: -10, z: 0 }, { ...listener, underwater: false }).gain < near.gain);
});

test('submarine and torpedo boat select separate launch buffers', async () => {
  const { createTorpedoSound } = await import('../src/torpedoSound.js');
  const original = globalThis.fetch;
  const sources = [];
  const param = () => ({ value: 0, setTargetAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), pan: param() });
  const context = { currentTime: 0, state: 'running', destination: {},
    decodeAudioData: async bytes => ({ tag: new TextDecoder().decode(bytes) }),
    createGain: node, createBiquadFilter: node, createStereoPanner: node,
    createBufferSource: () => { const source = { ...node(), start() {}, stop() {} }; sources.push(source); return source; } };
  try {
    globalThis.fetch = async url => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode(url).buffer });
    const sound = createTorpedoSound({ context, launchUrl: 'submarine', boatLaunchUrl: 'boat', engineUrl: 'propulsion' });
    await sound.unlock();
    sound.launch('sub', { x: 0, z: 0 }, true, 'submarine');
    sound.launch('boat', { x: 0, z: 0 }, true, 'torpedo-boat');
    assert.deepEqual(sources.map(s => s.buffer.tag), ['submarine', 'boat']);
    sound.dispose();
  } finally { globalThis.fetch = original; }
});
