import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const world = JSON.parse(await readFile(process.argv[2], "utf8"));
const base = process.env.INSTRUMENT_TEST_URL ?? "http://127.0.0.1:5176";
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1000, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 700 } });
    await page.route("**/instrument-test", route => route.fulfill({ contentType: "text/html", body: '<body style="margin:0;background:#0b303c"><canvas></canvas></body>' }));
    await page.goto(`${base}/instrument-test`);
    const result = await page.evaluate(async ({ world, width }) => {
      const { prepareInstrumentPaths, radarTransform } = await import("/sea-battle/src/instrumentMap.js");
      const paths = prepareInstrumentPaths(world.instrumentMap);
      const canvas = document.querySelector("canvas");
      canvas.width = width; canvas.height = 700;
      const ctx = canvas.getContext("2d");
      const points = world.instrumentMap.layers[0].contours.flat();
      const xs = points.map(p => p.x), zs = points.map(p => p.z);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
      const origin = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
      const scale = Math.min((width - 30) / (maxX - minX), 650 / (maxZ - minZ)) * 0.8;
      let readbacks = 0;
      const original = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(...args) { readbacks++; return original.apply(this, args); };
      const start = performance.now();
      for (let frame = 0; frame < 120; frame++) {
        ctx.resetTransform(); ctx.clearRect(0, 0, width, 700);
        ctx.transform(...radarTransform(origin, width / 2, 350, scale, frame / 120 * 0.3));
        paths.forEach((path, index) => { ctx.fillStyle = ["#789957", "#4c7549", "#34563c"][index]; ctx.fill(path, "evenodd"); });
        ctx.lineWidth = 1 / scale; ctx.strokeStyle = "#ddd193"; ctx.stroke(paths[0]);
      }
      const elapsedMs = performance.now() - start;
      CanvasRenderingContext2D.prototype.getImageData = original;
      const pixels = ctx.getImageData(0, 0, width, 700).data;
      let opaque = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) opaque++;
      return { readbacks, opaque, elapsedMs, paths: paths.length };
    }, { world, width });
    assert.equal(result.readbacks, 0);
    assert.equal(result.paths, 3);
    assert.ok(result.opaque > 500);
    await page.screenshot({ path: `/tmp/instrument-map-${width}.png` });
    console.log(JSON.stringify({ width, ...result }));
    await page.close();
  }
} finally {
  await browser.close();
}
