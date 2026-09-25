# Distant Island Appearance Diagnostic

Run an isolated Vite client, then:

```sh
SEA_BATTLE_BASE_URL=http://127.0.0.1:5182 node scripts/diagnose-island-appearance.mjs
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
