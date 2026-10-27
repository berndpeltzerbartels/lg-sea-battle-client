export function flakSpatialMix(position, listener) {
  const dx = position.x - listener.x, dz = position.z - listener.z;
  const distance = Math.hypot(dx, dz);
  const gain = listener.muted || distance >= 600 ? 0
    : 0.65 * (1 - distance / 600) ** 2 / (1 + distance / 80);
  return {
    gain: gain * (listener.underwater ? 0 : 1),
    pan: distance > 1 ? Math.max(-1, Math.min(1,
      (dx * Math.cos(listener.heading) - dz * Math.sin(listener.heading)) / distance)) : 0,
    frequency: listener.underwater ? 500 : 6500 / (1 + distance / 100)
  };
}

// One continuous burst per firing ship, never one source per projectile.
export function createFlakSound({ context, destination = context.destination, url, report = () => {}, maxVoices = 8, baseRate = 1, spatialMix = flakSpatialMix, sustainSeconds = .18, gainSmoothing = .025 }) {
  let buffer, pending, disposed = false, lastUpdate = -Infinity;
  let listener = { x: 0, z: 0, heading: 0, muted: false };
  const voices = new Map();
  function remove(id) {
    const v = voices.get(id);
    v.source.stop();
    for (const node of [v.source, v.filter, v.gain, v.pan]) node?.disconnect();
    voices.delete(id);
  }
  return {
    unlock() {
      if (!pending && !disposed) pending = (async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Flak-Sample: HTTP ${response.status}`);
        buffer = await context.decodeAudioData(await response.arrayBuffer());
      })().catch(error => { report(error); });
      return pending;
    },
    shot(id, position, own = false, options = {}) {
      if (!buffer || disposed || context.state !== 'running') return;
      const mix = spatialMix(own ? listener : position, listener);
      mix.gain *= options.gain ?? 1;
      if (mix.gain < 0.002) return;
      let v = voices.get(id);
      if (!v) {
        if (voices.size >= maxVoices) {
          const weakest = [...voices.entries()].filter(([, voice]) => !voice.own)
            .sort((a, b) => a[1].priority - b[1].priority)[0];
          if (!weakest || (!own && mix.gain <= weakest[1].priority)) return;
          remove(weakest[0]);
        }
        const source = context.createBufferSource(), filter = context.createBiquadFilter();
        const gain = context.createGain();
        const pan = context.createStereoPanner?.();
        source.buffer = buffer;
        source.loop = true;
        if (options.rate !== undefined || baseRate !== 1) source.playbackRate.value = options.rate ?? baseRate;
        filter.type = 'lowpass';
        gain.gain.value = 0;
        source.connect(filter); filter.connect(gain);
        if (pan) { gain.connect(pan); pan.connect(destination); }
        else gain.connect(destination);
        v = { source, filter, gain, pan, own };
        voices.set(id, v);
        source.start();
      }
      v.strength = options.gain ?? 1;
      if (options.rate !== undefined) v.source.playbackRate.setTargetAtTime(options.rate, context.currentTime, .15);
      v.position = { x: position.x, y: position.y, z: position.z };
      v.lastShot = context.currentTime;
      v.priority = mix.gain;
      v.gain.gain.setTargetAtTime(mix.gain / Math.sqrt(voices.size), context.currentTime, Math.max(.01, gainSmoothing - .015));
      v.filter.frequency.setTargetAtTime(mix.frequency, context.currentTime, 0.03);
      v.pan?.pan.setTargetAtTime(mix.pan, context.currentTime, 0.03);
    },
    update(state, force = false) {
      listener = state;
      const now = context.currentTime;
      if (!force && now - lastUpdate < 0.05) return;
      lastUpdate = now;
      for (const [id, v] of voices) {
        const age = now - v.lastShot;
        if (age > Math.max(.5, sustainSeconds + .32)) { remove(id); continue; }
        const mix = spatialMix(v.own ? listener : v.position, listener);
        mix.gain *= v.strength;
        v.priority = mix.gain;
        const tail = Math.max(0, Math.min(1, (sustainSeconds + .14 - age) / .14));
        v.gain.gain.setTargetAtTime(mix.gain * tail / Math.sqrt(voices.size), now, gainSmoothing);
        v.filter.frequency.setTargetAtTime(mix.frequency, now, 0.05);
        v.pan?.pan.setTargetAtTime(mix.pan, now, 0.05);
      }
    },
    state: () => ({ loaded: !!buffer, voices: voices.size, maxVoices }),
    dispose() { disposed = true; for (const id of voices.keys()) remove(id); }
  };
}
