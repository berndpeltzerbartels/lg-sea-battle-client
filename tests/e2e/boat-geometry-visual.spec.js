import { expect, test } from '@playwright/test';

test('torpedo boat bow geometry is inspectable against a bright background', async ({ page }, testInfo) => {
  await page.goto('/sea-battle/index.html?setup=8&shipContrast=1&viewMode=ship&viewFov=0.78&viewHeight=0.68&viewX=0&viewZ=1.65&viewYaw=0');

  await expect(page.locator('#renderCanvas')).toBeVisible();
  await page.waitForFunction(() => document.body.dataset.sideViewSandbox === 'true');
  await page.waitForTimeout(500);

  await page.screenshot({
    path: testInfo.outputPath('torpedo-boat-bright-background.png'),
    fullPage: false
  });
});
