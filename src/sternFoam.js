import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { createSternFoamState } from './sternFoamState.js';

// One draw call per visible boat; flat polygon opacity matches the coarse game geometry.
export function createSternFoam(scene, name, scale, options = {}) {
  const state = options.state ?? createSternFoamState(scale);
  const mesh = new Mesh(name + '_deposited_stern_foam', scene);
  mesh.isPickable = false;
  mesh.hasVertexAlpha = true;
  mesh.useVertexColors = true;
  mesh.receiveShadows = false;
  let material = scene.getMaterialByName('deposited_stern_foam_material');
  if (!material) {
    material = new StandardMaterial('deposited_stern_foam_material', scene);
    material.disableLighting = true;
    material.emissiveColor = new Color3(.94, .98, 1);
    material.diffuseColor = new Color3(1, 1, 1);
    material.backFaceCulling = false;
    material.transparencyMode = 2;
    material.disableDepthWrite = true;
  }
  mesh.material = material;
  const corners = 6;
  const verticesPerPatch = corners + 1;
  const positions = new Float32Array(state.patches.length * verticesPerPatch * 3);
  const colors = new Float32Array(state.patches.length * verticesPerPatch * 4);
  const normals = new Float32Array(positions.length);
  const indices = [];
  for (let i = 0; i < state.patches.length; i++) {
    const base = i * verticesPerPatch;
    for (let k = 0; k < verticesPerPatch; k++) {
      normals[(base + k) * 3 + 1] = 1;
      colors.set([1, 1, 1, 0], (base + k) * 4);
    }
    for (let k = 0; k < corners; k++) indices.push(base, base + 1 + k, base + 1 + (k + 1) % corners);
  }
  const data = new VertexData();
  Object.assign(data, { positions, colors, normals, indices });
  data.applyToMesh(mesh, true);
  mesh.setEnabled(false);
  let untilUpdate = 0, active = 0;
  function update(position, heading, speed, strength, dt) {
    state.update(position, heading, speed, strength, dt);
    untilUpdate -= dt;
    if (untilUpdate > 0) return;
    untilUpdate = 1 / 20;
    active = 0;
    const anchor = state.patches.find(p => state.now - p.born >= 0 && state.now - p.born < p.life);
    state.patches.forEach((p, i) => {
      const age = state.now - p.born;
      const alive = age >= 0 && age < p.life;
      const base = i * verticesPerPatch;
      // Keep only the fresh periscope churn bright; the outer trail still ends at the same age.
      const fadeAge = Math.max(0, age - (p.coreSeconds ?? 0));
      const fadeLife = p.life - (p.coreSeconds ?? 0);
      const opacity = alive ? Math.min(1, age / .1) * Math.pow(1 - fadeAge / fadeLife, p.head ? .12 : 1.25) * (p.opacity ?? (.6 + p.strength * .4)) : 0;
      for (let k = 0; k < verticesPerPatch; k++) colors[(base + k) * 4 + 3] = opacity;
      if (!alive) {
        // Collapse expired geometry into the live trail so its bounds stay local.
        if (anchor) for (let k = 0; k < verticesPerPatch; k++) {
          positions[(base + k) * 3] = anchor.x;
          positions[(base + k) * 3 + 1] = .065;
          positions[(base + k) * 3 + 2] = anchor.z;
        }
        return;
      }
      active++;
      const grow = 1 + age * .1;
      const sin = Math.sin(p.heading), cos = Math.cos(p.heading);
      for (let k = 0; k < verticesPerPatch; k++) {
        const angle = (k - 1) * Math.PI * 2 / corners;
        const uneven = .78 + .22 * Math.sin(k * 2.7 + p.seed * 11);
        const x = k === 0 ? 0 : Math.cos(angle) * p.width * grow * uneven;
        const z = k === 0 ? 0 : Math.sin(angle) * p.length * grow * uneven;
        positions[(base + k) * 3] = p.x + cos * x + sin * z;
        positions[(base + k) * 3 + 1] = .065;
        positions[(base + k) * 3 + 2] = p.z - sin * x + cos * z;
      }
    });
    mesh.setEnabled(active > 0);
    if (active) {
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions, true);
      mesh.updateVerticesData(VertexBuffer.ColorKind, colors, false);
    }
  }
  function reset() { state.reset(); active = 0; mesh.setEnabled(false); }
  return { mesh, update, reset, dispose: () => mesh.dispose(), snapshot: () => ({ active, capacity: state.patches.length, vertices: positions.length / 3 }) };
}
