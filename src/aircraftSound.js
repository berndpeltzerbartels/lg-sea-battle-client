import { createFlakSound, flakSpatialMix } from './flakSound.js';

export function aircraftDoppler(source, listener) {
  const dx = source.x - listener.x, dy = (source.y ?? 0) - (listener.y ?? 0), dz = source.z - listener.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance < 1) return 1;
  const closing = ((listener.vx ?? 0) - (source.vx ?? 0)) * dx / distance
    + ((listener.vy ?? 0) - (source.vy ?? 0)) * dy / distance
    + ((listener.vz ?? 0) - (source.vz ?? 0)) * dz / distance;
  // Bounded game-world Doppler: no singularity for the game's fast aircraft.
  return Math.max(.7, Math.min(1.35, 90 / (90 - Math.max(-40, Math.min(40, closing)))));
}

export function createAircraftSound(options) {
  const spatialMix = (position, listener) => {
    const dx = position.x - listener.x, dz = position.z - listener.z;
    const distance = Math.hypot(dx, (position.y ?? 0) - (listener.y ?? 0), dz);
    const horizontal = Math.hypot(dx, dz);
    const ratio = horizontal > 0 ? distance / horizontal : 0;
    const mix = flakSpatialMix({ x: listener.x + (horizontal ? dx * ratio : distance),
      z: listener.z + dz * ratio }, listener);
    mix.pan = distance > 1 ? (dx * Math.cos(listener.heading) - dz * Math.sin(listener.heading)) / distance : 0;
    return mix;
  };
  const audio = createFlakSound({ ...options, maxVoices: 4, spatialMix });
  let lastUpdate = -Infinity;
  return {
    unlock: () => audio.unlock(),
    state: () => audio.state(),
    dispose: () => audio.dispose(),
    update(listener, aircraft, force = false) {
      audio.update(listener, force);
      if (!force && options.context.currentTime - lastUpdate < .1) return;
      lastUpdate = options.context.currentTime;
      if (listener.muted) return;
      const nearby = aircraft.filter(p => p.active !== false)
        .sort((a, b) => Number(!!b.own) - Number(!!a.own)
          || Math.hypot(a.x - listener.x, a.z - listener.z) - Math.hypot(b.x - listener.x, b.z - listener.z))
        .slice(0, 4);
      for (const plane of nearby) {
        const base = .70 + .08 * Math.min(1, Math.abs(plane.speed ?? 0) / 29.25);
        audio.shot(plane.id, plane, plane.own, {
          rate: base * (plane.own ? 1 : aircraftDoppler(plane, listener)), gain: plane.own ? .65 : 3.5
        });
      }
    }
  };
}
