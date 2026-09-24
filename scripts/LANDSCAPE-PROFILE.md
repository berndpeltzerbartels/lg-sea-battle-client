# Compact world investigation (2026-09-23)

## Prepared instrument maps (2026-09-24)

The Java importer now persists a separate `instrument_map_json` column containing
world-space union contours at heights 0, 50 and 150. Mapped plateau sectors are
clipped at those heights; scalar peak contours use the server's height profile.
Water holes are removed before the land contributions are united. Built-in
procedural maps are prepared on the server when first requested. Imported maps
must have current persisted preparation; there is no repair-on-load fallback.

The world response includes these layers as `instrumentMap`. The client creates
three Path2D objects on world load and transforms them for map/radar views.
The old triangle-to-map generation, per-frame mask canvases and synchronous
pixel readback have been removed. No 3D terrain detail or fleet logic changed.

Verification: all server/client tests; 50 mapped formations through the actual
converter; desktop/mobile Canvas and full-game sandbox checks. The full-game
probe recorded zero Canvas readbacks and about 0.6 ms per instrument update
over 20 software-rendered frames. This is not a fleet or hardware FPS benchmark.

Reproduce with a client dev server on port 5176 and a prepared WorldMap JSON:

```sh
node scripts/verify-instrument-map.mjs /tmp/seabattle-instrument-world.json
node scripts/verify-game-instruments.mjs /tmp/seabattle-instrument-world.json
```

Generate that JSON using the server test with `MAPPED_LANDSCAPE_TEST_FILE` set to
the mapped editor fixture and `MAPPED_LANDSCAPE_TEST_OUTPUT` set to the output
path. Existing database landscapes must be reimported for the new preparation
version. The source editor JSON format itself did not change.

## Scope

Read-only snapshot of the active Java `/game/world`: 100 landmasses from the
compact 50-formation fixture. Isolated side-view sandbox, one stationary boat,
1200 x 800, Chromium SwiftShader. No participation in the user's game.
Main-loop time was measured around onBeforeRender observers. Chrome CPU sampling
was also captured. This is not a hardware FPS benchmark or a fleet simulation.

## Findings before visibility changes

The baseline repeated at the end reproduced the initial result. Hiding terrain,
hiding underwater terrain, or skipping foam did not remove the dominant stall.
Skipping only `updateNavigationInstruments` reduced measured before-render work
from about 3300 ms to about 3 ms. These absolute times are software-renderer
specific. CPU samples overwhelmingly land in Canvas `getImageData`, called by
`drawMaskOutline` for the radar mask. The radar redraws individual terrain
triangle contours into a fresh mask canvas each frame, then reads the pixels
back synchronously. The next investigation should replace that repeated work
with prepared/cached outlines without reducing terrain detail.

Existing telemetry's `simulationMs` is the clamped time step, NOT measured CPU
work, so it cannot distinguish this bottleneck from GPU rendering.

Raw local captures: `/tmp/seabattle-profile-results.json` and
`/tmp/seabattle-*.cpuprofile`. These temporary files are not required at runtime.

## Withdrawn experiment: water-side visibility

Withdrawn after the user reported worse rendering and green overlaps on sand.
The runtime is restored to 592a426, including its boat precision correction.
The following records the experiment, not the current production behavior.
An array-level comparison on the active compact-world snapshot found 400 terrain
meshes before and after preparation, with unchanged positions, indices and LOD
counts. This does not establish the cause of the user's visual regression; in
particular the rendering tests below did not establish acceptable visual quality.

Follow-up geometry check: the first compact formation's mountain contains 514 of
669 triangles exactly at its base height (1.2 world height units). Every vertex
of those 514 triangles is inside its supporting sandbank plateau, which has the
same height. This is pre-existing coplanar overlap in the unmapped legacy terrain
path; disabling water-side visibility does not fix it. Parent/child surface
ownership needs correction, not a depth bias or another height offset.

Static landscape is assigned to disjoint camera layers at load/rebuild. Meshes
crossing zero height are split once, including interpolated normals and UVs.
Already separated authored surfaces and their LODs need no re-triangulation.
Water itself remains visible from both sides. The ocean floor is underwater;
foam is surface-only, with foam water checks skipped while submerged.
Simulation, collision heights and network coordinates remain unchanged.

Camera height selects the side, not submarine hull depth: an above-water
periscope sees the surface. Editor inspection is unaffected. Dynamic ships
retain their existing visibility logic; this change targets static landscape.

Browser verification on the compact fixture submitted zero underwater meshes
from surface/periscope cameras and zero surface meshes from an underwater camera.
At the tested viewpoints, it removed 8272 surface-view / 19209 underwater-view
triangles from draw submission compared with rendering both sides. No browser
errors. This is a verified reduction in submitted geometry, not an FPS promise.
