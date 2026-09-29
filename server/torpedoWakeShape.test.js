import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const extract = name => {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
};
test('torpedo trail uses five low-poly irregular patches without a widening triangular outline', () => {
  const patchCalls = [];
  const mesh = () => ({ position: Vector3.Zero(), rotation: {}, scaling: Vector3.One(), setEnabled(value) { this.enabled = value; } });
  const create = new Function('MeshBuilder', 'createJaggedSurfacePatch', 'torpedoBoatVisualScale',
    'torpedoBodyHintWidthScale', 'torpedoThicknessScale', 'torpedoNoseForwardOffset', 'torpedoTailBackwardOffset',
    'torpedoWakeVisualScale', 'torpedoSternWakeSizeScale', 'torpedoSternWakeLengthScale',
    `${extract('createTorpedoWake')}; return createTorpedoWake;`)(
    { CreateBox: mesh, CreateCylinder: mesh }, (...args) => { patchCalls.push(args); return mesh(); },
    2.5, 1, 1, 1, 1, 1.875, .65, .6);
  const wake = create({}, { foam: {}, torpedoWakeBody: {} }, 'test');
  assert.equal(wake.length, 10);
  assert.equal(patchCalls.length, 5);
  assert.ok(patchCalls.every(call => call[5] === 8));
  assert.ok(patchCalls[3][2] < patchCalls[2][2]);
  assert.ok(wake.every(part => !part.enabled));
  const geometry = new Function('pseudoRandom', 'createMeshFromData',
    `${extract('createJaggedSurfacePatch')}; return createJaggedSurfacePatch;`)(
    (seed, salt) => Math.abs(Math.sin(seed * salt)),
    (name, scene, positions, indices) => ({ positions, indices }));
  const patch = geometry('test', {}, 1, 2, 71, 8);
  assert.equal(patch.indices.length / 3, 8);
  assert.equal(patch.positions.length / 3, 9);
  assert.ok(patch.positions.every(Number.isFinite));
});
