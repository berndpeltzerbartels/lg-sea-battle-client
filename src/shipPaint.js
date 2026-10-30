import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

// Paint is baked once into existing triangles, in ship coordinates. It follows
// moving guns and extending masts without per-frame paint work.
export function applyShipPaint(root) {
  const inverse = root.computeWorldMatrix(true).clone().invert();
  for (const mesh of root.getChildMeshes()) {
    if (!mesh.material?.metadata?.angularFleetPaint || mesh.metadata?.angularFleetPaint) continue;
    if (mesh.name.includes('_tube_') || mesh.name.endsWith('_bow_bulwark_cap')) continue;
    if (mesh.name.endsWith('_deck') || mesh.name.endsWith('_deck_casing')) continue;
    if (!mesh.getVerticesData('position') || !mesh.getIndices()?.length) continue;
    mesh.convertToUnIndexedMesh();
    const positions = mesh.getVerticesData('position');
    const matrix = mesh.computeWorldMatrix(true).multiply(inverse);
    const colors = [];
    const mast = mesh.name.includes('_periscope_');
    for (let i = 0; i < positions.length; i += 9) {
      const center = Vector3.TransformCoordinates(new Vector3(
        (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
        (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3,
        (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3
      ), matrix);
      const band = mast
        ? Math.sin(center.y * 12 + center.z * 4 + center.x * 5)
        : Math.sin((center.z + center.y * .8) * 1.17) + .3 * Math.cos(center.z * 2.1 - center.y);
      const factor = band > .42 ? 1.22 : band < -.42 ? .55 : .94;
      for (let vertex = 0; vertex < 3; vertex++) colors.push(factor, factor, factor, 1);
    }
    mesh.setVerticesData('color', colors);
    mesh.useVertexColors = true;
    mesh.metadata = { ...mesh.metadata, angularFleetPaint: true };
  }
}

// One shared, static texture: uniformly dark rods with a small forward lens.
// No added geometry and no per-frame texture updates.
export function periscopePaintFactor(u, v) {
  // A small forward-facing lens near the head, painted on the same surface.
  const lensX = (u - .75) / .075;
  const lensY = (v - .963) / .011;
  if (lensX * lensX + lensY * lensY <= 1) return .025;
  return .65;
}

export function getPeriscopePaintMaterial(scene, source) {
  if (!source?.metadata?.angularFleetPaint) return source;
  const existing = scene.getMaterialByName('light_periscope_dark_paint');
  if (existing) return existing;
  const material = source.clone('light_periscope_dark_paint');
  material.metadata = { angularFleetPaint: false, darkPeriscopePaint: true };
  // A restrained warm grey, still darker than the hull, without bright steel glints.
  material.specularColor = new Color3(.07, .075, .08);
  material.specularPower = 64;
  const width = 128, height = 256, data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const color = Math.round(255 * periscopePaintFactor((x + .5) / width, (y + .5) / height));
    data.set([color, color, color, 255], (y * width + x) * 4);
  }
  material.diffuseTexture = RawTexture.CreateRGBATexture(data, width, height, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  material.diffuseTexture.name = 'light_periscope_dark_with_lens';
  return material;
}

export function submarineFlakMaterials(scene, teamMaterials) {
  if (!teamMaterials.hull?.metadata?.angularFleetPaint) return teamMaterials;
  let black = scene.getMaterialByName('light_submarine_black_flak');
  if (!black) {
    black = new StandardMaterial('light_submarine_black_flak', scene);
    black.diffuseColor = new Color3(.06, .07, .08);
    black.emissiveColor = new Color3(.008, .01, .012);
    black.specularColor = new Color3(.15, .16, .17);
    black.specularPower = 32;
  }
  return { hull: black, deck: black, cabin: black, funnel: black };
}
