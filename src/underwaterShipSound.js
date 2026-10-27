import { createFlakSound } from './flakSound.js';
import { createCannonSound } from './cannonSound.js';

const PROPELLER_HEARING_RANGE = 600;

// Radial relative velocity, including reverse motion and the listener's own course.
// A modest, bounded game-world Doppler shift keeps the shaft pulses recognisable.
export function propellerDoppler(ship, listener) {
  const dx = ship.x - listener.x, dy = (ship.y ?? 0) - (listener.y ?? 0), dz = ship.z - listener.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance < 1) return 1;
  const vx = Math.sin(ship.heading ?? 0) * ship.speed;
  const vz = Math.cos(ship.heading ?? 0) * ship.speed;
  const closing = (((listener.vx ?? 0) - vx) * dx + ((listener.vz ?? 0) - vz) * dz
    + (listener.vy ?? 0) * dy) / distance;
  return Math.max(.85, Math.min(1.18, 140 / (140 - Math.max(-30, Math.min(30, closing)))));
}

export function propellerSpatialMix(position, listener) {
  const dx = position.x - listener.x, dz = position.z - listener.z;
  const distance = Math.hypot(dx, (position.y ?? 0) - (listener.y ?? 0), dz);
  return {
    gain: !listener.underwater || !listener.deepSubmerged || listener.muted || distance >= PROPELLER_HEARING_RANGE ? 0
      : .8 * (1 - distance / PROPELLER_HEARING_RANGE) ** 2 / (1 + distance / 180),
    pan: distance > 1 ? Math.max(-1, Math.min(1,
      (dx * Math.cos(listener.heading) - dz * Math.sin(listener.heading)) / distance)) : 0,
    frequency: listener.deepSubmerged ? 950 : 1600
  };
}

// Echolot sound has its own short range; do not use the cannon's long-distance curve.
export function sonarSpatialMix(position, listener) {
  const dx = position.x - listener.x, dz = position.z - listener.z;
  const distance = Math.hypot(dx, (position.y ?? 0) - (listener.y ?? 0), dz);
  const range = 141.84;
  return {
    gain: !listener.underwater || !listener.deepSubmerged || listener.muted || distance >= range ? 0
      : .7 * (1 - distance / range) ** 2 / (1 + distance / 45),
    pan: distance > 1 ? Math.max(-1, Math.min(1,
      (dx * Math.cos(listener.heading) - dz * Math.sin(listener.heading)) / distance)) : 0,
    frequency: 1800
  };
}

// Supplied propeller recording for other ships, independent of fleet colour or visual visibility.
// Four looped sources at most; reuse the existing spatial audio and output limiter.
export function createUnderwaterShipSound({ context, destination, propellerUrl, sonarUrl, report }) {
  const screws = createFlakSound({ context, destination, url: propellerUrl, report,
    maxVoices: 4, spatialMix: propellerSpatialMix, sustainSeconds: .4, gainSmoothing: .12 });
  const sonar = createCannonSound({ context, destination, url: sonarUrl, report, maxVoices: 1, spatialMix: sonarSpatialMix });
  let lastUpdate = -Infinity, nextPing = 0, pingSerial = 0;
  return {
    unlock: () => Promise.all([screws.unlock(), sonar.unlock()]),
    update(listener, ships, force = false, ownShipId = null) {
      screws.update(listener, force);
      // A hydrophone ping retains its recognisable tone at depth.
      sonar.update(listener, force);
      const now = context.currentTime;
      if (!force && now - lastUpdate < .2) return;
      lastUpdate = now;
      if (!listener.underwater || !listener.deepSubmerged || listener.muted || context.state !== 'running') {
        nextPing = now + 2;
        return;
      }
      void screws.unlock();
      void sonar.unlock();
      const distance = ship => Math.hypot(ship.x - listener.x, (ship.y ?? 0) - (listener.y ?? 0), ship.z - listener.z);
      const nearby = [...ships].filter(ship => ship.id !== ownShipId && ship.state === 'active' && ship.vehicleType !== 'scout-plane'
        && distance(ship) < PROPELLER_HEARING_RANGE).sort((a, b) => distance(a) - distance(b));
      for (const ship of nearby.filter(ship => Math.abs(ship.speed) > .35).slice(0, 4)) {
        const power = Math.min(1, Math.abs(ship.speed) / (ship.vehicleType === 'submarine' ? 9 : 17));
        screws.shot(ship.id, ship, false, { rate: (.7 + .3 * power) * propellerDoppler(ship, listener), gain: .2 + .8 * Math.sqrt(power) });
      }
      // Only nearby torpedo boats have the existing six-ship-length submarine echo instrument.
      const searchingBoat = nearby.find(ship => ship.vehicleType === 'torpedo-boat' && distance(ship) <= 141.84);
      if (searchingBoat && now >= nextPing) {
        sonar.shot(`hydrophone-ping-${pingSerial++}`, searchingBoat, false,
          { underwaterOnly: true, gain: .35, lowpassHz: 1800 });
        nextPing = now + 8;
      }
    },
    state: () => ({ propellers: screws.state(), sonar: sonar.state() }),
    dispose() { screws.dispose(); sonar.dispose(); }
  };
}
