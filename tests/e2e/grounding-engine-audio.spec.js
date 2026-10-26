import {test,expect} from '@playwright/test';

test('grounded diesel audio initializes once and releases back to idle',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(()=>window.seaBattleScenarioTest);
  await page.locator('#renderCanvas').click({position:{x:400,y:300}});
  await expect.poll(()=>page.evaluate(()=>window.seaBattleScenarioTest.engineAudioForTest()?.loaded)).toBe(true);
  const voices=await page.evaluate(()=>window.seaBattleScenarioTest.engineAudioForTest().voices);
  for(let i=0;i<3;i++){
    const strained=await page.evaluate(()=>window.seaBattleScenarioTest.engineAudioForTest({depth:0,power:1,submarine:false,grounded:true}));
    expect(strained.strained).toBe(true);
    expect(strained.voices).toBe(voices);
    await page.waitForTimeout(150);
    const idle=await page.evaluate(()=>window.seaBattleScenarioTest.engineAudioForTest({depth:0,power:0,submarine:false,grounded:true}));
    expect(idle.strained).toBe(false);
    expect(idle.surfaceRate).toBe(.66);
    expect(idle.voices).toBe(voices);
  }
  expect(errors).toEqual([]);
});
