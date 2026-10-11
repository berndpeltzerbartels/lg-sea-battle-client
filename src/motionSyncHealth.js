export function createMotionSyncHealth({ now = () => performance.now(), report, warn, recovered = () => {} }) {
  let episode = null;
  let lastSample = -Infinity;
  let lastGrounding = -Infinity;
  const history = [];
  function remember(event, details) {
    const at = now();
    history.push({ at: Math.round(at), event, ...details });
    while (history.length > 24 || history[0]?.at < at - 30000) history.shift();
  }
  function finish(reason) {
    if (episode?.reported) {
      report('motion-sync-recovered', { id: episode.id, reason, durationMs: Math.round(now() - episode.start), failure: episode.report });
      recovered();
    }
    episode = null;
  }
  return {
    remember,
    grounding(details) {
      if (now() - lastGrounding < 1000) return;
      lastGrounding = now();
      remember('grounding', details);
    },
    sample(details) {
      if (now() - lastSample < 1000) return;
      lastSample = now();
      remember('position', details);
    },
    fail(message, details = {}) {
      if (!episode) episode = { start: now(), count: 0, reported: false };
      episode.count++;
      episode.message = message;
      episode.details = details;
    },
    tick() {
      if (!episode || episode.reported || now() - episode.start < 3000) return;
      episode.reported = true;
      const bytes = new Uint32Array(1);
      globalThis.crypto.getRandomValues(bytes);
      episode.id = bytes[0].toString(16).padStart(8, '0').toUpperCase();
      episode.report = {
        id: episode.id, utc: new Date().toISOString(), count: episode.count,
        durationMs: Math.round(now() - episode.start), message: episode.message,
        last: episode.details, history: history.slice()
      };
      report('motion-sync-failed', episode.report);
      warn(`${episode.message} Fehler-ID: ${episode.id}`);
    },
    success: () => finish('confirmed'),
    reset: () => finish('life-change')
  };
}
