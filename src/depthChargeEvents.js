export function createDepthChargeEvents(onRelease, onExplosion) {
  let instance;
  const seen = new Map();
  return {
    consume(session, charges, now) {
      if (session !== instance) { seen.clear(); instance = session; }
      for (const charge of charges) {
        let state = seen.get(charge.id);
        if (!state) {
          state = { exploded: false, expires: charge.explodesAt + 4 };
          seen.set(charge.id, state);
          if (now - charge.releasedAt < 1) onRelease(charge);
        }
        if (charge.exploded && !state.exploded) {
          state.exploded = true;
          if (now - charge.explodesAt < 2) onExplosion(charge);
        }
      }
      for (const [id, state] of seen) if (state.expires < now) seen.delete(id);
    }
  };
}
