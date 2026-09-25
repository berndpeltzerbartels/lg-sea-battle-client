import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Characterization test: deliberately confirms the existing defect, not a fixed renderer.
test('straight bridge approach reproduces islands building upward at the far plane', async ({baseURL}, testInfo) => {
  test.setTimeout(180000);
  const output=testInfo.outputPath('straight-approach');
  await promisify(execFile)(process.execPath,['scripts/diagnose-island-appearance.mjs',output],{
    cwd:fileURLToPath(new URL('../../',import.meta.url)),
    env:{...process.env,SEA_BATTLE_BASE_URL:baseURL,APPEARANCE_SCENARIO:'straight',ISLAND_DISTANCE:'4800'},
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
