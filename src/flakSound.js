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
export function createFlakSound({ context, destination = context.destination, url, endingUrl, report = () => {}, maxVoices = 8, baseRate = 1, spatialMix = flakSpatialMix, sustainSeconds = .18, gainSmoothing = .025 }) {
  let buffer, endingBuffer, pending, disposed = false, lastUpdate = -Infinity, retryAt = 0;
  let listener = { x: 0, z: 0, heading: 0, muted: false };
  const voices = new Map();
  function remove(id) {
    const v = voices.get(id);
    v.source.stop();
    v.endingSource?.stop();
    for (const node of [v.source, v.endingSource, v.fireGain, v.endingGain, v.filter, v.gain, v.pan]) node?.disconnect();
    voices.delete(id);
  }
  function startSource(v, ending = false) {
    const source = context.createBufferSource();
    source.buffer = ending ? endingBuffer : buffer;
    source.loop = !ending;
    if (v.rate !== 1) source.playbackRate.value = v.rate;
    source.connect(ending ? v.endingGain : v.fireGain ?? v.filter);
    source.start();
    return source;
  }
  return {
    unlock() {
      if (!pending && !disposed && Date.now() >= retryAt) pending = (async () => {
        const load = async sampleUrl => {
          const response = await fetch(sampleUrl);
          if (!response.ok) throw new Error(`Flak-Sample: HTTP ${response.status}`);
          return context.decodeAudioData(await response.arrayBuffer());
        };
        [buffer, endingBuffer] = await Promise.all([load(url), endingUrl ? load(endingUrl) : undefined]);
      })().catch(error => { pending = null; retryAt = Date.now() + 5000; report(error); });
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
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        const pan = context.createStereoPanner?.();
        filter.type = 'lowpass';
        gain.gain.value = 0;
        filter.frequency.value = mix.frequency;
        filter.connect(gain);
        if (pan) { gain.connect(pan); pan.connect(destination); }
        else gain.connect(destination);
        v = { filter, gain, pan, own, rate: options.rate ?? baseRate };
        if (endingBuffer) {
          v.fireGain = context.createGain();
          v.endingGain = context.createGain();
          v.fireGain.gain.value = 1;
          v.endingGain.gain.value = 0;
          v.fireGain.connect(filter);
          v.endingGain.connect(filter);
        }
        voices.set(id, v);
        v.source = startSource(v);
      }
      if (options.rate !== undefined) v.rate = options.rate;
      // A resumed burst interrupts the previous natural ending.
      if (v.endingSource) {
        v.endingSource.stop();
        v.endingSource.disconnect();
        v.endingSource = null;
      }
      v.fireGain?.gain.setTargetAtTime(1, context.currentTime, .008);
      v.strength = options.gain ?? 1;
      if (options.rate !== undefined) {
        v.source.playbackRate.setTargetAtTime(options.rate, context.currentTime, .15);
      }
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
        const releaseAge = Math.max(0, age - sustainSeconds);
        if (endingBuffer && age > sustainSeconds + endingBuffer.duration / v.rate + .05) {
          remove(id); continue; // Do not replay a stale ending after a suspended tab catches up.
        }
        if (endingBuffer && releaseAge > 0 && !v.endingSource) {
          v.endingGain.gain.value = 1;
          v.endingStarted = now;
          v.endingSource = startSource(v, true);
        }
        const finished = v.endingSource
          ? now - v.endingStarted > endingBuffer.duration / v.rate + .05
          : !endingBuffer && age > Math.max(.5, sustainSeconds + .32);
        if (finished) { remove(id); continue; }
        // Overlap the final recorded shots with a 40 ms fade of sustained fire.
        if (endingBuffer) v.fireGain.gain.setTargetAtTime(v.endingSource ? 0 : 1, now, .012);
        const mix = spatialMix(v.own ? listener : v.position, listener);
        mix.gain *= v.strength;
        v.priority = mix.gain;
        const tail = endingBuffer ? 1 : Math.max(0, Math.min(1, (sustainSeconds + .14 - age) / .14));
        v.gain.gain.setTargetAtTime(mix.gain * tail / Math.sqrt(voices.size), now, gainSmoothing);
        v.filter.frequency.setTargetAtTime(mix.frequency, now, 0.05);
        v.pan?.pan.setTargetAtTime(mix.pan, now, 0.05);
      }
    },
    state: () => ({ loaded: !!buffer, voices: voices.size, maxVoices }),
    dispose() { disposed = true; for (const id of voices.keys()) remove(id); }
  };
}
