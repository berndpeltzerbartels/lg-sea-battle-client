import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const remote = 'http://159.195.63.236';
const cwd = new URL('..', import.meta.url).pathname;
const output = `${cwd}/test-artifacts/live-profile-${Date.now()}`;
await mkdir(output, { recursive: true });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5186', '--strictPort'],
  { cwd, env: { ...process.env, SEA_BATTLE_API_URL: remote }, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser, load, playerId;
const runs = [];
const accountId = `profile-${randomUUID()}`;
try {
  for (let i = 0; i < 40; i++) {
    if (await fetch('http://127.0.0.1:5186/app').then(r => r.ok).catch(() => false)) break;
    await sleep(250);
  }
  const registration = await fetch(`${remote}/game/start`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountId, alias: `P${randomUUID().slice(0,4)}`, nickname: 'Profiler', team: 'light', vehicleType: 'torpedo-boat' }) });
  const login = await registration.json();
  playerId = login.player.playerId;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('crash', () => errors.push('PAGE CRASH'));
  await page.addInitScript(({ accountId }) => {
    localStorage.setItem('accountId', accountId);
    const p = window.__perf = { json: [], stream: [], frames: [], tasks: [], calls: {}, sizes: [], counts: [] };
    const parse = JSON.parse;
    JSON.parse = function(text, ...args) {
      const start = performance.now();
      const result = parse.call(JSON, text, ...args);
      if (typeof text === 'string' && text.length > 1000) p.json.push({ ms: performance.now()-start, bytes: text.length });
      if (result?.type === 'game-stream') {
        p.sizes.push(text.length);
        p.counts.push({ projectiles: result.state.flakProjectiles?.length ?? 0, shots: result.state.weaponShots?.length ?? 0,
          torpedoes: result.state.torpedoes?.length ?? 0 });
      }
      return result;
    };
    const ES = window.EventSource;
    window.EventSource = class extends ES {
      set onmessage(handler) {
        super.onmessage = event => { const start = performance.now(); try { handler(event); } finally { p.stream.push(performance.now()-start); } };
      }
    };
    let last = 0;
    const frame = now => { if(last) p.frames.push(now-last); last=now; requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
    new PerformanceObserver(list => { for (const e of list.getEntries()) p.tasks.push(e.duration); }).observe({ type: 'longtask', buffered: true });
  }, { accountId });
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    const body = await response.text();
    const names = ['applyServerGameSnapshot','syncServerFlakProjectiles','syncServerTorpedoes',
      'createRemoteMuzzleEffectForProjectile','createFlakProjectile','updatePlayerList','updateKillFeedFromSnapshot'];
    const instrumentation = names.map(name => `{
      const original = ${name}; ${name} = function(...args) { const start=performance.now();
        try { return original(...args); } finally { (window.__perf.calls['${name}'] ??= []).push(performance.now()-start); } };
    }`).join('\n');
    await route.fulfill({ response, body: body + '\n' + instrumentation + `
      const originalRender=scene.render.bind(scene);
      scene.render=function(...args){const start=performance.now();try{return originalRender(...args);}finally{(window.__perf.calls.render??=[]).push(performance.now()-start);}};
      window.__sceneStats=()=>({ meshes:scene.meshes.length, lights:scene.lights.length, materials:scene.materials.length,
        activeMeshes:scene.getActiveMeshes().length, fps:engine.getFps(), heap:performance.memory?.usedJSHeapSize,
        renderer:engine.getGlInfo(), flak:flakSystem.serverVisuals.size, cannon:cannonSystem.serverVisuals.size });
    ` });
  });
  await page.goto('http://127.0.0.1:5186/app?vehicle=torpedo-boat', { timeout: 60000 });
  await page.waitForFunction(() => !!window.__sceneStats, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Performance.enable');
  await sleep(5000);
  for (const phase of ['baseline', 'no-flak', 'flak']) {
    if (phase !== 'baseline') {
      load = spawn(process.execPath, ['scripts/human-player-load-test.mjs', '--base', remote, '--clients', '6', '--duration', '38',
        ...(phase === 'no-flak' ? ['--no-flak'] : [])], { cwd: `${cwd}/../server`, stdio: ['ignore','pipe','pipe'] });
      let log = '';
      load.stdout.on('data', chunk => { log += chunk; });
      load.stderr.on('data', chunk => { log += chunk; });
      load.done = new Promise(resolve => load.on('exit', resolve));
      load.log = () => log;
      for(let i=0;i<60 && !log.includes('READY:') && load.exitCode===null;i++) await sleep(500);
      if(!log.includes('READY:')) throw Error(`Load startup failed: ${log}`);
    }
    await page.evaluate(() => { const p=window.__perf; for(const key of ['json','stream','frames','tasks','sizes','counts']) p[key]=[]; p.calls={}; });
    const before = await page.evaluate(() => window.__sceneStats());
    await cdp.send('Profiler.start');
    console.log(`MEASURING ${phase}`);
    await sleep(phase === 'baseline' ? 15000 : 32000);
    const { profile } = await cdp.send('Profiler.stop');
    const data = await page.evaluate(() => ({ perf: window.__perf, scene: window.__sceneStats() }));
    const metrics = await cdp.send('Performance.getMetrics');
    await writeFile(`${output}/${phase}.cpuprofile`, JSON.stringify(profile));
    await writeFile(`${output}/${phase}.json`, JSON.stringify({ before, ...data, metrics, errors }));
    const summarize = values => ({ n:values.length, avg:values.reduce((a,b)=>a+b,0)/(values.length||1),
      max:Math.max(0,...values), p95:[...values].sort((a,b)=>a-b)[Math.floor(values.length*.95)] ?? 0 });
    const summary = { phase, before, scene:data.scene, json:summarize(data.perf.json.map(x=>x.ms)),
      jsonSize:summarize(data.perf.sizes), stream:summarize(data.perf.stream), frames:summarize(data.perf.frames),
      longTasks:summarize(data.perf.tasks), calls:Object.fromEntries(Object.entries(data.perf.calls).map(([k,v])=>[k,summarize(v)])) };
    runs.push(summary);
    console.log(JSON.stringify(summary));
    await page.screenshot({ path: `${output}/${phase}.png`, timeout: 15000 }).catch(e=>errors.push(String(e)));
    if (load) { load.kill('SIGINT'); await load.done; await writeFile(`${output}/${phase}-load.txt`, load.log()); load=null; }
    if (data.scene.heap > 1_200_000_000 || summary.frames.p95 > 1500) { console.log('Safety stop: browser saturated'); break; }
    await sleep(15000);
  }
} finally {
  if(load) { load.kill('SIGINT'); await load.done; }
  await browser?.close();
  if(playerId) await fetch(`${remote}/game/crew/leave`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({playerId}) });
  vite.kill('SIGTERM');
  await writeFile(`${output}/summary.json`, JSON.stringify(runs,null,2));
  console.log(`RESULTS ${output}`);
}
