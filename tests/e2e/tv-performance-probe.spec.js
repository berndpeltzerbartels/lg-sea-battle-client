import { test, expect } from '@playwright/test';

test('optional remote profiler sends actual scene counters and preserves the game', async ({ page }) => {
  test.setTimeout(45000);
  const reports = [];
  await page.route('**/game/client-error', route => {
    const report = route.request().postDataJSON();
    if (report.type === 'client-profile') reports.push(JSON.parse(report.stack.split('\nClient:')[0]));
    return route.fulfill({ status: 204 });
  });
  await page.goto('/sea-battle/index.html?setup=8&vehicle=submarine&scenarioTest=1&perf-log=1&perf-upload=1');
  await expect.poll(() => reports.find(r => r.instrumentation), { timeout: 30000 }).toBeTruthy();
  const report = reports.find(r => r.instrumentation);
  expect(report.instrumentation.totalMeshes).toBeGreaterThan(0);
  expect(report.instrumentation.activeMeshEvaluationMs).not.toBeNull();
  expect(report.metrics.frameMs.count).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.body.dataset.startupError)).toBeUndefined();
});
