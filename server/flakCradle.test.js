import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';

test('flak cradle stays below the barrel without moving its elevation pivot', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('function createSternFlak('), end = source.indexOf('\nfunction ', start + 1);
  const factory = new Function('MeshBuilder', 'TransformNode', 'flakShieldVariant', `
    const playerSternFlakScale=.54, flakBarrelLength=1.62, flakBarrelCenterZ=.22, flakSightYOffsetFactor=.14;
    const getTorpedoBoatDeckY=()=>0;
    const createFlakShield=()=>{};
    const createOpenFlakTurretWall=(name,scene)=>new TransformNode(name,scene);
    ${source.slice(start, end)}
    return createSternFlak;
  `);
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    for (const variant of ['open', 'split', 'enclosed']) for (const player of [false, true]) {
      const build = factory(MeshBuilder, TransformNode, variant);
      const parent = new TransformNode(`boat-${player}`, scene);
      const gun = build(scene, {}, parent, `gun-${variant}-${player}`, {}, -3.45, player);
      const cradle = scene.getMeshByName(`gun-${variant}-${player}_flak_cradle`);
      const barrel = gun.elevationRoot.getChildren().find(node => node.name.endsWith('_flak_barrel'));
      const scale = player ? .54 : .75;
      const halfLength = barrel.getBoundingInfo().boundingBox.extendSize.y;
      assert.ok(Math.abs(barrel.position.z + halfLength - 1.03*scale) < 1e-6, 'muzzle stays fixed');
      assert.ok(Math.abs(barrel.position.z - halfLength - (variant === 'enclosed' ? 0 : -.59)*scale) < 1e-6, 'only enclosed breech is shortened');
      for (const yaw of [0, Math.PI/2, Math.PI]) for (const pitch of [0, .7, 1.5]) {
        gun.mount.rotation.y = yaw;
        gun.elevationRoot.rotation.x = -pitch;
        gun.mount.computeWorldMatrix(true);
        cradle.computeWorldMatrix(true);
        gun.elevationRoot.computeWorldMatrix(true);
        const scale = player ? .54 : .75;
        const offset = cradle.getAbsolutePosition().subtract(gun.elevationRoot.getAbsolutePosition());
        assert.ok(Math.abs(offset.x) < 1e-6 && Math.abs(offset.z) < 1e-6);
        assert.ok(Math.abs(offset.y + .07*scale) < 1e-6);
        assert.ok(cradle.getBoundingInfo().boundingBox.extendSize.y <= .101*scale);
      }
    }
  } finally { engine.dispose(); }
});
