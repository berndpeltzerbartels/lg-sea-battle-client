import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const names = ['getCoastRadiusFactor', 'getNameSeed', 'clamp', 'smoothstep', 'getAngularDistance', 'getLandZone',
  'getZoneShapeDistance', 'getZoneBlockDistance', 'getZoneBoundaryDistance', 'isSteepRockZone',
  'isInLandWater', 'isInLocalLandWater', 'isInWaterway', 'isInLake', 'distanceToSegment2D', 'getWaterSafety'];
const functions = names.map(name => {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}).join('\n');
const { radius, zone } = new Function(`${functions};return {radius:getCoastRadiusFactor,zone:getLandZone}`)();
const safety = new Function(`${functions};return getWaterSafety`)();

test('both reported October 21 correction loops are blocked locally before sending motion', () => {
  const cases = [
    [{ x: -215.50385549297624, z: 21.86715346294695, h: -.658 },
      { name: 'western_coast', x: -126, z: 58, rx: 88, rz: 76, coastRoughness: .22 }],
    [{ x: 563.2729191173329, z: -786.8845655181863, h: 1.717 },
      { name: 'mist_gate_north', x: 640, z: -850, rx: 96, rz: 62, coastRoughness: .24 }]
  ];
  for (const [p, land] of cases) {
    const points = [[4.9, 0], [3.2, -.62], [3.2, .62], [1, -.74], [1, .74], [0, 0]];
    assert.ok(points.some(([f, r]) => safety({
      x: p.x + Math.sin(p.h) * f + Math.cos(p.h) * r,
      z: p.z + Math.cos(p.h) * f - Math.sin(p.h) * r
    }, [zone({ ...land, kind: 'coastline' })]).isBlocked), land.name);
  }
});

test('rendered and navigable coastline use the server harmonic amplitudes, including defaults', () => {
  for (const name of ['western_coast', 'mist_gate_north', 'test']) {
    let seed = 0;
    for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
    seed *= .013;
    for (const roughness of [undefined, .09, .16, .24]) {
      for (let i = 0; i < 360; i++) {
        const a = i * Math.PI / 180;
        const expected = Math.max(.56, Math.min(1.42, 1 + (
          Math.sin(a * 2 + seed) * .62 + Math.sin(a * 4 - seed * .7) * .42
          + Math.sin(a * 7 + seed * 1.4) * .2) * (roughness ?? .16)));
        const land = { name, coastRoughness: roughness };
        assert.ok(Math.abs(radius(a, land) - expected) < 1e-12);
        assert.ok(Math.abs(radius(a, zone(land)) - expected) < 1e-12);
      }
    }
  }
});
