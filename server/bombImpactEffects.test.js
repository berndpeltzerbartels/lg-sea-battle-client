import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function renderServerBombImpacts(');
const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));

function fixture() {
  const effects = [];
  const bombs = { hits: 0, serverImpactIds: new Set() };
  const torpedoes = { hits: 0 };
  const render = new Function('bombSystem', 'torpedoSystem', 'Vector3',
    'notifyOwnWeaponImpact', 'createHitChurn', `${fn}; return renderServerBombImpacts;`)(
    bombs, torpedoes, Vector3, () => {},
    (_, position, heading, scale) => effects.push({ position, heading, scale }));
  return { render, effects, bombs };
}

test('only the hitting bomb in a salvo gets the stronger explosion', () => {
  const { render, effects } = fixture();
  render([
    { id: 'miss-1', reason: 'sea-hit', x: 1, z: 2, t: 1 },
    { id: 'hit', reason: 'ship-hit', targetShipId: 'boat', x: 3, z: 4, t: 1 },
    { id: 'miss-2', reason: 'sea-hit', x: 5, z: 6, t: 1 }
  ]);
  assert.deepEqual(effects.map(effect => effect.scale), [1, 1.8, 1]);
  assert.deepEqual(effects[1].position, new Vector3(3, .05, 4));
});

for (const targetShipId of ['submarine', 'torpedo-boat']) {
  test(`confirmed hit on ${targetShipId} is strong even after a predicted splash and without a target visual`, () => {
    const { render, effects, bombs } = fixture();
    bombs.serverImpactIds.add('visual-water:bomb-1');
    const hit = { id: 'bomb-1', reason: 'ship-hit', targetShipId, x: 4, z: 8, t: 2 };
    render([hit]);
    render([hit]);
    assert.equal(effects.length, 1);
    assert.equal(effects[0].scale, 1.8);
    render([{ ...hit, id: 'bomb-2', t: 3 }]);
    assert.equal(effects.length, 2);
    assert.equal(effects[1].scale, 1.8);
  });
}
