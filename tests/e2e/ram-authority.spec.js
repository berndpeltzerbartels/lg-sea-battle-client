import { test, expect } from '@playwright/test';

test('server ram stops the bridge once and does not repeat when snapshots repeat', async ({ page }) => {
  const ship = { id: 'boat', controlledBy: 'player-CAP-test', teamId: 'light', vehicleType: 'torpedo-boat',
    x: 0, y: 0, z: 0, heading: 0, speed: 8, engineOrder: 7, rudderDegrees: 0, turnVelocity: 0,
    state: 'active', depthState: 'surface', torpedoesRemaining: 12, flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0 };
  const state = { instanceId: 'ram-test', sessionId: 'ram-test', state: 'running', t: 0, ships: [ship],
    ramHits: [], torpedoes: [], torpedoImpacts: [], flakHits: [], flakProjectiles: [], flakImpacts: [],
    bombs: [], bombImpacts: [], depthCharges: [], weaponShots: [], killsByPlayer: {}, destroyedShipsByTeam: {} };
  await page.addInitScript(() => {
    localStorage.setItem('accountId', 'test');
    window.EventSource = class {
      constructor() { window.testStream = this; setTimeout(() => this.onopen?.(), 50); }
      close() {}
    };
  });
  await page.route('**/game/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.includes('/session/')) body = { playerId: 'player-CAP-test', initials: 'CAP', teamId: 'light' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.endsWith('/state')) body = state;
    else if (path.includes('/crew/')) body = { id: 'crew', shipId: 'boat', controller: 'player-CAP-test', station: 'bridge', revision: 1,
      members: [{ playerId: 'player-CAP-test', name: 'Captain', station: 'bridge', revision: 1 }], aimRequests: [], lookoutReset: 0 };
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
  await page.waitForFunction(() => window.testStream?.onmessage && window.seaBattleScenarioTest);
  const send = () => page.evaluate(state => window.testStream.onmessage({ data: JSON.stringify({ type: 'game-stream', state }) }), state);
  await send();
  state.ramHits = [{ id: 'ram-1', shipId: 'boat', targetShipId: 'victim', teamId: 'light', x: 0, z: 10, t: 1 }];
  state.t = 1;
  ship.speed = 0;
  ship.engineOrder = 2;
  await send();
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().engineOrder)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().speed)).toBe(0);
  ship.speed = 4; ship.engineOrder = 5; // The server acknowledges the new bridge order.
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ speed: 4, engineOrder: 5 }));
  await send();
  expect(await page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().engineOrder)).toBe(5);
});

test('wreck collision gets its own kill-feed type', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(()=>window.seaBattleScenarioTest);
  const own={id:'own',teamId:'light',vehicleType:'torpedo-boat',controlledBy:'player',state:'active'};
  const victim={id:'victim',teamId:'dark',vehicleType:'submarine',controlledBy:'bot',state:'sunk'};
  await page.evaluate(({own,victim})=>window.seaBattleScenarioTest.crewKillSnapshot({t:2,ships:[own,victim],ramHits:[
    {id:'wreck-kill',teamId:'light',shipId:'own',targetShipId:'victim',x:0,z:0,t:2,reason:'wreck-collision'}]},'own'),{own,victim});
  await expect(page.locator('#killFeedRows')).toContainText('Sinkendes Schiff');
  await expect(page.locator('#killFeedRows')).not.toContainText('Rammen');
  expect(errors).toEqual([]);
});

test('a late-joined wreck coasts and sinks at the server-defined pose', async ({page})=>{
 const own={id:'own',teamId:'light',controlledBy:'player-CAP-test',vehicleType:'torpedo-boat',state:'active',x:0,y:0,z:0,heading:0,speed:0,engineOrder:2,rudderDegrees:0,turnVelocity:0,torpedoesRemaining:12,depthState:'surface',flakYaw:0,flakPitch:0,cannonYaw:0,cannonPitch:0,lifeId:0};
 const dead={...own,id:'enemy',teamId:'dark',controlledBy:'bot',z:35,speed:17.5};
 const state={instanceId:'wreck-pose',sessionId:'wreck-pose',state:'running',t:5,ships:[own,{...dead,lifeId:1,x:1000}],wrecks:[{id:'moving-wreck',sunkAt:0,ship:dead,driftDrag:.35,sinkDepth:39.05,sinkSeconds:19,sinkSide:1}],ramHits:[],torpedoes:[],torpedoImpacts:[],flakHits:[],flakProjectiles:[],flakImpacts:[],bombs:[],bombImpacts:[],depthCharges:[],weaponShots:[],killsByPlayer:{},destroyedShipsByTeam:{}};
 await page.addInitScript(()=>{localStorage.setItem('accountId','test');window.EventSource=class{constructor(){window.testStream=this;setTimeout(()=>this.onopen?.(),50);}close(){}};});
 await page.route('**/game/**',async route=>{
  const path=new URL(route.request().url()).pathname;let body={};
  if(path.includes('/session/'))body={playerId:own.controlledBy,initials:'CAP',teamId:'light'};
  else if(path.endsWith('/world'))body={landmasses:[],instrumentMap:{version:1,layers:[0,50,150].map(height=>({height,contours:[]}))}};
  else if(path.includes('/crew/'))body=null;
  else if(path.endsWith('/state')||path.endsWith('/player-state'))body=state;
  await route.fulfill({json:body});
 });
 await page.route('**/crew-inbox.html',route=>route.fulfill({body:''}));
 await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
 await page.waitForFunction(()=>window.seaBattleScenarioTest&&window.testStream?.onmessage);
 await page.evaluate(state=>window.testStream.onmessage({data:JSON.stringify({type:'game-stream',state})}),state);
 await expect.poll(()=>page.evaluate(()=>window.seaBattleScenarioTest.wrecksForTest().length)).toBe(1);
 await page.waitForTimeout(300);
 const w=await page.evaluate(()=>window.seaBattleScenarioTest.wrecksForTest()[0]);
 const t=w.age/19,ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 expect(w.position.z).toBeCloseTo(35+17.5*(1-Math.exp(-.35*w.age))/.35,2);
 expect(w.position.y).toBeCloseTo(-.6-ease*39.05,2);
 await page.screenshot({path:'/tmp/seabattle-physical-wreck.png'});
});
