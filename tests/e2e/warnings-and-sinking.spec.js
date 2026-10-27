import { test, expect } from '@playwright/test';
import path from 'node:path';
test.use({ deviceScaleFactor: 2 });

async function mockGame(page, vehicle) {
  const player='player-CAP-test';
  const ship={id:'own',teamId:'light',x:0,z:0,y:vehicle==='submarine'?-.78:0,heading:0,speed:0,turnVelocity:0,
    rudderDegrees:0,engineOrder:2,state:'active',controlledBy:player,vehicleType:vehicle,torpedoesRemaining:12,
    flakYaw:Math.PI,flakPitch:0,cannonYaw:0,cannonPitch:0,depthState:'surface'};
  const state={type:'state',sessionId:'warning-test',instanceId:'warning-test',state:'running',t:0,ships:[ship],
    torpedoes:[],torpedoImpacts:[],bombs:[],bombImpacts:[],flakProjectiles:[],weaponShots:[],flakHits:[],flakImpacts:[],
    ramHits:[],depthCharges:[],depthChargeControls:{},killsByPlayer:{},destroyedShipsByTeam:{}};
  await page.addInitScript(()=>{
    localStorage.setItem('accountId','test');localStorage.setItem('engineSoundMuted','false');
    window.EventSource=class{constructor(){window.testStream=this;setTimeout(()=>this.onopen?.(),50)}close(){}};
  });
  await page.route('**/game/**',async route=>{
    const url=new URL(route.request().url()).pathname;let body={};
    if(url.includes('/session/'))body={playerId:player,initials:'CAP',teamId:'light'};
    else if(url.endsWith('/world'))body={landmasses:[],instrumentMap:{version:1,layers:[0,50,150].map(height=>({height,contours:[]}))}};
    else if(url.includes('/crew/'))body=null;
    else if(url.endsWith('/state')||url.endsWith('/player-state'))body=state;
    await route.fulfill({json:body});
  });
  await page.route('**/crew-inbox.html',route=>route.fulfill({body:''}));
  await page.goto(`/app?vehicle=${vehicle}&scenarioTest=1`);
  await page.waitForFunction(()=>window.seaBattleScenarioTest&&window.testStream);
  return state;
}

for(const vehicle of ['torpedo-boat','submarine'])test(`${vehicle} receives both automatic warnings without crew or station requirements`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1600,height:1000});
  const state=await mockGame(page,vehicle);
  const send=()=>page.evaluate(state=>window.testStream.onmessage({data:JSON.stringify({type:'game-stream',state})}),state);
  const output=page.locator('#crewSubmarineWarning');
  state.periscopeWarnings={own:{id:'sub-1',direction:'Steuerbord voraus',count:1,expiresAt:6}};
  await send();await expect(output).toContainText('Sehrohr gesichtet · Steuerbord voraus');
  if(vehicle==='submarine'&&process.env.SEA_BATTLE_WARNING_CAPTURE_DIR)
    await output.screenshot({path:path.join(process.env.SEA_BATTLE_WARNING_CAPTURE_DIR,'warning-periscope.png')});
  delete state.periscopeWarnings;
  state.aircraftWarnings={own:{id:'air-1',direction:'Backbord voraus',count:1,expiresAt:6}};
  await send();await expect(output).toContainText('Flugzeug greift an · Backbord voraus');
  if(vehicle==='submarine'&&process.env.SEA_BATTLE_WARNING_CAPTURE_DIR)
    await output.screenshot({path:path.join(process.env.SEA_BATTLE_WARNING_CAPTURE_DIR,'warning-aircraft.png')});
  expect(errors).toEqual([]);
});

test('sinking surface ship gains underwater acoustics and one quiet water voice, then recovers',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('engineSoundMuted','false'));
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(()=>window.seaBattleScenarioTest);
  await page.locator('#renderCanvas').click({position:{x:400,y:300}});
  await expect.poll(()=>page.evaluate(()=>window.seaBattleScenarioTest.engineAudioForTest()?.loaded)).toBe(true);
  await page.evaluate(()=>window.seaBattleScenarioTest.sinkingAudioForTest(14));
  await expect.poll(()=>page.evaluate(()=>window.seaBattleScenarioTest.sinkingAudioForTest().underwater)).toBe(true);
  const submerged=await page.evaluate(()=>window.seaBattleScenarioTest.sinkingAudioForTest());
  expect(submerged.cameraY).toBeLessThan(0);
  expect(submerged.deepSubmerged).toBe(true);
  expect(submerged.waterSound).toEqual({active:true,voices:1});
  await page.locator('#engineSoundToggle').click();
  await expect.poll(()=>page.evaluate(()=>window.seaBattleScenarioTest.sinkingAudioForTest().waterSound.active)).toBe(false);
  await page.evaluate(()=>window.seaBattleScenarioTest.respawnPlayerForTest());
  await expect.poll(()=>page.evaluate(()=>window.seaBattleScenarioTest.sinkingAudioForTest().underwater)).toBe(false);
  expect(errors).toEqual([]);
});

test('both handbooks explain and illustrate automatic warnings on desktop and mobile',async({page})=>{
  for(const width of [1500,390]){
    await page.setViewportSize({width,height:1000});
    for(const vehicle of ['torpedoboot','u-boot']){
      await page.goto(`/sea-battle/handbuch/${vehicle}/orientierung.html#warnungen`);
      const section=page.locator('#warnungen');
      await expect(section).toContainText('befreundetes U-Boot');
      await expect(section).toContainText('kein sicherer Freundnachweis');
      await expect(section).toContainText('Flugzeug greift an');
      await expect(section.locator('img')).toHaveCount(2);
      await expect.poll(()=>section.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    }
  }
});
