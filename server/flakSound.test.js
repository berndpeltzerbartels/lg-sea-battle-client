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
  assert.equal(deep.gain, 0);
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

test('flak overlaps a natural final volley once and interrupts it when firing resumes', async () => {
  const original = globalThis.fetch;
  const sources = [], loads = [];
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({ connect(target) { this.destination = target; }, disconnect() {}, gain: param(), pan: param(), frequency: param() });
  const context = { currentTime: 0, state: 'running', destination: {},
    decodeAudioData: async bytes => ({ tag: new TextDecoder().decode(bytes), duration: 1 }),
    createGain: node, createBiquadFilter: node, createStereoPanner: node,
    createBufferSource: () => {
      const source = { ...node(), playbackRate: param(), start() {}, stop() {} };
      sources.push(source); return source;
    } };
  try {
    globalThis.fetch = async url => {
      loads.push(url);
      return { ok: true, arrayBuffer: async () => new TextEncoder().encode(url).buffer };
    };
    const sound = createFlakSound({ context, url: 'fire', endingUrl: 'ending', maxVoices: 1 });
    await sound.unlock(); await sound.unlock();
    assert.deepEqual(loads, ['fire', 'ending']);
    const listener = { x: 0, z: 0, heading: 0 };
    sound.update(listener);
    for (let shot = 0; shot < 100; shot++) sound.shot('own', listener, true);
    assert.equal(sources.length, 1, 'No source per projectile or separate air loop');
    const fireGain = sources[0].destination.gain;
    context.currentTime = .25; sound.update(listener, true);
    assert.equal(sources.length, 2);
    assert.equal(sources[1].buffer.tag, 'ending');
    assert.equal(sources[1].loop, false, 'The natural air decay must never repeat');
    assert.equal(fireGain.value, 0, 'Fade the sustained source while final recorded shots take over');
    assert.equal(sound.state().voices, 1);
    context.currentTime = .3; sound.update(listener, true);
    assert.equal(sources.length, 2, 'One ending per completed burst');
    sound.shot('own', listener, true);
    assert.equal(sources.length, 2, 'Resume the original sustained source');
    assert.equal(fireGain.value, 1);
    context.currentTime = .55; sound.update(listener, true);
    assert.equal(sources.length, 3, 'A new ending only after the next burst stops');
    context.currentTime = 1.7; sound.update(listener, true);
    assert.equal(sound.state().voices, 0);
    sound.shot('own', listener, true);
    context.currentTime = 10; sound.update(listener, true);
    assert.equal(sound.state().voices, 0);
    assert.equal(sources.length, 4, 'Returning from a hidden tab must not trigger an old ending');
    sound.dispose();
  } finally { globalThis.fetch = original; }
});
