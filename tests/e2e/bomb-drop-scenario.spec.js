import { expect, test } from '@playwright/test';

const BOMB_DROP_SCENARIO = `
scenario: playwright-bomb-drop
version: 9301
cell: 80
map:
...........
...........
....1..2...
...........
...........
objects:
1: ship, light, human [orientation: 90°, speed: 0knt]
2: plane, dark, bot [orientation: 270°, speed: 30knt, height: 150m]
`;

test('bomb drop scenario can be observed as screenshot series', async ({ page, request }, testInfo) => {
  await ensureLoggedIn(page);

  const reset = await request.post('/game/test-scenario', {
    data: {
      adminKey: 'bernd',
      scenario: BOMB_DROP_SCENARIO
    }
  });
  if (!reset.ok()) {
    throw new Error(`Scenario reset failed ${reset.status()}: ${await reset.text()}`);
  }

  await page.goto('/app?scenarioTest=1');
  const loginCard = page.locator('.login-card');
  if (await loginCard.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await loginCard.locator('input[name="nickname"]').fill('Playwright');
    await loginCard.locator('input[name="alias"]').fill('PWT');
    const email = loginCard.locator('input[name="email"]');
    if (await email.count()) {
      await email.fill('playwright@example.test');
    }
    await loginCard.locator('select[name="team"]').selectOption('light');
    await loginCard.locator('button[type="submit"]').click();
  }

  await expect(page.locator('#renderCanvas')).toBeVisible();
  await expect(page.locator('.login-card')).toHaveCount(0);

  for (let frame = 0; frame < 12; frame += 1) {
    await page.screenshot({
      path: testInfo.outputPath(`bomb-drop-${String(frame).padStart(2, '0')}.png`),
      fullPage: false
    });
    await page.waitForTimeout(250);
  }
});

async function ensureLoggedIn(page) {
  await page.goto('/app?scenarioTest=1');
  const loginCard = page.locator('.login-card');
  if (!(await loginCard.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }

  await loginCard.locator('input[name="nickname"]').fill('Playwright');
  await loginCard.locator('input[name="alias"]').fill('PWT');
  const email = loginCard.locator('input[name="email"]');
  if (await email.count()) {
    await email.fill('playwright@example.test');
  }
  await loginCard.locator('select[name="team"]').selectOption('light');
  await loginCard.locator('button[type="submit"]').click();
  await expect(loginCard).toHaveCount(0);
}
