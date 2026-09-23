// Reject blocked displacement without inventing a lateral escape velocity.
// The caller checks the leading hull samples for the requested direction.
export function moveShipOnWater(position, forward, distance, canMove) {
  const candidate = {
    x: position.x + forward.x * distance,
    y: position.y,
    z: position.z + forward.z * distance
  };
  if (!canMove(candidate)) return false;
  position.x = candidate.x;
  position.z = candidate.z;
  return true;
}
