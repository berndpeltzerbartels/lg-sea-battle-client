// Visual-only deaths never participate in fleet movement, radar, weapons or AI.
export function createWreckVisuals({ create, update, dispose }) {
  const motions = new Map(), seen = new Map();
  let session;
  function clear() {
    for (const motion of motions.values()) dispose(motion);
    motions.clear(); seen.clear();
  }
  return {
    motions,
    sync(snapshot, controller) {
      const next = `${snapshot.instanceId}:${snapshot.sessionId}`;
      if (session !== next) { clear(); session = next; }
      for (const [id, until] of seen) if (snapshot.t >= until) seen.delete(id);
      for (const wreck of snapshot.wrecks ?? []) {
        const age = Math.max(0, snapshot.t - wreck.sunkAt);
        if (seen.has(wreck.id) || age >= 35) continue;
        seen.set(wreck.id, wreck.sunkAt + 35);
        if (wreck.ship.controlledBy === controller) continue;
        const motion = create(wreck, age);
        if (motion) motions.set(wreck.id, motion);
        if (motions.size > 256) {
          const [id, oldest] = motions.entries().next().value;
          dispose(oldest); motions.delete(id);
        }
        if (seen.size > 512) seen.delete(seen.keys().next().value);
      }
    },
    tick(dt, time) {
      for (const [id, motion] of motions) {
        update(motion, dt, time);
        if (motion.state === 'sunk') { dispose(motion); motions.delete(id); }
      }
    },
    target(hit) {
      return [...motions.values()].find(motion => motion.originalShipId === hit.targetShipId
        && Math.abs(motion.sunkAt - hit.t) < .2);
    },
    clear
  };
}
