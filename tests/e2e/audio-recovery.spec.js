import { test, expect } from '@playwright/test';

test('audio recovers after interruption, context closure and page return while preserving mute', async ({ page }) => {
  test.setTimeout(45000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    window.testAudioContexts = [];
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.testAudioContexts.push(this); }
    };
    localStorage.setItem('engineSoundMuted', 'false');
  });
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('#renderCanvas').click({ position: { x: 200, y: 200 } });
  const sound = () => page.evaluate(() => window.seaBattleScenarioTest.engineAudioForTest());
  await expect.poll(async () => (await sound())?.loaded).toBe(true);

  await page.evaluate(() => window.testAudioContexts.at(-1).suspend());
  await expect.poll(async () => (await sound())?.context).toBe('running');
  await page.evaluate(() => window.testAudioContexts.at(-1).close());
  await expect.poll(() => page.evaluate(() => window.testAudioContexts.length)).toBe(2);
  await expect.poll(async () => (await sound())?.loaded).toBe(true);

  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect.poll(async () => (await sound())?.loaded).toBe(true);
  expect((await sound()).surfaceGain).toBeGreaterThan(0);

  await page.locator('#engineSoundToggle').click();
  await page.evaluate(() => window.testAudioContexts.at(-1).suspend());
  await expect.poll(async () => (await sound())?.context).toBe('running');
  expect((await sound()).surfaceGain).toBe(0);
  expect((await sound()).fanGain).toBe(0);
  expect(errors).toEqual([]);
});
