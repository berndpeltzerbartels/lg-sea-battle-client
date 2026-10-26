export function engineMix({ depth, power, active = true, muted = false, submarine = true, slow = false, deepSubmerged = false, surfacePower = Math.abs(power), surfaceGainScale = 1, interiorFanGain = 0 }) {
  const load = Math.min(1, Math.max(0, Math.abs(power)));
  const immersion = submarine ? Math.min(1, Math.max(0, (depth - 0.1) / 0.7)) : 0;
  const dieselBlend = Math.min(1, load / .2);
  const surfaceLevel = active && !muted ? Math.cos(immersion * Math.PI / 2) * surfaceGainScale : 0;
  const level = active && !muted && !slow && load > 0 ? 0.25 + 0.55 * Math.sqrt(load) : 0;
  return {
    rate: 0.55 + 0.45 * load,
    surfaceRate: 0.55 + 0.45 * Math.min(2, Math.max(0, surfacePower)),
    fanRate: 1,
    fanGain: active && !muted ? (submarine ? immersion * 0.65 : interiorFanGain) : 0,
    gain: level,
    underwaterGain: deepSubmerged ? 0 : Math.sin(immersion * Math.PI / 2) * level,
    idleGain: surfaceLevel * .55 * Math.sqrt(1 - dieselBlend),
    surfaceGain: surfaceLevel * (0.25 + 0.55 * Math.sqrt(load)) * Math.sqrt(dieselBlend)
  };
}

export function createEngineSound({ surfaceUrl, idleUrl, underwaterUrl, fanUrl, context, destination = context.destination, report = () => {} }) {
  const voices = [];
  let pending, disposed = false, lastUpdate = -Infinity, retryAt = 0;
  let mix = { idleGain: 0, rate: 0.55, gain: 0, surfaceGain: 0, underwaterGain: 0, fanGain: 0, surfaceRate: 0.55 };
  function apply() {
    if (disposed) return;
    for (const voice of voices) {
      voice.source.playbackRate.setTargetAtTime((voice.channel === "fanGain" || voice.channel === "idleGain") ? 1 : voice.channel === "surfaceGain" ? mix.surfaceRate : mix.rate, context.currentTime, 0.55);
      voice.gain.gain.setTargetAtTime(mix[voice.channel] * 0.2, context.currentTime, 0.35);
    }
  }
  return {
    async unlock() {
      if (disposed) return;
      // resume must be called synchronously from the user's gesture.
      const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
      if (!pending && context.currentTime >= retryAt) {
        pending = (async () => {
          const entries = [[surfaceUrl, 'surfaceGain'], [idleUrl, 'idleGain'], [underwaterUrl, 'underwaterGain'], [fanUrl, 'fanGain']].filter(([url]) => url);
          const decoded = await Promise.all(entries.map(async ([url, channel]) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Motor-Sample: HTTP ${response.status}`);
            return { channel, buffer: await context.decodeAudioData(await response.arrayBuffer()) };
          }));
          if (disposed) return;
          for (const { channel, buffer } of decoded) {
            const gain = context.createGain();
            gain.gain.value = 0;
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.loopStart = 0;
            source.loopEnd = buffer.duration;
            source.connect(gain);
            gain.connect(destination);
            source.start();
            voices.push({ source, gain, channel });
          }
          apply();
        })().catch(error => {
          pending = null;
          retryAt = context.currentTime + 5;
          report(error);
        });
      }
      await resumed;
      await pending;
    },
    update(state, force = false) {
      mix = engineMix(state);
      if (!force && context.currentTime - lastUpdate < 0.1) return;
      lastUpdate = context.currentTime;
      apply();
    },
    state() { return { ...mix, loaded: voices.length > 0, looping: voices.every(v => v.source.loop), voices: voices.length, context: context.state }; },
    dispose() {
      disposed = true;
      for (const { source, gain } of voices) { source.stop(); source.disconnect(); gain.disconnect(); }
    }
  };
}
