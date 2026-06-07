export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAngle(angle) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
