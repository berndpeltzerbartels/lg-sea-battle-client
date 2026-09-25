import assert from 'node:assert/strict';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? '/tmp/game-stream-compression';
const origin = process.env.GAME_ORIGIN ?? 'http://localhost:8080';
const vite = process.env.SEA_BATTLE_BASE_URL ?? 'http://127.0.0.1:5182';
const port = Number(process.env.PROBE_PORT ?? 5193);
const count = 120;
await mkdir(out, { recursive: true });
async function read(path) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200);
  return response.json();
}
const world = await read('/game/world');
const states = [];
for (let i = 0; i < count; i++) {
  states.push(await read('/game/state'));
  await new Promise(resolve => setTimeout(resolve, 100));
}
assert.ok(states.every(s => s.sessionId === states[0].sessionId), 'Landscape changed during capture');
const own = states[0].ships.find(s => s.vehicleType === 'torpedo-boat' && s.state === 'active' && s.teamId === 'light');
assert.ok(own, 'Need an active light torpedo boat');
for (const state of states) {
  state.ships = state.ships.map(s => s.id === own.id
    ? { ...own, controlledBy: 'player-BPB-sandbox', speed: 0, turnVelocity: 0, engineOrder: 0, rudderDegrees: 0 }
    : { ...s, controlledBy: 'bot' });
}
await writeFile(`${out}/states.jsonl`, states.map(s => JSON.stringify(s)).join('\n'));
await writeFile(`${out}/world.json`, JSON.stringify(world));
const cache = `${homedir()}/.gradle/caches/modules-2/files-2.1/io.netty`;
const jars = (await readdir(cache, { recursive: true })).filter(p => p.includes('/4.2.13.Final/') && p.endsWith('.jar'));
assert.ok(jars.length > 0);
const netty = spawn('java', ['-cp', jars.map(p => `${cache}/${p}`).join(':'),
  'scripts/NettyStreamProbe.java', `${out}/states.jsonl`, String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Netty startup timeout')), 30000);
    netty.stdout.on('data', data => { if (data.toString().includes('READY')) { clearTimeout(timeout); resolve(); } });
    netty.stderr.on('data', data => process.stderr.write(data));
    netty.on('exit', code => { clearTimeout(timeout); reject(new Error(`Netty exited ${code}`)); });
  });
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const results = [];
  for (const gzip of [false, true, true, false, false, true]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    page.setDefaultTimeout(25000);
    await page.addInitScript(() => {
      let seed = 42;
      Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.port === String(port)) return route.continue();
      if (url.pathname.includes('/game/') || url.pathname.includes('build-info')) {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(
          url.pathname.endsWith('/world') ? world : url.pathname.endsWith('/state') ? states[0] : {}) });
      }
      if (url.pathname.endsWith('/src/main.js')) {
        const response = await route.fetch();
        let source = await response.text();
        const emptyWorld = /return \{ landmasses: \[\], mapObjects: \[\], instrumentMap:[^\n]+/;
        assert.match(source, emptyWorld);
        source = source.replace(emptyWorld, `return ${JSON.stringify(world)};`)
          .replace('return createDirectSideViewSandboxState();', `return ${JSON.stringify(states[0])};`)
          .replace('const sideViewSandboxMode = directSideViewSandboxRequested || gameState.sessionId === "side-view-sandbox";', 'const sideViewSandboxMode = false;')
          .replace('connectGameEventStream();', '/* Isolated replay connects after shader warmup. */');
        source += `
          window.streamProbe = { run(url) { return new Promise((resolve, reject) => {
            const frames=[],delays=[],apply=[],sequences=[];let previous=null;
            const observer=scene.onAfterRenderObservable.add(()=>{
              const now=performance.now();if(previous!==null)frames.push(now-previous);previous=now;
            });
            const stream=new EventSource(url);
            const timeout=setTimeout(()=>{stream.close();reject(new Error('Replay timeout'));},45000);
            stream.onmessage=e=>{
              const arrived=Date.now(), meta=JSON.parse(e.data);
              const start=performance.now();applyGameStreamMessage(e.data);
              if(meta.probeSeq>=20){delays.push(arrived-meta.probeSent);apply.push(performance.now()-start);}
              sequences.push(meta.probeSeq);
              if(meta.probeSeq===19){frames.length=0;previous=null;}
              if(meta.probeSeq===${count - 1}){
                stream.close();clearTimeout(timeout);scene.onAfterRenderObservable.remove(observer);
                const gl=engine._gl, debug=gl.getExtension('WEBGL_debug_renderer_info');
                resolve({frames,delays,apply,sequences,meshCount:scene.meshes.length,
                  renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)});
              }
            };
          }); }};
        `;
        return route.fulfill({ response, body: source });
      }
      assert.equal(url.origin, new URL(vite).origin, 'Unexpected external request');
      return route.continue();
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    let streamId, wireBytes = 0, encoding;
    cdp.on('Network.responseReceived', e => {
      if (e.response.url.startsWith(`http://127.0.0.1:${port}/`)) {
        streamId = e.requestId;
        encoding = e.response.headers['content-encoding'] ?? e.response.headers['Content-Encoding'];
      }
    });
    cdp.on('Network.dataReceived', e => { if (e.requestId === streamId) wireBytes += e.encodedDataLength; });
    await page.goto(`${vite}/sea-battle/?setup=8`);
    await page.waitForFunction(() => window.streamProbe);
    await page.waitForTimeout(4000);
    const measured = await page.evaluate(url => window.streamProbe.run(url), `http://127.0.0.1:${port}/events?gzip=${gzip}`);
    assert.deepEqual(measured.sequences, Array.from({ length: count }, (_, i) => i));
    assert.deepEqual(errors, []);
    assert.equal(encoding, gzip ? 'gzip' : 'identity');
    const summarize = values => {
      const sorted = [...values].sort((a,b)=>a-b);
      return { count: values.length, mean: values.reduce((a,b)=>a+b,0)/values.length,
        p95: sorted[Math.floor((sorted.length-1)*.95)], max: sorted.at(-1) };
    };
    const summary = { gzip, encoding, wireBytes, renderer: measured.renderer, meshCount: measured.meshCount,
      frames: summarize(measured.frames), framesOver50ms: measured.frames.filter(v=>v>50).length,
      delays: summarize(measured.delays), apply: summarize(measured.apply) };
    results.push({ summary, measured });
    await page.screenshot({ path: `${out}/run-${results.length}-${gzip ? 'gzip' : 'plain'}.png` });
    await writeFile(`${out}/results.json`, JSON.stringify(results,null,2));
    console.log(JSON.stringify(summary));
    await page.close();
  }
} finally {
  await browser?.close();
  netty.kill('SIGTERM');
  if (netty.exitCode === null) await new Promise(resolve => netty.once('exit', resolve));
}
