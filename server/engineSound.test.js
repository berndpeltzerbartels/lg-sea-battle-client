import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngineSound, engineMix } from '../src/engineSound.js';

test('full power preserves the sample pitch; reduced and reverse power are lower', () => {
  assert.equal(engineMix({ depth: 6, power: 1 }).rate, 1);
  const half = engineMix({ depth: 6, power: 0.5 });
  assert.ok(half.rate < 1 && half.gain > 0);
  assert.deepEqual(half, engineMix({ depth: 6, power: -0.5 }));
  for (const state of [{ depth: 6, power: 1, slow: true }, { depth: 6, power: 0 },
    { depth: 6, power: 1, active: false }, { depth: 6, power: 1, muted: true }]) {
    assert.equal(engineMix(state).gain, 0);
  }
  assert.ok(engineMix({ depth: 0.4, power: 1 }).underwaterGain < 0.8);
});

test('one decoded buffer and one looping source survive repeated gestures and speed changes', async () => {
  const original = globalThis.fetch;
  const ramps = [];
  let loads = 0, decodes = 0, sources = 0, stops = 0;
  const param = { value: 0, setTargetAtTime: (...args) => ramps.push(args) };
  const source = { connect() {}, disconnect() {}, start() {}, stop() { stops++; }, playbackRate: param };
  const context = { currentTime: 1, state: 'running', resume: async () => {},
    decodeAudioData: async () => { decodes++; return { duration: 11 }; },
    createGain: () => ({ gain: param, connect() {}, disconnect() {} }),
    createBufferSource: () => { sources++; return source; } };
  try {
    globalThis.fetch = async () => { loads++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(2) }; };
    const sound = createEngineSound({ fanUrl: '/fan.wav', context });
    sound.update({ depth: 6, power: 1 });
    await Promise.all([sound.unlock(), sound.unlock()]);
    for (let i = 0; i < 100; i++) sound.update({ depth: 6, power: i / 100 });
    assert.equal(loads, 1);
    assert.equal(decodes, 1);
    assert.equal(sources, 1);
    assert.equal(source.loop, true);
    assert.equal(source.loopEnd, 11);
    assert.equal(ramps[0][0], 1, "fan playback keeps original pitch");
    assert.ok(ramps[1][0] < .2, "continuous background must stay well below full-level effects");
    assert.ok(ramps.length <= 4, 'automation is throttled rather than scheduled every frame');
    sound.update({ depth: 6, power: 1, muted: true }, true);
    assert.equal(ramps.at(-1)[0], 0);
    sound.dispose();
    await sound.unlock();
    assert.equal(stops, 1);
    assert.equal(sources, 1);
  } finally { globalThis.fetch = original; }
});

test('surface diesel and submerged engine crossfade by actual depth with constant energy', () => {
  const surface = engineMix({ depth: 0, power: 1 });
  assert.equal(surface.surfaceGain, .8);
  assert.equal(surface.underwaterGain, 0);
  const deep = engineMix({ depth: 6, power: 1 });
  assert.equal(deep.underwaterGain, .8);
  assert.ok(deep.surfaceGain < 1e-9);
  const mid = engineMix({ depth: .45, power: 1 });
  assert.ok(Math.abs(mid.surfaceGain ** 2 + mid.underwaterGain ** 2 - .8 ** 2) < 1e-9);
  const boat = engineMix({ depth: 6, power: 1, submarine: false });
  assert.equal(boat.underwaterGain, 0);
  assert.equal(boat.surfaceGain, .8);
});

test('fan is independent of propulsion and uses actual immersion, not commanded depth', () => {
  for (const power of [0, .05, .5, 1, -1]) {
    const mix = engineMix({ depth: 6, power, slow: true });
    assert.equal(mix.fanRate, 1);
    assert.equal(mix.fanGain, .65);
  }
  for (const state of [{ depth: 0 }, { depth: 6, submarine: false },
    { depth: 6, active: false }, { depth: 6, muted: true }]) {
    assert.equal(engineMix({ power: 0, ...state }).fanGain, 0);
  }
});

test('deep diving leaves only the constant fan at every engine order', () => {
  for (const power of [0, .05, .5, 1, -1]) {
    const mix = engineMix({ depth: 6, power, deepSubmerged: true });
    assert.equal(mix.underwaterGain, 0);
    assert.ok(mix.surfaceGain < 1e-9);
    assert.equal(mix.fanGain, .65);
    assert.equal(mix.fanRate, 1);
  }
  assert.ok(engineMix({ depth: 1.6, power: 1, deepSubmerged: false }).underwaterGain > 0);
});

test('torpedo boat interior quiets diesel and adds fixed ventilation, exterior retains its mix', () => {
  for (const power of [0, .3, 1]) {
    const outside = engineMix({ depth: 0, submarine: false, power });
    for (const scale of [.4, .5]) {
      const inside = engineMix({ depth: 0, submarine: false, power, surfaceGainScale: scale, interiorFanGain: .3 });
      assert.equal(inside.surfaceGain, outside.surfaceGain * scale);
      assert.equal(inside.fanGain, .3);
      assert.equal(inside.fanRate, 1);
    }
    assert.equal(outside.fanGain, 0);
  }
});


test('surface diesels idle at Stop and crossfade without changing submerged propulsion', () => {
  for (const submarine of [false, true]) {
    const stop = engineMix({ depth: 0, power: 0, submarine });
    assert.equal(stop.idleGain, .55);
    assert.equal(stop.surfaceGain, 0);
    const slow = engineMix({ depth: 0, power: .1, submarine });
    assert.ok(slow.idleGain > 0 && slow.surfaceGain > 0);
    assert.equal(engineMix({ depth: 0, power: .2, submarine }).idleGain, 0);
    assert.equal(engineMix({ depth: 0, power: 1, submarine }).surfaceGain, .8);
    for (const state of [{ muted: true }, { active: false }]) {
      assert.equal(engineMix({ depth: 0, power: 0, submarine, ...state }).idleGain, 0);
    }
  }
  const deep = engineMix({ depth: 6, power: 0, deepSubmerged: true });
  assert.ok(deep.idleGain < 1e-9);
  assert.equal(deep.underwaterGain, 0);
  assert.equal(deep.fanGain, .65);
});


test('diesel transition gently accelerates idle and fades it completely by cruising load', () => {
  let previousRate = 0;
  for (let i = 0; i <= 20; i++) {
    const mix = engineMix({ depth: 0, power: i / 100 });
    assert.ok(mix.idleRate >= previousRate);
    previousRate = mix.idleRate;
    assert.ok(Number.isFinite(mix.surfaceGain) && Number.isFinite(mix.idleGain));
  }
  assert.equal(engineMix({ depth: 0, power: 0 }).idleRate, 1);
  assert.equal(engineMix({ depth: 0, power: .2 }).idleGain, 0);
});
