import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('document.getElementById("expandDebugMap")'),
  source.indexOf('\n});', source.indexOf('document.getElementById("expandDebugMap")')) + 4);

for (const size of [{ width: 1600, height: 900 }, { width: 390, height: 700 }]) {
  test(`debug map expands and closes at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    // Exercise the real layout and click handler without a login or live game.
    await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''));
    await page.addStyleTag({ content: css });
    await page.evaluate(() => {
      document.body.dataset.debugMap = 'true';
      document.body.classList.add('big-map');
    });
    await page.addScriptTag({ content: handler });
    const button = page.locator('#expandDebugMap');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const box = await page.locator('#mapCanvas').boundingBox();
    expect(box.width).toBeGreaterThan(size.width < 500 ? 280 : 900);
    expect(box.height).toBeGreaterThan(400);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    await page.screenshot({ path: `/tmp/debug-map-${size.width}.png` });
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });
}
