import test from 'node:test';
import assert from 'node:assert/strict';
import { drawRadarWeaponLines } from '../src/radarWeaponLines.js';

function draw(radarHeading, shipHeading, cannonYaw, flakYaw) {
  const lines = [], labels = [], patterns = [], styles = [];
  const ctx = { save() {}, restore() {}, beginPath() {}, moveTo() {},
    stroke() { styles.push([this.strokeStyle, this.lineWidth, this.lineCap]); },
    lineTo(x, y) { lines.push([x, y]); },
    fillText(label) { labels.push(label); },
    setLineDash(pattern) { patterns.push(pattern); }
  };
  drawRadarWeaponLines(ctx, 100, 100, 100, radarHeading, shipHeading, cannonYaw, flakYaw);
  return { lines, labels, patterns, styles };
}

test('bridge radar uses identical subtle unlabelled solid weapon lines', () => {
  const result = draw(0, 0, 0, Math.PI);
  assert.deepEqual(result.labels, []);
  assert.deepEqual(result.patterns, [[], []]);
  assert.deepEqual(result.styles, [
    ['rgba(155, 229, 223, 0.42)', 1, 'round'],
    ['rgba(155, 229, 223, 0.42)', 1, 'round']
  ]);
  assert.deepEqual(result.lines[0], [100, 14]);
  assert.ok(Math.abs(result.lines[1][0] - 100) < 1e-8);
  assert.equal(result.lines[1][1], 186);
});

test('head-up radar removes ship heading and reflects updated crew aim', () => {
  const result = draw(1.2, 1.2, Math.PI / 2, -Math.PI / 2);
  assert.ok(Math.abs(result.lines[0][0] - 186) < 1e-8);
  assert.ok(Math.abs(result.lines[1][0] - 14) < 1e-8);
  assert.ok(result.lines.every(([, y]) => Math.abs(y - 100) < 1e-8));
  assert.equal(draw(0, 0, NaN, Math.PI).lines.length, 1);
});
