# Shared authored landscape renderer

Owned and versioned in the game client repository. The client imports this
package directly; the editor consumes it as a local file dependency. Geometry
has no Babylon or browser dependencies. Renderer uses the caller's scene and
materials, without loading game startup, networking or simulation.

Both applications use Babylon 8.56.2 in the current lockfiles. The editor
deduplicates Babylon when resolving the linked package.

## Contract

- Game input is WorldMap land data: world-space polygon and heightPoints,
  plus x/z at the bounding-box center and resolved baseHeight.
- editorIslandToLand maps editor input to that same contract. Mesh coordinates
  are local; the caller positions the parent at x/z before mesh construction.
- createAuthoredIslandSurface returns primary meshes with distance LODs.
  Disposing a primary mesh also disposes its LOD. Camera movement never builds
  geometry; editor changes rebuild it.
- Waterline splitting, terrain materials, normals and LOD construction are
  shared. Environment lighting, water, landmarks and cameras are still owned
  by each application. This is not yet pixel-identical complete game preview.

## Verification and limitations

`npm test` in the client includes geometry fingerprints captured from checkpoint
f64c2ed, editor/game input parity and repeated mesh/LOD disposal tests.
Unmapped legacy geometry retains its checkpoint behavior. Fully mapped landmasses
use `boundaryPointId` / `plateauBoundaryPointId` to build explicit planar slope
sectors. Extra outer vertices belong to the intervening boundary arc. Contours
are not independently smoothed, which would invalidate the authored pairings.
Multiple surfaces are combined into an exact upper envelope by clipping away
covered triangle portions, including coplanar ties. No geometry refinement runs
per frame. Mapped terrain does not build an identical duplicate LOD mesh.

All plateaus of a landmass must be completely assigned to activate mapped geometry.
Partial assignments retain the legacy view while editing; absent links are never
guessed. Invalid complete mappings fail explicitly. Source files from older
exports without assignments must be completed in the editor and exported again.
The server preserves the IDs and uses the same planar sectors and maximum for
its height-field preparation; its preparation cache version is now 2.

Mapped regression tests cover single/multiple/overlapping plateau tops, reversed
winding, extra boundary vertices, monotonic heights, exact area coverage and no
overlapping faces. The upper envelope has a 20000-triangle output guard per landmass.
Existing single-peak and unmapped terrain fingerprints remain unchanged.
Authored sand uses `terrainSand` with zero depth bias. The original biased `sand`
material is retained for legacy overlays, not underwater terrain triangles.
The old hard-coded procedural game world remains supported in the game client.
The previous editor terrain is archived under experiments/legacyTerrain.js;
its historical tests are not evidence that the shared renderer fixes those cases.

No performance improvement is claimed. Above/below-water surfaces are separate,
but visibility exclusion and GPU/CPU measurements remain pending. Server import
cache currently stores WorldMap and respawn data, not prepared GPU meshes.
