import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Keep an explicit legacy-color control to demonstrate the original defect.
test('straight bridge approach reproduces islands building upward at the far plane', async ({baseURL}, testInfo) => {
  test.setTimeout(180000);
  const output=testInfo.outputPath('straight-approach');
  await promisify(execFile)(process.execPath,['scripts/diagnose-island-appearance.mjs',output],{
    cwd:fileURLToPath(new URL('../../',import.meta.url)),
    env:{...process.env,SEA_BATTLE_BASE_URL:baseURL,APPEARANCE_SCENARIO:'straight',ISLAND_DISTANCE:'4800',ISLAND_FOG_PROFILE:'legacy'},
    timeout:170000,maxBuffer:1024*1024
  });
  const report=JSON.parse(await readFile(`${output}/measurements.json`,'utf8'));
  await testInfo.attach('camera-and-pixel-measurements',{path:`${output}/measurements.json`,contentType:'application/json'});
  const normal=report.scenarios.exp2;
  const control=report.scenarios['exp2-long-clip'];
  const first=[];
  for(let island=0;island<2;island++){
    expect(normal[0].islands[island].pixels).toBe(0);
    expect(control.every(row=>row.islands[island].pixels>100)).toBeTruthy();
    const index=normal.findIndex(row=>row.islands[island].pixels>10);
    expect(index).toBeGreaterThan(0);
    first.push(index);
    const entering=normal[index].islands[island];
    const complete=control[index].islands[island];
    // Only a low strip appears, rather than a complete faint silhouette.
    expect(entering.height/complete.height).toBeLessThan(0.35);
    expect(Math.abs(entering.maxY-complete.maxY)).toBeLessThanOrEqual(3);
    const last=normal.at(-1).islands[island];
    expect(last.height/control.at(-1).islands[island].height).toBeGreaterThan(0.95);
    expect(normal[index].heading).toBe(0);
    expect(normal[index].far).toBe(4200);
  }
  expect(first[1]).toBeGreaterThan(first[0]);
  const nearWhenFarAppears=normal[first[1]].islands[0];
  expect(nearWhenFarAppears.height/control[first[1]].islands[0].height).toBeGreaterThan(0.8);
  for(const frame of [first[0],first[1]]){
    const capture=Math.floor(frame/5)*5;
    await testInfo.attach(`approach-${capture}`,{path:`${output}/exp2-${String(capture).padStart(2,'0')}.png`,contentType:'image/png'});
  }
});

test('production fog hides clipping without increasing the bridge sight limit', async ({baseURL}, testInfo) => {
  test.setTimeout(180000);
  const output=testInfo.outputPath('fade-approach');
  await promisify(execFile)(process.execPath,['scripts/diagnose-island-appearance.mjs',output],{
    cwd:fileURLToPath(new URL('../../',import.meta.url)),
    env:{...process.env,SEA_BATTLE_BASE_URL:baseURL,APPEARANCE_SCENARIO:'fade',ISLAND_DISTANCE:'4800',ISLAND_FOG_PROFILE:'production'},
    timeout:170000,maxBuffer:1024*1024
  });
  const report=JSON.parse(await readFile(`${output}/measurements.json`,'utf8'));
  await testInfo.attach('fade-measurements',{path:`${output}/measurements.json`,contentType:'application/json'});
  const normal=report.scenarios.exp2;
  const control=report.scenarios['exp2-long-clip'];
  for(let island=0;island<2;island++){
    expect(normal[0].islands[island].pixels).toBe(0);
    expect(normal.some(row=>row.islands[island].pixels>100)).toBeTruthy();
    for(let frame=0;frame<normal.length;frame++){
      const a=normal[frame].islands[island], b=control[frame].islands[island];
      expect(normal[frame].far).toBe(4200);
      expect(control[frame].far).toBe(12000);
      expect(Math.abs(a.pixels-b.pixels)).toBeLessThanOrEqual(Math.max(5,b.pixels*0.001));
      expect(Math.abs(a.height-b.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(a.minY-b.minY)).toBeLessThanOrEqual(1);
      expect(Math.abs(a.maxY-b.maxY)).toBeLessThanOrEqual(1);
    }
  }
  await testInfo.attach('visible-nearby-islands',{path:`${output}/exp2-50.png`,contentType:'image/png'});
});
