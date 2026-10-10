import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { acquireProjectileVisual, releaseProjectileVisual, advanceProjectileSamples } from '../src/projectileVisualPool.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function createFlakProjectile(');
const body = source.slice(start, source.indexOf('\nfunction ', start + 1));
const create = new Function('acquireProjectileVisual', 'TransformNode', 'MeshBuilder', 'shipGunVisualScale', 'flakProjectileLifetime',
  `${body}; return createFlakProjectile;`)(acquireProjectileVisual, TransformNode, MeshBuilder, 3, 5);

test('real projectile geometry is reused and resets after each shot without limiting active shots', () => {
  const engine = new NullEngine(); const scene = new Scene(engine);
  try {
    const system = { scene, root: new TransformNode('system', scene), materials: {}, nextId: 0, active: [] };
    const fire = (x, trailSegments = 1) => create(system, new Vector3(x, 2, 3), new Vector3(0, 0, 20), Vector3.Forward(), { trailSegments });
    const first = fire(0);
    first.core.visibility = .2;
    first.core.scaling.setAll(4);
    releaseProjectileVisual(first.pooledVisual);
    releaseProjectileVisual(first.pooledVisual);
    assert.equal(first.root.isEnabled(), false);
    assert.equal(first.trail[0].isEnabled(), false);
    const second = fire(10);
    assert.equal(first.root, second.root);
    assert.equal(second.core.visibility, 1);
    assert.equal(second.core.scaling.x, 1);
    assert.equal(second.root.position.x, 10);
    assert.equal(second.trail[0].position.x, 10);
    assert.equal(second.age, 0);
    assert.notEqual(first, second);
    const cannon = fire(20, 4);
    assert.notEqual(cannon.root, second.root);
    const shots = Array.from({length: 200}, (_, i) => fire(i));
    assert.equal(new Set(shots.map(s => s.root)).size, 200);
    for (const shot of [second, ...shots]) releaseProjectileVisual(shot.pooledVisual);
    assert.equal(scene.meshes.length, 128 * 2 + 5);
  } finally { scene.dispose(); engine.dispose(); }
});

test('fixed samples preserve the previous trail sequence and vector identities', () => {
  const samples = [new Vector3(1, 2, 3), new Vector3(4, 5, 6)];
  const refs = [...samples];
  advanceProjectileSamples(samples, new Vector3(7, 8, 9));
  assert.deepEqual(samples.map(p => p.asArray()), [[7, 8, 9], [1, 2, 3]]);
  assert.equal(samples[0], refs[0]);
  assert.equal(samples[1], refs[1]);
});
