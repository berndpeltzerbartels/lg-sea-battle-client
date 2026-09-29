export function advanceSubmarineDepth(current, target, seconds, periscope, deep, surfaceSpeed) {
  const deepSpeed = Math.abs(deep - periscope) / 6;
  // Measure depth in travel seconds so crossing the boundary preserves both speeds.
  const travel = y => y >= periscope ? (y - periscope) / surfaceSpeed : (y - periscope) / deepSpeed;
  const from = travel(current);
  const to = travel(target);
  const next = from + Math.sign(to - from) * Math.min(Math.abs(to - from), Math.max(0, seconds));
  return periscope + next * (next >= 0 ? surfaceSpeed : deepSpeed);
}
