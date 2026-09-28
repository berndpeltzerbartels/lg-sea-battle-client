import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function applyServerShipSnapshot(');
const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));

for (const depth of [-5.58, -9.63]) {
  for (const weapon of ['cannon', 'flak', 'none']) {
    test(`sinking submarine preserves server depth ${depth}, weapon=${weapon}`, () => {
      let enabled = true;
      const motion = { id: 'sub', vehicleType: 'submarine', state: 'active',
        root: { position: new Vector3(0, -.78, 0), setEnabled: value => { enabled = value; } },
        serverPosition: Vector3.Zero(), heading: 0 };
      const hit = { id: `${weapon}-1` };
      const begin = state => target => {
        target.sinkStartY = target.root.position.y;
        target.state = state;
      };
      const apply = new Function('isScoutPlaneMotion', 'remoteVehicleY', 'getShipDepthState',
        'getRemoteSubmarineDepthOffset', 'pendingCriticalFlakShipHitsByTarget', 'pendingCannonShipHitsByTarget',
        'flakSystem', 'time', 'beginEnemyShipCriticalHit', 'beginEnemyCannonShipHit', 'beginEnemySinking',
        'getStableSinkSide', `${fn}; return applyServerShipSnapshot;`)(() => false, ship => ship.y,
        ship => ship.depthState, ship => (ship.y + .78) / 3,
        new Map(weapon === 'flak' ? [['sub', hit]] : []), new Map(weapon === 'cannon' ? [['sub', hit]] : []),
        { hitEffectIds: new Set() }, 0, begin('ship-critical-hit'), begin('ship-cannon-hit'), begin('sinking'), () => 1);
      const snapshot = { state: 'sunk', x: 0, z: 0, y: depth, heading: 0, depthState: 'periscope' };
      apply(motion, snapshot);
      assert.equal(motion.sinkStartY, depth);
      assert.equal(motion.root.position.y, depth);
      assert.equal(enabled, true);
      apply(motion, snapshot);
      assert.equal(motion.sinkStartY, depth);
      motion.state = 'sunk';
      enabled = false;
      apply(motion, snapshot);
      assert.equal(enabled, false, 'A finished wreck must not be shown again by another sunk snapshot');
    });
  }
}
