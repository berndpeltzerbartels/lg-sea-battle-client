// Fixed pool of water-anchored foam marks. No particles, timers or growing history.
export function createSternFoamState(scale, capacity = 144) {
  const patches = Array.from({ length: capacity }, () => ({ born: -Infinity }));
  let now = 0, cursor = 0, serial = 0, lastX = NaN, lastZ = NaN, distanceLeft = 0;
  const spacing = scale * .5;
  function reset() {
    for (const patch of patches) patch.born = -Infinity;
    lastX = lastZ = NaN;
    distanceLeft = 0;
  }
  function emit(x, z, heading, strength) {
    const sin = Math.sin(heading), cos = Math.cos(heading);
    for (const lane of [-1, 0, 1]) {
      const p = patches[cursor]; cursor = (cursor + 1) % capacity;
      const variation = ((serial++ * 37) % 101) / 100;
      const localX = lane * .64 * scale + (variation - .5) * .12 * scale;
      const localZ = (-4.06 - variation * .12) * scale;
      p.x = x + cos * localX + sin * localZ;
      p.z = z - sin * localX + cos * localZ;
      p.heading = heading + lane * .12;
      p.born = now;
      p.life = 2.2 + strength * 3.2 + variation * .4;
      p.width = scale * (lane === 0 ? .31 : .21) * (.5 + strength * .5);
      p.length = scale * (.48 + variation * .22);
      p.strength = strength;
      p.seed = variation;
      p.lane = lane;
    }
  }
  function update(position, heading, speed, strength, dt) {
    now += Math.max(0, dt);
    if (!Number.isFinite(lastX)) { lastX = position.x; lastZ = position.z; }
    const dx = position.x - lastX, dz = position.z - lastZ;
    const distance = Math.hypot(dx, dz);
    if (distance > scale * 30) { reset(); lastX = position.x; lastZ = position.z; return; }
    if (speed > .3 && strength > .04 && distance > 0) {
      // Keep deposition continuous through turns; never move old marks with the ship.
      let offset = spacing - distanceLeft;
      let count = 0;
      while (offset <= distance && count++ < 8) {
        const t = offset / distance;
        emit(lastX + dx * t, lastZ + dz * t, heading, strength);
        offset += spacing;
      }
      distanceLeft = (distanceLeft + distance) % spacing;
    } else distanceLeft = 0;
    lastX = position.x; lastZ = position.z;
  }
  return { patches, update, reset, get now() { return now; } };
}
