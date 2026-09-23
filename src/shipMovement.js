// Reject blocked displacement without inventing a lateral escape velocity.
// The caller checks the leading hull samples for the requested direction.
export function moveShipOnWater(position, forward, distance, worldLimit, canMove) {
  const candidate = {
    x: Math.max(-worldLimit, Math.min(worldLimit, position.x + forward.x * distance)),
    y: position.y,
    z: Math.max(-worldLimit, Math.min(worldLimit, position.z + forward.z * distance))
  };
  if (!canMove(candidate)) return false;
  position.x = candidate.x;
  position.z = candidate.z;
  return true;
}
