import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createGzip, constants } from 'node:zlib';
import { chromium } from '@playwright/test';

// Capture public snapshots only: no registration or writes to the live game.
const origin = process.env.SEA_BATTLE_BASE_URL ?? 'http://localhost:8080';
const snapshots = [];
for (let i = 0; i < 20; i++) {
  const response = await fetch(new URL('/game/state', origin));
  assert.equal(response.status, 200);
  snapshots.push(await response.json());
  await new Promise(resolve => setTimeout(resolve, 100));
}
const count = 100;
const runs = new Map();
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    return res.end('<!doctype html><title>Isolated stream test</title>');
  }
  const mode = url.searchParams.get('mode');
  const stats = { rawBytes: 0, wireBodyBytes: 0, writes: 0, backpressure: 0 };
  runs.set(url.searchParams.get('id'), stats);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  const gzip = mode === 'plain' ? null : createGzip();
  if (gzip) {
    res.setHeader('Content-Encoding', 'gzip');
    gzip.on('data', chunk => {
      stats.wireBodyBytes += chunk.length;
      if (!res.write(chunk)) stats.backpressure++;
    });
    gzip.on('end', () => res.end());
  }
  res.flushHeaders();
  let seq = 0;
  const timer = setInterval(() => {
    const data = `data:${JSON.stringify({ type: 'game-stream', state: snapshots[seq % snapshots.length], seq, sentAt: Date.now() })}\n\n`;
    const bytes = Buffer.byteLength(data);
    stats.rawBytes += bytes;
    stats.writes++;
    if (gzip) {
      gzip.write(data);
      if (mode === 'flush') gzip.flush(constants.Z_SYNC_FLUSH);
    } else {
      stats.wireBodyBytes += bytes;
      if (!res.write(data)) stats.backpressure++;
    }
    if (++seq === count) {
      clearInterval(timer);
      if (gzip) gzip.end(); else res.end();
    }
  }, 100);
  res.on('close', () => { clearInterval(timer); gzip?.destroy(); });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  console.log('Browser:', await browser.version(), 'ships:', snapshots[0].ships.length);
  for (const limited of [false, true]) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: limited ? 30 : 0,
      downloadThroughput: limited ? 250_000 : -1,
      uploadThroughput: limited ? 250_000 : -1
    });
    for (const mode of ['plain', 'flush', 'buffered']) {
      const id = `${limited}-${mode}`;
      const result = await page.evaluate(({ mode, id, count }) => new Promise((resolve, reject) => {
        const source = new EventSource(`/events?mode=${mode}&id=${id}`);
        const delays = [], gaps = [], parses = [];
        let previous = null;
        const timeout = setTimeout(() => { source.close(); reject(new Error('Stream timeout')); }, 30000);
        source.onmessage = event => {
          const now = Date.now(), start = performance.now();
          const message = JSON.parse(event.data);
          parses.push(performance.now() - start);
          if (message.seq !== delays.length) {
            clearTimeout(timeout); source.close(); reject(new Error('Sequence mismatch')); return;
          }
          delays.push(now - message.sentAt);
          if (previous !== null) gaps.push(now - previous);
          previous = now;
          if (delays.length === count) {
            clearTimeout(timeout); source.close();
            const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
            resolve({ messages: delays.length, medianDelayMs: quantile(delays, .5), p95DelayMs: quantile(delays, .95),
              maxDelayMs: Math.max(...delays), maxGapMs: Math.max(...gaps),
              gapsOver200ms: gaps.filter(g => g > 200).length,
              meanParseMs: parses.reduce((a, b) => a + b, 0) / parses.length });
          }
        };
      }), { mode, id, count });
      console.log(JSON.stringify({ network: limited ? '2 Mbit/s, 30ms' : 'localhost', mode, ...runs.get(id), ...result }));
    }
  }
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
