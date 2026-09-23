import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.SEA_BATTLE_BASE_URL ?? 'http://127.0.0.1:5175';
const output = process.env.DIAGNOSTIC_OUTPUT ?? '/tmp/sea-battle-precision';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const mode of ['baseline', 'highPrecisionMatrix', 'largeWorld']) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 650 } });
    // Only the isolated dev page changes. No production file or game session is modified.
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/src/main.js*', async route => {
      const response = await route.fetch();
      const source = await response.text();
      const marker = 'useLargeWorldRendering: true,';
      if (!source.includes(marker)) throw new Error('Engine initialization changed');
      await route.fulfill({ response, body: source.replace(marker,
        `useLargeWorldRendering: ${mode === 'largeWorld'},\n  useHighPrecisionMatrix: ${mode === 'highPrecisionMatrix'},`) });
    });
    await page.goto(`${base}/sea-battle/?setup=8&scenarioTest=1&shipContrast=1&viewMode=ship&viewFov=0.78&viewHeight=0.68&viewX=0&viewZ=1.65&viewYaw=0`);
    await page.waitForFunction(() => document.body.dataset.scenarioTest === 'ready');
    await page.waitForTimeout(500);
    const measurement = await page.evaluate(async () => {
      const source = await (await fetch('/sea-battle/src/main.js')).text();
      const { Engine } = await import(source.match(/import \{ Engine \} from "([^"]+)"/)[1]);
      const engine = Engine.Instances[0];
      engine.stopRenderLoop();
      const scene = engine.scenes[0];
      scene.onBeforeRenderObservable.clear();
      const boat = scene.getTransformNodeByName('player_bow');
      const camera = scene.activeCamera;
      scene.getTransformNodeByName('world').setEnabled(false);
      scene.getTransformNodeByName('player_bow_player_bow_wake').setEnabled(false);
      scene.fogEnabled = false;
      scene.shadowsEnabled = false;
      const boatPosition = boat.position.clone();
      const cameraPosition = boatPosition.clone();
      cameraPosition.y += 8;
      cameraPosition.z += 20;
      const target = boatPosition.clone();
      target.y += 2;
      const gl = engine._gl;
      function capture(offset) {
        boat.position.copyFrom(boatPosition);
        camera.position.copyFrom(cameraPosition);
        boat.position.x += offset;
        boat.position.z += offset;
        camera.position.x += offset;
        camera.position.z += offset;
        const nextTarget = target.clone();
        nextTarget.x += offset;
        nextTarget.z += offset;
        camera.setTarget(nextTarget);
        scene.render();
        const pixels = new Uint8Array(engine.getRenderWidth() * engine.getRenderHeight() * 4);
        gl.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight(), gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels;
      }
      function difference(a, b) {
        let changed = 0, absolute = 0;
        for (let i = 0; i < a.length; i += 4) {
          const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
          if (d > 12) changed++;
          absolute += d;
        }
        return { changedPixels: changed, meanChannelError: absolute / (a.length / 4 * 3) };
      }
      const reference = capture(0);
      const samples = [0, 1500, 8500].map(distance => {
        const first = capture(distance);
        const motions = [0.013, 0.026, 0.039, 0.052].map(step => difference(first, capture(distance + step)));
        return { distance, relativeToOrigin: difference(reference, first), motions };
      });
      capture(8500);
      return { samples, floatingOrigin: scene.floatingOriginMode, matrixType: boat.getWorldMatrix().m.constructor.name,
        meshes: scene.getActiveMeshes().length, clip: [camera.minZ, camera.maxZ],
        nonblank: reference.some((value, i) => i % 4 !== 3 && value > 0) };
    });
    await page.screenshot({ path: `${output}/${mode}.png` });
    results.push({ mode, ...measurement });
    assert.deepEqual(errors, [], `${mode}: browser errors`);
    assert.ok(measurement.nonblank && measurement.meshes > 0, `${mode}: empty boat view`);
    if (mode === 'largeWorld') for (const sample of measurement.samples) {
      assert.ok(sample.relativeToOrigin.meanChannelError < 0.001, 'Boat image changed with world position');
      assert.ok(sample.motions.every(diff => diff.meanChannelError < 0.001), 'Boat flickered during common translation');
    }
    await page.close();
  }
  await writeFile(`${output}/measurements.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
