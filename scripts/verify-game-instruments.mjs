import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const world = JSON.parse(await readFile(process.argv[2], "utf8"));
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/src/main.js*", async route => {
    const response = await route.fetch();
    let source = await response.text();
    const sandboxReturn = /return \{ landmasses: \[\], mapObjects: \[\], instrumentMap:[^\n]+/;
    assert.ok(sandboxReturn.test(source));
    source = source.replace(sandboxReturn, `return ${JSON.stringify(world)};`);
    source += `
      window.instrumentProbe = { samples: [], readbacks: 0, paths: instrumentPaths.length };
      const originalInstrumentUpdate = updateNavigationInstruments;
      updateNavigationInstruments = function(...args) {
        const start = performance.now();
        const result = originalInstrumentUpdate(...args);
        window.instrumentProbe.samples.push(performance.now() - start);
        return result;
      };
      const originalReadback = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        window.instrumentProbe.readbacks++;
        return originalReadback.apply(this,args);
      };
    `;
    await route.fulfill({ response, body: source });
  });
  await page.goto("http://127.0.0.1:5176/sea-battle/?setup=8&scenarioTest=1");
  await page.waitForFunction(() => window.instrumentProbe?.samples.length >= 20, null, { timeout: 90000 });
  const stats = await page.evaluate(() => {
    const p = window.instrumentProbe;
    return { paths: p.paths, readbacks: p.readbacks, frames: p.samples.length, meanMs: p.samples.reduce((a,b) => a+b,0)/p.samples.length };
  });
  assert.deepEqual(errors, []);
  assert.equal(stats.paths, 3);
  assert.equal(stats.readbacks, 0);
  await page.screenshot({ path: "/tmp/game-instruments-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/game-instruments-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(stats));
} finally {
  await browser.close();
}
