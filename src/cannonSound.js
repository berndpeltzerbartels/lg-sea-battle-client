import { flakSpatialMix } from './flakSound.js';

// Longer hearing range than flak, with the same inexpensive stereo/filter model.
export function cannonSpatialMix(position, listener, rangeScale = 1, options = {}) {
  const mix = flakSpatialMix({ x: listener.x + (position.x - listener.x) / (2 * rangeScale),
    z: listener.z + (position.z - listener.z) / (2 * rangeScale) }, { ...listener, underwater: false });
  const distance = Math.hypot(position.x - listener.x, position.z - listener.z);
  if (distance >= 1200) mix.gain = 0;
  else if (rangeScale > 1) mix.gain *= Math.min(1, (1200 - distance) / 300);
  if (options.underwaterOnly && !listener.underwater
      || listener.underwater && !options.waterExplosion && !options.underwaterOnly) mix.gain = 0;
  mix.frequency = Math.min(mix.frequency, options.lowpassHz ?? Infinity);
  if (listener.underwater) mix.frequency = Math.min(mix.frequency, listener.deepSubmerged ? 450 : 1400);
  return { ...mix, gain: mix.gain * 1.6 };
}

export function createCannonSound({ context, destination = context.destination, url, urls, report = () => {}, maxVoices = 6 }) {
  let buffers = [], pending, disposed = false, lastUpdate = -Infinity;
  let listener = { x: 0, z: 0, heading: 0, muted: false };
  const voices = new Map(), seen = new Set();
  function remove(id, stop = true) {
    const v = voices.get(id);
    if (!v) return;
    voices.delete(id);
    v.source.onended = null;
    if (stop) v.source.stop();
    for (const node of [v.source, v.filter, v.gain, v.pan]) node?.disconnect();
  }
  function apply(v) {
    const mix = cannonSpatialMix(v.own ? listener : v.position, listener, v.rangeScale, v);
    mix.gain *= v.strength;
    v.priority = mix.gain;
    v.gain.gain.setTargetAtTime(mix.gain / (v.own || v.noDucking ? 1 : Math.sqrt(voices.size)), context.currentTime, .015);
    v.filter.frequency.setTargetAtTime(mix.frequency, context.currentTime, .03);
    v.pan?.pan.setTargetAtTime(mix.pan, context.currentTime, .03);
  }
  return {
    unlock() {
      if (!pending && !disposed) pending = (async () => {
        buffers = await Promise.all((urls ?? [url]).map(async sampleUrl => {
          const response = await fetch(sampleUrl);
          if (!response.ok) throw new Error(`Effekt-Sample: HTTP ${response.status}`);
          return context.decodeAudioData(await response.arrayBuffer());
        }));
      })().catch(report);
      return pending;
    },
    shot(id, position, own = false, options = {}) {
      if (!buffers.length || disposed || context.state !== 'running' || seen.has(id)) return;
      seen.add(id);
      if (seen.size > 128) seen.delete(seen.values().next().value);
      const mix = cannonSpatialMix(own ? listener : position, listener, options.rangeScale ?? 1, options);
      const strength = options.gain ?? 1;
      mix.gain *= strength;
      if (mix.gain < .002) return;
      if (voices.size >= maxVoices) {
        const weakest = [...voices.entries()].filter(([, voice]) => !voice.own || own)
          .sort((a, b) => a[1].priority - b[1].priority)[0];
        if (!weakest || (!own && mix.gain <= weakest[1].priority)
            || (own && weakest[1].own && mix.gain <= weakest[1].priority)) return;
        remove(weakest[0]);
      }
      const source = context.createBufferSource(), filter = context.createBiquadFilter();
      const gain = context.createGain(), pan = context.createStereoPanner?.();
      source.buffer = buffers[(options.variant ?? 0) % buffers.length];
      if (options.rate !== undefined) source.playbackRate.value = options.rate;
      source.loop = false;
      filter.type = 'lowpass';
      gain.gain.value = 0;
      source.connect(filter); filter.connect(gain);
      if (pan) { gain.connect(pan); pan.connect(destination); }
      else gain.connect(destination);
      const voice = { source, filter, gain, pan, position: { x: position.x, z: position.z }, own, strength, lowpassHz: options.lowpassHz, waterExplosion: !!options.waterExplosion, underwaterOnly: !!options.underwaterOnly, rangeScale: options.rangeScale ?? 1, noDucking: !!options.noDucking };
      voices.set(id, voice);
      gain.gain.value = mix.gain / (own || options.noDucking ? 1 : Math.sqrt(voices.size));
      filter.frequency.value = mix.frequency;
      if (pan) pan.pan.value = mix.pan;
      apply(voice);
      source.onended = () => remove(id, false);
      source.start();
    },
    update(state, force = false) {
      listener = state;
      if (!force && context.currentTime - lastUpdate < .05) return;
      lastUpdate = context.currentTime;
      for (const voice of voices.values()) apply(voice);
    },
    move(id, position) {
      const voice = voices.get(id);
      if (voice) voice.position = { x: position.x, z: position.z };
    },
    state: () => ({ loaded: buffers.length > 0, voices: voices.size, maxVoices }),
    dispose() { disposed = true; for (const id of voices.keys()) remove(id); }
  };
}
