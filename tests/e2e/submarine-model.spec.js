import { expect, test } from "@playwright/test";

test("side-view sandbox can render the new submarine model", async ({ page }, testInfo) => {
  await page.goto("/sea-battle/?setup=8&vehicle=submarine&hide-beach=1");
  await page.waitForFunction(() => (
    document.body.dataset.playerVehicle === "submarine"
    && Number(document.body.dataset.playerModelMeshes || 0) > 12
    && document.body.dataset.submarineFlak === "1"
  ));

  await expect(page.locator("#renderCanvas")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("submarine-model.png"), fullPage: true });
});

test("submarine cockpit exposes bridge and flak controls only", async ({ page }) => {
  await page.goto("/sea-battle/?setup=8&vehicle=submarine&hide-beach=1");
  await page.waitForFunction(() => document.body.dataset.playerVehicle === "submarine");

  await expect(page.locator("#bridgeViewButton")).toBeVisible();
  await expect(page.locator("#flakViewButton")).toBeVisible();
  await expect(page.locator("#cannonViewButton")).toBeHidden();
  await expect(page.locator("#torpedoAidButton")).toBeVisible();
  await expect(page.locator(".align-weapons-group")).toBeHidden();
  await expect(page.locator(".submarine-depth-actions")).toContainText("Auftauchen");
  await expect(page.locator(".submarine-depth-actions")).toContainText("Tauchen");
  await expect(page.locator(".submarine-depth-actions")).toContainText("Sehrohrtiefe");
  await expect(page.locator("#submarineSurfaceButton")).toContainText("B");

  await page.keyboard.press("P");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("periscope");
  await expect(page.locator("#depthValue")).toHaveText("Sehrohr");
  await expect(page.locator("#torpedoAidButton")).toBeEnabled();
  await page.keyboard.press("P");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("surface");

  await page.keyboard.press("T");
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("active");
  await page.locator("#bridgeViewButton").click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("hidden");

  await page.keyboard.press("F");
  await expect.poll(() => page.evaluate(() => document.body.dataset.flakView)).toBe("active");
  await page.keyboard.press("D");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("submerged");
  await expect.poll(() => page.evaluate(() => document.body.dataset.flakView)).toBe("bridge");
  await expect(page.locator("#depthValue")).toHaveText("Getaucht");
  await expect(page.locator("#torpedoAidButton")).toBeDisabled();
  await page.keyboard.press("T");
  await expect.poll(() => page.evaluate(() => document.body.dataset.torpedoView)).toBe("hidden");
  await page.keyboard.press("B");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("surface");
  await expect(page.locator("#torpedoAidButton")).toBeEnabled();
  await page.keyboard.press("D");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("submerged");
  await page.keyboard.press("D");
  await expect.poll(() => page.evaluate(() => document.body.dataset.playerDepthState)).toBe("surface");

  await page.keyboard.press("F");
  await expect.poll(() => page.evaluate(() => document.body.dataset.flakView)).toBe("active");
  await page.locator("#bridgeViewButton").click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.flakView)).toBe("bridge");

  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("ArrowUp");
  }
  await page.waitForTimeout(12000);
  const speed = Number(await page.locator("#telegraphSpeedValue").textContent());
  expect(speed).toBeLessThanOrEqual(11.1);
});
