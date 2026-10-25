// Sound events are independent of visual effects and remote-model visibility.
export function createExplosionEvents(emit) {
  let session;
  const seen = new Set(), bursts = new Map();
  function variant(id) {
    let hash = 0;
    for (const c of String(id)) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    return hash % 3;
  }
  return {
    consume(snapshot, ownShipId) {
      const nextSession = `${snapshot.instanceId}:${snapshot.sessionId}`;
      if (nextSession !== session) { seen.clear(); bursts.clear(); session = nextSession; }
      function play(family, hit, kind, target = hit.targetShipId) {
        if (!hit?.id || !Number.isFinite(hit.x) || !Number.isFinite(hit.z)) return;
        const key = `${family}:${hit.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (seen.size > 2048) seen.delete(seen.values().next().value);
        if (Number.isFinite(hit.t) && snapshot.t - hit.t > 2) return;
        const own = !!ownShipId && (target === ownShipId || hit.targetShipIds?.includes(ownShipId));
        const v = variant(hit.id);
        let options;
        if (kind === 'underwater') {
          options = { variant: 8, rate: 1, gain: 1, underwaterOnly: true };
        } else if (kind === 'collision') {
          options = { variant: 9, rate: 1, gain: .9 };
        } else if (kind === 'flak' || kind === 'flak-water') {
          // Automatic weapons can hit on every projectile; coalesce short bursts.
          const group = `${kind}:${target ?? hit.shipId}`;
          const at = hit.t ?? snapshot.t;
          if (at - (bursts.get(group) ?? -Infinity) < .15) return;
          bursts.set(group, at);
          if (bursts.size > 256) bursts.delete(bursts.keys().next().value);
          options = { variant: (kind === 'flak-water' ? 3 : 0) + v, rate: 1.1, gain: kind === 'flak-water' ? .25 : .5 };
        } else if (kind === 'water') {
          options = { variant: 3 + v, rate: .85, gain: .7 };
        } else if (kind === 'cannon') {
          options = { variant: 6, rate: .9, gain: 1 };
        } else {
          options = { variant: v % 2 ? 7 : 6, rate: .72, gain: 1.1 };
        }
        emit(`${session}:${key}`, { x: hit.x, z: hit.z }, own, options);
      }
      // Hit reports carry the target identity; process them before impact duplicates.
      for (const hit of snapshot.flakHits ?? []) play('projectile', hit, String(hit.id).startsWith('cannon') ? 'cannon' : 'flak');
      for (const hit of snapshot.flakImpacts ?? []) {
        if (hit.reason === 'expired') continue;
        const cannon = String(hit.id).startsWith('cannon');
        const water = !['land-hit', 'ship-hit', 'ship-critical-hit'].includes(hit.reason);
        play('projectile', hit, water ? (cannon ? 'water' : 'flak-water') : (cannon ? 'cannon' : 'flak'));
      }
      for (const hit of snapshot.torpedoImpacts ?? []) if (hit.reason !== 'expired') {
        const target = snapshot.ships?.find(ship => ship.id === hit.targetShipId);
        const underwater = hit.y < -1.2 || target?.vehicleType === 'submarine' && target.y < -1.2;
        play('torpedo', hit, underwater ? 'underwater' : 'heavy');
      }
      for (const hit of snapshot.ramHits ?? []) play('ram', hit, 'collision', hit.shipId === ownShipId ? ownShipId : hit.targetShipId);
      for (const hit of snapshot.bombImpacts ?? []) play('bomb', hit, hit.reason === 'sea-hit' ? 'water' : 'heavy');
      for (const charge of snapshot.depthCharges ?? []) if (charge.exploded) {
        play('depth-charge', { ...charge, t: charge.explodesAt }, 'heavy');
      }
    }
  };
}
