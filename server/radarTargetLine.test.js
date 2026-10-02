import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function drawRadarTargetLine(');
const end = source.indexOf('\nfunction ', start + 1);

test('torpedo alignment highlights a contact but not an empty firing direction', () => {
  for (const obstruction of [null, { distance: 50 }]) {
    const draw = new Function('normalizeAngle', 'clamp', 'findRadarTargetLineObstruction',
      `${source.slice(start, end)}; return drawRadarTargetLine;`)(
        a => a, (v, min, max) => Math.max(min, Math.min(max, v)), () => obstruction);
    let endpoint;
    const ctx = { save() {}, restore() {}, beginPath() {}, moveTo() {}, stroke() {},
      lineTo(x, y) { endpoint = [x, y]; }
    };
    draw(ctx, 100, 100, 100, { x: 0, z: 0 }, [], 0, 100, 1, Math.PI / 2, 'torpedo');
    assert.equal(ctx.lineWidth, obstruction ? 1.25 : 1);
    assert.ok(Math.abs(endpoint[0] - (obstruction ? 150 : 192)) < 1e-8);
    assert.ok(Math.abs(endpoint[1] - 100) < 1e-8);
    draw(ctx, 100, 100, 100, { x: 0, z: 0 }, [], 0, 100, 1, 0, 'cannon');
    assert.equal(ctx.lineWidth, 1, 'gun sight must not use torpedo hit highlighting');
  }
});
