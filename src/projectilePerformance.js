export function createProjectilePerformance(enabled, output = report => console.info('[SeaBattle performance]', report)) {
  let samples = {}, since = 0, previous = 0;
  const reports = [];
  let culling = true;
  let projectileLights = false;
  let contextSamples = [], lastContext = -Infinity;
  function reset() { samples = {}; since = 0; previous = 0; contextSamples = []; lastContext = -Infinity; }
  return {
    get culling() { return culling; },
    setCulling(value) { culling = !!value; reset(); },
    get projectileLights() { return projectileLights; },
    setProjectileLights(value) { projectileLights = !!value; reset(); },
    reports,
    record(name, value) {
      if (!enabled) return;
      const sample = samples[name] ??= { count: 0, total: 0, max: 0, slow: 0 };
      sample.count++; sample.total += value; sample.max = Math.max(sample.max, value);
      if (value >= 50) sample.slow++;
    },
    frame(now, counts, visible = true, collectContext = null) {
      if (!enabled) return;
      if (!visible) { reset(); return; }
      const frameMs = previous ? now - previous : null;
      if (frameMs !== null) this.record('frameMs', frameMs);
      previous = now;
      if (!since) since = now;
      for (const [key, value] of Object.entries(counts)) this.record(key, value);
      if (collectContext && now - lastContext >= 1000) {
        const start = performance.now();
        contextSamples.push({ at: new Date().toISOString(), frameMs,
          ...collectContext() });
        lastContext = now;
        this.record('diagnosticContextMs', performance.now() - start);
      }
      if (now - since < 5000) return;
      const report = { at: new Date().toISOString(), culling, projectileLights, seconds: (now - since) / 1000,
        contextSamples,
        metrics: Object.fromEntries(Object.entries(samples).map(([key, s]) => [key, {
          mean: Number((s.total / s.count).toFixed(3)), max: Number(s.max.toFixed(3)),
          count: s.count, ...(key === 'frameMs' ? { framesOver50ms: s.slow } : {})
        }])) };
      reports.push(report);
      if (reports.length > 60) reports.shift();
      output(report); samples = {}; contextSamples = []; since = now;
    }
  };
}
