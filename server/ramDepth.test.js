import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function getPlayerRamHit(');
const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));

function ram(playerDepth, targetType, targetDepth) {
  let hullChecks = 0;
  const hit = new Function('scoutPlaneMode', 'nextRamHitTime', 'playerTeamId', 'submarineMode',
    'getPlayerEffectiveSubmarineDepthState', 'submarineDepthStates', 'getShipVehicleType', 'getShipDepthState',
    'getForwardVector', 'getRightVector', 'isScoutPlaneMotion', 'pointHitsEnemyHull', 'getEnemyHitLocalPoint',
    `${fn}; return getPlayerRamHit;`)(false, 0, 'light', playerDepth !== null,
    () => playerDepth, { submerged: 'submerged' }, s => s.vehicleType, s => s.depthState,
    () => new Vector3(0, 0, 1), () => new Vector3(1, 0, 0), () => false,
    () => { hullChecks++; return true; }, () => ({ right: 0 }));
  const result = hit(Vector3.Zero(), 0, 5, [{ teamId: 'dark', vehicleType: targetType,
    depthState: targetDepth, heading: 0, root: { position: Vector3.Zero() } }], 1);
  return { result, hullChecks };
}

test('surface boat does not ram or shake over deeply submerged submarine', () => {
  const { result, hullChecks } = ram(null, 'submarine', 'submerged');
  assert.equal(result, null);
  assert.equal(hullChecks, 0);
});
test('deep submarine does not ram a surface boat from below', () => {
  assert.equal(ram('submerged', 'torpedo-boat', 'surface').result, null);
});
test('surface and periscope collisions remain enabled', () => {
  assert.ok(ram(null, 'submarine', 'periscope').result);
  assert.ok(ram(null, 'torpedo-boat', 'surface').result);
  assert.ok(ram('submerged', 'submarine', 'submerged').result);
});
