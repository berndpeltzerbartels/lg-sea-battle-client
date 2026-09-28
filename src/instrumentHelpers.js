export function createZoomIdleTimer(timeoutMs = 30000) {
  let lastActivity = null;
  return {
    touch(now) { lastActivity = now; },
    expired(now) {
      if (lastActivity === null || now - lastActivity < timeoutMs) return false;
      lastActivity = null;
      return true;
    }
  };
}

// Horizontal distance only: full deflection means directly above, regardless of depth.
export function submarineEchoStrength(ships, ownId, position, radius) {
  if (!(radius > 0)) return 0;
  let nearestSquared = radius * radius;
  for (const ship of ships) {
    if (ship.id === ownId || ship.state !== 'active' || ship.vehicleType !== 'submarine'
        || !Number.isFinite(ship.x) || !Number.isFinite(ship.z)) continue;
    const distanceSquared = (ship.x - position.x) ** 2 + (ship.z - position.z) ** 2;
    if (distanceSquared < nearestSquared) nearestSquared = distanceSquared;
  }
  return Math.max(0, 1 - Math.sqrt(nearestSquared) / radius);
}
