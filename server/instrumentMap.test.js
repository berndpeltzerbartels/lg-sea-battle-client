import test from "node:test";
import assert from "node:assert/strict";
import { prepareInstrumentPaths, radarTransform } from "../src/instrumentMap.js";

class Path {
  commands = [];
  moveTo(...args) { this.commands.push(["move", ...args]); }
  lineTo(...args) { this.commands.push(["line", ...args]); }
  closePath() { this.commands.push(["close"]); }
}

test("prepared map requires all three server layers and retains separate hole rings", () => {
  assert.throws(() => prepareInstrumentPaths(null, Path));
  const ring = [{ x: 0, z: 0 }, { x: 20, z: 0 }, { x: 0, z: 20 }];
  const data = { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [ring, ring] })) };
  const paths = prepareInstrumentPaths(data, Path);
  assert.equal(paths.length, 3);
  assert.equal(paths[0].commands.filter(c => c[0] === "close").length, 2);
  data.layers[1].height = 40;
  assert.throws(() => prepareInstrumentPaths(data, Path));
});

test("radar matrix matches world projection across headings, zoom and large positions", () => {
  const origin = { x: 17842, z: -32586 }, point = { x: 17350, z: -32100 };
  for (const heading of [0, 0.5, Math.PI / 2, Math.PI, -2]) for (const scale of [0.01, 0.1, 2]) {
    const [a,b,c,d,e,f] = radarTransform(origin, 150, 160, scale, heading);
    const dx = point.x - origin.x, dz = point.z - origin.z;
    assert.ok(Math.abs(a * point.x + c * point.z + e - (150 + (dx * Math.cos(heading) - dz * Math.sin(heading)) * scale)) < 1e-9);
    assert.ok(Math.abs(b * point.x + d * point.z + f - (160 - (dx * Math.sin(heading) + dz * Math.cos(heading)) * scale)) < 1e-9);
  }
});
