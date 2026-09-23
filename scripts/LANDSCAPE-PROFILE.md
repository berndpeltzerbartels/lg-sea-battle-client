# Compact world investigation (2026-09-23)

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

## Implemented first: water-side visibility

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
