import { createCannonSound } from './cannonSound.js';
import { createFlakSound } from './flakSound.js';
import { aircraftDoppler } from './aircraftSound.js';

export function torpedoSpatialMix(position, listener) {
  const dx = position.x - listener.x, dz = position.z - listener.z;
  const distance = Math.hypot(dx, (position.y ?? 0) - (listener.y ?? 0), dz);
  return {
    gain: listener.muted || distance >= 120 ? 0
      : .55 * (1 - distance / 120) ** 2 / (1 + distance / 25) * (listener.underwater ? 1 : .45),
    pan: distance > 1 ? (dx * Math.cos(listener.heading) - dz * Math.sin(listener.heading)) / distance : 0,
    frequency: listener.underwater ? 2500 : 1200
  };
}

export function createTorpedoSound({ context, destination, launchUrl, boatLaunchUrl, engineUrl, report }) {
  const start = createCannonSound({ context, destination, urls: boatLaunchUrl ? [launchUrl, boatLaunchUrl] : [launchUrl], report, maxVoices: 4 });
  const engine = createFlakSound({ context, destination, url: engineUrl, report, maxVoices: 4, spatialMix: torpedoSpatialMix });
  let lastUpdate = -Infinity;
  return {
    unlock: () => Promise.all([start.unlock(), engine.unlock()]),
    launch(id, position, own, vehicleType = "submarine") {
      start.shot(`launch:${id}`, position, own, { gain: .8, waterExplosion: own && vehicleType === "submarine", variant: vehicleType === "torpedo-boat" ? 1 : 0 });
    },
    update(listener, torpedoes, force = false) {
      start.update(listener, force);
      engine.update(listener, force);
      if (!force && context.currentTime - lastUpdate < .1) return;
      lastUpdate = context.currentTime;
      if (listener.muted) return;
      const distance = t => Math.hypot(t.x - listener.x, (t.y ?? 0) - (listener.y ?? 0), t.z - listener.z);
      for (const t of torpedoes.filter(t => distance(t) < 120).sort((a, b) => distance(a) - distance(b)).slice(0, 4)) {
        engine.shot(t.id, t, false, { rate: .9 * aircraftDoppler(t, listener) });
      }
    },
    state: () => ({ launch: start.state(), engine: engine.state() }),
    dispose() { start.dispose(); engine.dispose(); }
  };
}
