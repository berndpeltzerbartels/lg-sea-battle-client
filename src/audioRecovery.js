// Browser audio can stop independently of the game's mute setting.
// Reuse the frame loop; at most one recovery attempt per second, and no autoplay
// attempt until an AudioContext was created by the player's first gesture.
export function createAudioRecovery({ getContext, needsRebuild = () => false, recover,
  hidden = () => document.hidden, now = () => performance.now(), report = () => {} }) {
  let nextAttempt = -Infinity, nextCheck = -Infinity;
  return {
    check(force = false) {
      const time = now();
      if (!force && time < nextCheck) return;
      nextCheck = time + 1000;
      const context = getContext();
      if (!context || hidden() || (!force && context.state === 'running' && !needsRebuild())) return;
      if (time < nextAttempt) return;
      nextAttempt = time + 1000;
      try { recover(); } catch (error) { report(error); }
    }
  };
}
