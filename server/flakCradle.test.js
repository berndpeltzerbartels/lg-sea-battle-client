import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';

test('flak cradle shares the barrel elevation pivot for player and remote boats', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('function createSternFlak('), end = source.indexOf('\nfunction ', start + 1);
  const build = new Function('MeshBuilder', 'TransformNode', `
    const playerSternFlakScale=.54, flakBarrelLength=1.62, flakBarrelCenterZ=.22, flakSightYOffsetFactor=.14;
    const flakShieldVariant='open', getTorpedoBoatDeckY=()=>0;
    const createOpenFlakTurretWall=(name,scene)=>new TransformNode(name,scene);
    ${source.slice(start, end)}
    return createSternFlak;
  `)(MeshBuilder, TransformNode);
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    for (const player of [false, true]) {
      const parent = new TransformNode(`boat-${player}`, scene);
      const gun = build(scene, {}, parent, `gun-${player}`, {}, -3.45, player);
      const cradle = scene.getMeshByName(`gun-${player}_flak_cradle`);
      for (const yaw of [0, Math.PI/2, Math.PI]) for (const pitch of [0, .7, 1.5]) {
        gun.mount.rotation.y = yaw;
        gun.elevationRoot.rotation.x = -pitch;
        gun.mount.computeWorldMatrix(true);
        cradle.computeWorldMatrix(true);
        gun.elevationRoot.computeWorldMatrix(true);
        assert.ok(cradle.getAbsolutePosition().subtract(gun.elevationRoot.getAbsolutePosition()).length() < 1e-6);
      }
    }
  } finally { engine.dispose(); }
});
