# Boat precision comparison

Run a client Vite server, then:

```sh
SEA_BATTLE_BASE_URL=http://127.0.0.1:5175 node scripts/diagnose-boat-precision.mjs
```

This uses an isolated side-view sandbox, not a player in the running game.
It disables landscape, animation, fog and shadows, then translates the same
boat and camera together. Their relative pose must not change the rendered image.
The script compares default float32 matrices, high-precision CPU matrices alone,
and Babylon's large-world rendering. Engine options are overridden in intercepted
development-script responses only. Output goes to `/tmp/sea-battle-precision`.

On the 2026-09-23 SwiftShader run, offsets at x=z=8500 caused hundreds of changed
pixels during centimetre-sized translations with default rendering. CPU matrix
precision alone did not fix this. Large-world rendering produced pixel-identical
images at 0, 1500 and 8500, including all translation samples.

Production now uses `useLargeWorldRendering`. Babylon offsets GPU coordinates
relative to the camera; authored coordinates and physics/network positions are
unchanged. This adds no terrain triangles and does not rebuild terrain per frame.
It does add matrix/uniform work: hardware frame-time impact still needs a real
game test. This diagnostic establishes precision stability, not game performance
or the absence of unrelated geometry defects.
