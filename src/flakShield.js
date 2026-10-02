import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { SubMesh } from '@babylonjs/core/Meshes/subMesh.js';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';

const interiors = new WeakMap();
function interiorMaterial(scene) {
  if (!interiors.has(scene)) {
    const material = new StandardMaterial('flak_interior_black', scene);
    material.diffuseColor = new Color3(.012, .014, .015);
    material.specularColor = Color3.Black();
    interiors.set(scene, material);
  }
  return interiors.get(scene);
}

export function createFlakShield(scene, parent, name, material, scale, variant) {
  const positions = [], outerIndices = [], innerIndices = [];
  const patch = (point, rows, columns) => {
    const base = positions.length / 3;
    for (let inside = 0; inside < 2; inside++) {
      for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
        const [x, y, z] = point(row / rows, column / columns);
        const shrink = inside ? .96 : 1;
        positions.push(x * shrink * scale, (-.145 + y * shrink) * scale, z * shrink * scale);
      }
    }
    const count = (rows + 1) * (columns + 1);
    const face = (a, b, c, inward = false) => {
      const p = i => positions.slice(i * 3, i * 3 + 3);
      const [A, B, C] = [p(a), p(b), p(c)];
      const u = B.map((v, i) => v - A[i]), v = C.map((v, i) => v - A[i]);
      const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
      if (n.reduce((sum, value) => sum + value*value, 0) < 1e-18) return;
      const dot = n[0]*A[0] + n[1]*(A[1]+.145*scale) + n[2]*A[2];
      const indices = inward ? innerIndices : outerIndices;
      if ((dot > 0) !== inward) indices.push(a, c, b); else indices.push(a, b, c);
    };
    for (let inside = 0; inside < 2; inside++) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
        const a = base + inside * count + r * (columns + 1) + c, b = a + columns + 1;
        face(a, b, b + 1, !!inside); face(a, b + 1, a + 1, !!inside);
      }
    }
    // Close the sheet edges so the open slot has a visible, solid rim.
    const edge = (a, b) => innerIndices.push(a, b, b + count, a, b + count, a + count, b, a, a + count, b, a + count, b + count);
    for (let r = 0; r < rows; r++) {
      edge(base + r*(columns+1), base + (r+1)*(columns+1));
      edge(base + r*(columns+1)+columns, base + (r+1)*(columns+1)+columns);
    }
    for (let c = 0; c < columns; c++) {
      edge(base+c, base+c+1);
      edge(base+rows*(columns+1)+c, base+rows*(columns+1)+c+1);
    }
  };
  const radius = .31, gap = .095, height = .32;
  for (const side of [-1, 1]) patch((u, v) => {
    const x = gap + (radius - gap) * Math.sin(u * Math.PI / 2);
    const r = Math.sqrt(Math.max(0, 1 - (x/radius)**2));
    return [side*x, height*r*Math.sin(v*Math.PI), radius*r*Math.cos(v*Math.PI)];
  }, 8, 24);
  if (variant === 'enclosed') patch((u, v) => {
    const x = (u*2-1)*gap, r = Math.sqrt(1-(x/radius)**2);
    const angle = 2.05 + v*(Math.PI-2.05);
    return [x, height*r*Math.sin(angle), radius*r*Math.cos(angle)];
  }, 4, 10);
  const indices = [...outerIndices, ...innerIndices];
  const data = new VertexData();
  data.positions = positions; data.indices = indices; data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  const mesh = new Mesh(`${name}_flak_shield_${variant}`, scene);
  data.applyToMesh(mesh);
  const black = interiorMaterial(scene);
  const materials = new MultiMaterial(`${name}_flak_shell_material`, scene);
  materials.subMaterials.push(material, black);
  mesh.parent = parent; mesh.material = materials;
  mesh.subMeshes = [];
  new SubMesh(0, 0, positions.length / 3, 0, outerIndices.length, mesh);
  new SubMesh(1, 0, positions.length / 3, outerIndices.length, innerIndices.length, mesh);
  mesh.onDisposeObservable.addOnce(() => materials.dispose());
  const floor = MeshBuilder.CreateCylinder(`${name}_flak_black_floor`, { diameter: .60*scale, height: .008*scale, tessellation: 48 }, scene);
  floor.parent = mesh;
  floor.position.set(0, -.148*scale, 0);
  floor.material = black;
  return mesh;
}
