import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";

export function createLandscapeMaterials(scene) {
  const sand = new StandardMaterial("sand_material", scene);
  sand.diffuseColor = new Color3(0.58, 0.58, 0.5);
  sand.specularColor = new Color3(0.035, 0.038, 0.035);
  sand.zOffset = -2;
  // Authored terrain is a solid surface, not an overlay. A slope-dependent
  // depth bias pulls submerged triangles through the water at the shoreline.
  const terrainSand = sand.clone("terrain_sand_material");
  terrainSand.zOffset = 0;

  const grass = new StandardMaterial("grass_material", scene);
  grass.diffuseColor = new Color3(0.22, 0.34, 0.3);
  grass.specularColor = new Color3(0.025, 0.035, 0.03);
  grass.backFaceCulling = true;

  const snow = new StandardMaterial("snow_material", scene);
  snow.diffuseColor = new Color3(0.78, 0.82, 0.78);
  snow.specularColor = new Color3(0.18, 0.2, 0.2);
  snow.backFaceCulling = true;

  const underwaterLand = new StandardMaterial("underwater_land_material", scene);
  underwaterLand.diffuseColor = new Color3(0.035, 0.075, 0.08);
  underwaterLand.emissiveColor = new Color3(0.006, 0.02, 0.024);
  underwaterLand.specularColor = new Color3(0.01, 0.015, 0.015);
  underwaterLand.backFaceCulling = false;
  return {sand, terrainSand, grass, snow, underwaterLand};
}
