export function engineMix({ depth, power, active = true, muted = false, submarine = true, slow = false, deepSubmerged = false, surfacePower = Math.abs(power), surfaceGainScale = 1, interiorFanGain = 0, grounded = false, audioTime = 0 }) {
  const load = Math.min(1, Math.max(0, Math.abs(power)));
  const immersion = submarine ? Math.min(1, Math.max(0, (depth - 0.1) / 0.7)) : 0;
  const surfaceLevel = active && !muted ? Math.cos(immersion * Math.PI / 2) * surfaceGainScale : 0;
  const level = active && !muted && !slow && load > 0 ? 0.25 + 0.55 * Math.sqrt(load) : 0;
  const strained = active && !muted && grounded && load > .01 && immersion < .05;
  const uneven = Math.sin(audioTime * Math.PI * 4.2) * .055 + Math.sin(audioTime * Math.PI * 7.4) * .025;
  return {
    strained,
    surfaceCutoff: strained ? 850 + load * 650 : 20000,
    rate: 0.55 + 0.45 * load,
    surfaceRate: strained ? (.72 + .1 * Math.sqrt(load)) * (1 + uneven * .25) : 0.66 + 0.34 * Math.min(2, Math.max(0, surfacePower)),
    fanRate: 1,
    fanGain: active && !muted ? (submarine ? immersion * 0.65 : interiorFanGain) : 0,
    gain: level,
    underwaterGain: deepSubmerged ? 0 : Math.sin(immersion * Math.PI / 2) * level,
    surfaceGain: surfaceLevel * (0.48 + 0.32 * Math.sqrt(load)) * (strained ? 1.08 + uneven : 1)
  };
}

export function createEngineSound({ surfaceUrl, underwaterUrl, fanUrl, context, destination = context.destination, report = () => {} }) {
  const voices = [];
  let rumble, scrapeBuffer, wasStrained = false, lastScrape = -Infinity;
  const effects = new Set();
  let pending, disposed = false, lastUpdate = -Infinity, retryAt = 0;
  let mix = { rate: 0.55, gain: 0, surfaceGain: 0, underwaterGain: 0, fanGain: 0, surfaceRate: 0.55 };
  function apply() {
    if (disposed) return;
    for (const voice of voices) {
      const diesel = voice.channel === "surfaceGain";
      const rate = voice.channel === "fanGain" ? 1 : voice.channel === "surfaceGain" ? mix.surfaceRate : mix.rate;
      voice.source.playbackRate.setTargetAtTime(rate, context.currentTime, diesel ? (mix.strained ? .18 : .9) : .55);
      voice.filter?.frequency.setTargetAtTime(mix.surfaceCutoff, context.currentTime, .15);
      voice.gain.gain.setTargetAtTime(mix[voice.channel] * 0.2, context.currentTime, diesel ? (mix.strained ? .04 : .9) : .35);
    }
    if (rumble) {
      rumble.source.frequency.setTargetAtTime(62 + Math.sin(context.currentTime * 13) * 4, context.currentTime, .06);
      rumble.gain.gain.setTargetAtTime(mix.strained ? mix.surfaceGain * .018 : 0, context.currentTime, mix.strained ? .08 : .25);
    }
    if (mix.strained && !wasStrained && scrapeBuffer && context.currentTime - lastScrape > 2) {
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = scrapeBuffer;
      gain.gain.value = mix.surfaceGain * .065;
      source.connect(gain); gain.connect(destination);
      source.onended = () => { source.disconnect(); gain.disconnect(); effects.delete(source); };
      effects.add(source); source.start(); lastScrape = context.currentTime;
    }
    wasStrained = !!mix.strained;
  }
  return {
    async unlock() {
      if (disposed) return;
      // resume must be called synchronously from the user's gesture.
      const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
      if (!pending && context.currentTime >= retryAt) {
        pending = (async () => {
          const entries = [[surfaceUrl, 'surfaceGain'], [underwaterUrl, 'underwaterGain'], [fanUrl, 'fanGain']].filter(([url]) => url);
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
            const filter = channel === 'surfaceGain' ? context.createBiquadFilter?.() : null;
            if (filter) {
              filter.type = 'lowpass'; filter.frequency.value = 20000; filter.Q.value = .7;
              source.connect(filter); filter.connect(gain);
            } else source.connect(gain);
            gain.connect(destination);
            source.start();
            voices.push({ source, gain, channel, filter });
            if (channel === 'surfaceGain' && context.createOscillator) {
              const oscillator = context.createOscillator(), lowGain = context.createGain();
              oscillator.type = 'triangle'; oscillator.frequency.value = 62; lowGain.gain.value = 0;
              oscillator.connect(lowGain); lowGain.connect(destination); oscillator.start();
              rumble = { source: oscillator, gain: lowGain };
              scrapeBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .34), context.sampleRate);
              const data = scrapeBuffer.getChannelData(0);
              let low = 0;
              for (let i = 0; i < data.length; i++) {
                low = low * .88 + (Math.random() * 2 - 1) * .12;
                data[i] = low * Math.min(1, i / (context.sampleRate * .012)) * Math.exp(-i / (context.sampleRate * .09));
              }
            }
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
      mix = engineMix({ ...state, audioTime: context.currentTime });
      if (!force && context.currentTime - lastUpdate < 0.1) return;
      lastUpdate = context.currentTime;
      apply();
    },
    state() { return { ...mix, loaded: voices.length > 0, looping: voices.every(v => v.source.loop), voices: voices.length, context: context.state }; },
    dispose() {
      disposed = true;
      for (const { source, gain, filter } of voices) { source.stop(); source.disconnect(); filter?.disconnect(); gain.disconnect(); }
      if (rumble) { rumble.source.stop(); rumble.source.disconnect(); rumble.gain.disconnect(); }
      for (const source of effects) source.stop();
      effects.clear();
    }
  };
}
