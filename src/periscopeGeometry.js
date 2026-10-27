// Model units; keep the matching server SubmarinePeriscopeGeometry in sync.
export const periscopeMastBase = .66 + .64 * .9 - .012;
export const periscopeMastTop = periscopeMastBase + .986 * .9;
export const periscopeExtraLift = (periscopeMastTop - 1.86) * .2;
export function periscopeLiftAtDepth(depthOffset) {
  const depth = Math.abs(depthOffset ?? 0);
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };
  return periscopeExtraLift * smooth(1.2, 1.6, depth) * (1-smooth(1.6, 1.9, depth));
}

// Quiet at Slow; a small trace at 1/3, growing continuously towards FULL.
export function periscopeFoamStrength(speed, slowSpeed, fullSpeed) {
  const absolute=Math.abs(Number.isFinite(speed) ? speed : 0);
  if(absolute<=slowSpeed) return 0;
  const t=Math.max(0,Math.min(1,(absolute-slowSpeed)/(fullSpeed-slowSpeed)));
  return .08+.92*t*t*(3-2*t);
}
