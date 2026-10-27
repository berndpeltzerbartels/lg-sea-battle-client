// Quiet, bounded underwater ambience while the sinking observer is actually submerged.
export function createSinkingWaterSound({ context, destination = context.destination }) {
  let buffer, voice = null, disposed = false;
  function prepare() {
    if (buffer) return;
    buffer = context.createBuffer(1, Math.floor(context.sampleRate * 6), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 173, brown = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      brown = (brown + ((seed / 4294967296) * 2 - 1) * .018) / 1.018;
      const t = i / context.sampleRate;
      const phase = (t + .17) % 1.5;
      const bubble = phase < .18 ? Math.sin(Math.PI * phase / .18) ** 2
        * Math.sin(2 * Math.PI * (180 * phase - 220 * phase * phase)) * .12 : 0;
      // Seamless noise bed: silence at the loop seam; bubble phases also finish before it.
      const edge = Math.min(1, t / .1, (6 - t) / .1);
      samples[i] = (brown * .25 + bubble) * edge;
    }
  }
  function stop() {
    if (!voice) return;
    const old = voice; voice = null;
    old.gain.gain.setTargetAtTime(0, context.currentTime, .08);
    old.source.stop(context.currentTime + .3);
  }
  return {
    update({ sinking, underwater, muted }) {
      const active = !disposed && sinking && underwater && !muted && context.state === 'running';
      if (!active) { stop(); return; }
      if (voice) return;
      prepare();
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = buffer; source.loop = true;
      filter.type = 'lowpass'; filter.frequency.value = 650;
      gain.gain.value = 0; gain.gain.setTargetAtTime(.065, context.currentTime, .2);
      source.connect(filter); filter.connect(gain); gain.connect(destination);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(); voice = { source, filter, gain };
    },
    state: () => ({ active: !!voice, voices: voice ? 1 : 0 }),
    dispose() { disposed = true; stop(); buffer = null; }
  };
}
