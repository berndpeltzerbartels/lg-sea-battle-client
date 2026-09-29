import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder.js';
import '@babylonjs/core/Meshes/Builders/sphereBuilder.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';

const MAX_CHARGES = 24;
const MAX_BLASTS = 12;
const BUBBLES = 24;
const BLAST_LIFE = 3.4;
const clamp = n => Math.max(0, Math.min(1, n));

// The server owns detonation time and horizontal position. Depth is visual only.
export function depthChargeUnderwaterPose(charge, now, scale) {
  const enteredAt = charge.releasedAt + (charge.lane >= 2 ? 1.3 : .7);
  const progress = clamp((now - enteredAt) / Math.max(.1, charge.explodesAt - enteredAt));
  return { visible: now >= enteredAt && now < charge.explodesAt && !charge.exploded,
    y: -.12 - 3 * scale * progress, progress };
}

export function createDepthChargeUnderwater(scene, scale) {
  let session, now = 0;
  const charges = new Map(), blasts = [];
  const paint = new StandardMaterial('depth_charge_underwater_steel', scene);
  paint.diffuseColor = new Color3(.25, .33, .32);
  paint.specularColor = new Color3(.25, .3, .3);
  const bubbles = new StandardMaterial('depth_charge_trail_bubbles', scene);
  bubbles.diffuseColor = new Color3(.58, .8, .8);
  bubbles.emissiveColor = new Color3(.09, .16, .17);
  bubbles.alpha = .55;
  bubbles.transparencyMode = Material.MATERIAL_ALPHABLEND;
  const noise = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const u = x * Math.PI / 32, v = y * Math.PI / 32;
    const density = clamp(.45 + .22 * Math.sin(u * 3 + Math.cos(v * 2))
      + .18 * Math.cos(v * 5 + Math.sin(u * 4)) + .12 * Math.sin(u * 11 + v * 9));
    const i = (y * 64 + x) * 4;
    noise[i] = noise[i + 1] = noise[i + 2] = density * density * 255;
    noise[i + 3] = 255;
  }
  const cloudTexture = RawTexture.CreateRGBATexture(noise, 64, 64, scene, true, false);
  cloudTexture.getAlphaFromRGB = true;
  const matrix = Matrix.Identity();
  const position = Vector3.Zero(), size = Vector3.One();

  function cloud(name, count, material) {
    const mesh = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 8 }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    const data = new Float32Array(count * 16);
    mesh.thinInstanceSetBuffer('matrix', data, 16, false);
    return { mesh, data };
  }
  function instance(part, index, x, y, z, sx, sy = sx, sz = sx) {
    position.set(x, y, z); size.set(sx, sy, sz);
    Matrix.ComposeToRef(size, Quaternion.Identity(), position, matrix);
    matrix.copyToArray(part.data, index * 16);
  }
  function refresh(part) {
    part.mesh.thinInstanceBufferUpdated('matrix');
    part.mesh.thinInstanceRefreshBoundingInfo();
  }
  function removeCharge(id) {
    const item = charges.get(id);
    item.mesh.dispose(); item.trail.mesh.dispose(); charges.delete(id);
  }
  function removeBlast(blast) {
    blast.cloud.mesh.dispose(); blast.core.dispose(); blast.material.dispose(); blast.coreMaterial.dispose();
  }
  function clear() {
    for (const id of charges.keys()) removeCharge(id);
    blasts.splice(0).forEach(removeBlast);
  }
  const api = {
    sync(instanceId, snapshots, serverTime) {
      if (instanceId !== session) { clear(); session = instanceId; }
      now = serverTime;
      for (const charge of snapshots) {
        if (charge.exploded || now >= charge.explodesAt) {
          if (charges.has(charge.id)) removeCharge(charge.id);
          continue;
        }
        if (charges.has(charge.id)) { charges.get(charge.id).charge = charge; continue; }
        if (charges.size >= MAX_CHARGES) continue;
        const diameter = .096 * scale * (charge.lane < 2 ? .75 : 1);
        const mesh = MeshBuilder.CreateCylinder(`sinking_${charge.id}`, {
          diameter, height: diameter * 1.15, tessellation: 12 }, scene);
        mesh.material = paint; mesh.isPickable = false;
        mesh.rotation.z = Math.PI / 2;
        mesh.rotation.y = charge.heading;
        mesh.setEnabled(false);
        const trail = cloud(`bubbles_${charge.id}`, 8, bubbles);
        trail.mesh.setEnabled(false);
        charges.set(charge.id, { charge, mesh, trail });
      }
      api.update(0);
    },
    explode(charge) {
      if (blasts.some(b => b.id === charge.id) || now - charge.explodesAt >= BLAST_LIFE) return;
      if (blasts.length >= MAX_BLASTS) removeBlast(blasts.shift());
      if (charges.has(charge.id)) removeCharge(charge.id);
      const material = bubbles.clone(`bubble_blast_${charge.id}`);
      material.alpha = .8;
      material.disableLighting = true;
      material.emissiveColor = new Color3(.44, .68, .65);
      material.opacityTexture = cloudTexture;
      material.opacityFresnelParameters = new FresnelParameters({
        leftColor: Color3.Black(), rightColor: Color3.White(), power: .65
      });
      const coreMaterial = bubbles.clone(`flash_${charge.id}`);
      coreMaterial.disableLighting = true;
      coreMaterial.emissiveColor = new Color3(.65, .92, .86);
      const core = MeshBuilder.CreateSphere(`pressure_flash_${charge.id}`, { diameter: 1, segments: 12 }, scene);
      core.material = coreMaterial; core.isPickable = false;
      const depth = -.12 - 3 * scale;
      core.position.set(charge.x, depth, charge.z);
      blasts.push({ id: charge.id, age: Math.max(0, now - charge.explodesAt), x: charge.x, z: charge.z,
        depth, radius: Math.min(charge.radius * .42, 12), core, material, coreMaterial,
        cloud: cloud(`underwater_blast_${charge.id}`, BUBBLES, material) });
      api.update(0);
    },
    update(dt) {
      now += dt;
      for (const [id, item] of charges) {
        if (now >= item.charge.explodesAt) { removeCharge(id); continue; }
        const pose = depthChargeUnderwaterPose(item.charge, now, scale);
        item.mesh.setEnabled(pose.visible); item.trail.mesh.setEnabled(pose.visible);
        if (!pose.visible) continue;
        const { x, z, heading } = item.charge;
        item.mesh.position.set(x, pose.y, z);
        item.mesh.rotation.x = pose.progress * .35;
        item.mesh.rotation.y = heading + Math.sin(pose.progress * 4) * .12;
        for (let i = 0; i < 8; i++) {
          const rise = ((now * 1.6 + i / 8) % 1);
          const diameter = .025 * scale * (1 + rise);
          instance(item.trail, i, x + Math.sin(i * 2.4) * rise * .12 * scale,
            Math.min(-diameter, pose.y + rise * scale), z + Math.cos(i * 2.4) * rise * .1 * scale, diameter);
        }
        refresh(item.trail);
      }
      for (let n = blasts.length - 1; n >= 0; n--) {
        const blast = blasts[n]; blast.age += dt;
        if (blast.age >= BLAST_LIFE) { removeBlast(blast); blasts.splice(n, 1); continue; }
        const t = blast.age / BLAST_LIFE;
        const expansion = 1 - Math.exp(-blast.age * 4);
        blast.core.scaling.setAll(Math.max(.01, blast.radius * expansion * 1.3));
        blast.coreMaterial.alpha = Math.max(0, 1 - blast.age / .38) * .65;
        blast.core.setEnabled(blast.age < .38);
        blast.material.alpha = .42 * (1 - t) ** 1.2;
        for (let i = 0; i < BUBBLES; i++) {
          const azimuth = i * 2.399963;
          const vertical = 1 - 2 * (i + .5) / BUBBLES;
          const radial = Math.sqrt(1 - vertical * vertical);
          const radius = blast.radius * expansion * (.45 + (i % 5) * .08);
          const diameter = blast.radius * (.28 + (i % 3) * .07) * (.3 + .7 * expansion);
          instance(blast.cloud, i, blast.x + Math.cos(azimuth) * radial * radius,
            Math.min(-diameter * .6, blast.depth + vertical * radius * .65 + blast.age * .8),
            blast.z + Math.sin(azimuth) * radial * radius, diameter, diameter * (1 + t * .4), diameter);
        }
        refresh(blast.cloud);
      }
    },
    state() {
      return { charges: [...charges.values()].map(c => ({ y: c.mesh.position.y, visible: c.mesh.isEnabled() })),
        blasts: blasts.map(b => ({ age: b.age, radius: b.radius, y: b.depth, bubbles: BUBBLES, alpha: b.material.alpha })) };
    },
    dispose() { clear(); paint.dispose(); bubbles.dispose(); cloudTexture.dispose(); }
  };
  return api;
}
