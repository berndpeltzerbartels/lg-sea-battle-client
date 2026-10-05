import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

test('bow rim does not duplicate the raised hull outer wall', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const names = ['torpedoBoatHullSections', 'getTorpedoBoatBowBulwarkLift', 'createBoatBowBulwarkCapMesh'];
  const functions = names.map(name => {
    const start = source.indexOf(`function ${name}(`);
    return source.slice(start, source.indexOf('\nfunction ', start + 1));
  }).join('\n');
  const faces = [];
  const build = new Function('Vector3', 'pushOrientedQuad', 'createMeshFromData', `
    const torpedoBoatBowBulwarkHeight=.0475, torpedoBoatBowBulwarkRimWidth=.019;
    ${functions}
    return createBoatBowBulwarkCapMesh('bow', null);
  `);
  build(Vector3, (indices, positions, ...args) => {
    faces.push(args.slice(0,4));
  }, () => null);
  assert.ok(faces.length > 0);
  assert.ok(faces.some(face => face[0] % 4 === 0 && face[1] === face[0]+4), 'top rim remains');
  assert.ok(faces.some(face => face[0] % 4 === 1 && face[1] === face[0]+4), 'inner wall remains');
  assert.ok(!faces.some(face => face[0] % 4 === 0 && face[1] === face[0]+3 && face[2] === face[0]+7), 'no overlapping outer wall');
});
