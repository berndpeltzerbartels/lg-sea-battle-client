const cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);

export const signedArea = points => points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length];
  return sum + p.x * q.z - p.z * q.x;
}, 0) / 2;

// All inserted vertices remain on the source terrain plane.
export function clip(polygon, distance, positive = true) {
  const output = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = distance(a) * (positive ? 1 : -1), db = distance(b) * (positive ? 1 : -1);
    if (da >= 0) output.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      output.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, h: a.h + (b.h - a.h) * t });
    }
  }
  return output.filter((p, i) => {
    const previous = output[(i + output.length - 1) % output.length];
    return Math.hypot(p.x - previous.x, p.z - previous.z) > 1e-9;
  });
}

export function partition(polygon, cutter) {
  if (["x", "z"].some(axis => Math.max(...polygon.map(p => p[axis])) < Math.min(...cutter.map(p => p[axis]))
    || Math.max(...cutter.map(p => p[axis])) < Math.min(...polygon.map(p => p[axis])))) return { inside: [], outside: [polygon] };
  let overlap = polygon;
  const sign = Math.sign(signedArea(cutter));
  for (let i = 0; i < cutter.length && overlap.length >= 3; i++) {
    overlap = clip(overlap, p => cross(cutter[i], cutter[(i + 1) % cutter.length], p) * sign);
  }
  if (overlap.length < 3 || Math.abs(signedArea(overlap)) < 1e-8) return { inside: [], outside: [polygon] };
  let inside = polygon;
  const outside = [];
  for (let i = 0; i < cutter.length && inside.length >= 3; i++) {
    const a = cutter[i], b = cutter[(i + 1) % cutter.length];
    const distance = p => cross(a, b, p) * sign;
    const part = clip(inside, distance, false);
    if (part.length >= 3 && Math.abs(signedArea(part)) > 1e-8) outside.push(part);
    inside = clip(inside, distance);
  }
  return { inside: overlap, outside };
}

export function subtract(polygon, cutter) {
  return partition(polygon, cutter).outside;
}
