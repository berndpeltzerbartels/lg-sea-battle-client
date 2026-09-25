# Distant Island Appearance Diagnostic

Run an isolated Vite client, then:

```sh
ISLAND_FOG_PROFILE=legacy SEA_BATTLE_BASE_URL=http://127.0.0.1:5182 node scripts/diagnose-island-appearance.mjs
```

The script uses the real game, bridge camera, terrain renderer and lighting in an
isolated Playwright browser. It replaces the sandbox world in the browser response,
not on disk or on the server. No live game state is changed. Ship poses replay a
scripted turn followed by a straight approach; this tests rendering, not steering
physics or network correction. Default island distance is eight 600m map sectors.
Override with `ISLAND_DISTANCE` if needed.

Runs compare no fog, LINEAR, EXP, EXP2, and EXP2 with only the far clip extended.
The extended limit is a diagnostic control, not a proposed production setting.
Each sample compares the actual frame with a second frame hiding only the island.
This yields visible island pixel count and vertical bounds without depending on
its material color. Shader warmup precedes measurements. PNG captures and camera,
fog, clip and visibility measurements go to `/tmp/island-appearance` by default.
The optional first argument changes the output directory.

## Straight Approach Integration Test

Against the isolated Vite client (not the server's bundled production assets):

```sh
SEA_BATTLE_BASE_URL=http://127.0.0.1:5182 npx playwright test tests/e2e/island-appearance.spec.js --workers=1
```

Two identical islands are placed 250m apart in the direction of travel and offset
sideways so neither hides the other. The boat follows a straight sequence of poses
in 25m increments, with the normal bridge camera. Island visibility is measured
individually by hiding just that island for a comparison frame.

The first case explicitly restores the old fog color in the isolated browser.
It is a characterization test: passing means the original defect is reproduced.
It asserts that each island starts invisible, enters as a low strip less than 35%
of its full image height, then grows to its full height. When the farther island
first appears, the nearer one must already exceed 80% of its full height. A
long-clip control must show both complete islands throughout the approach.
The separate production-color regression test approaches from 4800m to 600m.
It requires the visible pixels and vertical bounds of each island to match the
12000m control (within rasterization tolerance), while retaining the production
4200m far plane. Both islands must eventually become visible: hiding everything
cannot satisfy the test. The legacy case is not desired production behavior.
Measurements and screenshots are attached to the Playwright result directory.

## First Visibility Experiment

Above water, fog now converges to the sky's exact RGB color instead of a darker
color. Density, near/far planes, lighting and geometry are unchanged. This removes
the residual silhouette of fully fogged land that exposed the far-plane cut.
It also means distant islands no longer remain visible merely because their fog
color differs from the sky. This is a visibility tradeoff for user evaluation,
not an extension of the visible horizon.

`ISLAND_FOG_PROFILE=matched` applies the same color matching only inside the test;
the default `production` profile uses the actual shared environment. The ordinary
production turn replay approaches farther after turning so it eventually reaches
visible terrain, whereas the legacy replay preserves the original shorter path.
The `APPEARANCE_SCENARIO=fade` straight replay uses 70m samples instead of 25m.
No additional meshes, passes or simulation work are introduced by this experiment.

Initial reproduction with a 4200m far plane:

- At frame 22 the island has 3800 visible pixels, spanning rows 343-401.
- At frame 25 only 514 pixels remain, rows 391-401: the top disappears first.
- Frames 26-32 contain no visible island pixels.
- Frame 33 starts its return at rows 396-401, growing upward on approach.
- The same disappearance occurs without fog.
- With an extended far plane the island remains present after entering the view.

The far plane is perpendicular to the viewing direction, not a circle around the
ship. Turning toward a distant island increases its camera-space depth. Its peak
and progressively lower slopes cross the far plane; approaching reverses this.
Fully fogged geometry also remains distinguishable against the different sky
color, making the clipping visible. This reproduction does not establish that
every reported disappearance has the same cause, or justify changing depth
precision or introducing silhouette LODs without further measurements.
