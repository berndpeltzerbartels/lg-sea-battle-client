import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Opt-in image authoring, isolated by scripts/run-e2e-temp.mjs.
// SEA_BATTLE_MANUAL_CAPTURE_DIR=<absolute client/public/handbuch/images path> \
//   node scripts/run-e2e-temp.mjs tests/e2e/manual-images.capture.spec.js
// Then: python3 scripts/illustrate-handbook.py
// Fixtures use fictional people and never send messages or alter a live round.
const output = process.env.SEA_BATTLE_MANUAL_CAPTURE_DIR;
test.use({ deviceScaleFactor: 2 });
test.skip(!output, 'Manual image capture is opt-in');
test('capture reproducible handbook views', async ({ page }) => {
  test.setTimeout(360000);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output,'capture-info.json'),JSON.stringify({deviceScaleFactor:2,viewport:{width:1600,height:1000}}));
  page.on('pageerror', e=>console.log('PAGE ERROR',e.message));
  page.on('console', m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text());});
  await page.setViewportSize({ width: 1600, height: 1000 });
  const playerId = 'player-LEA-handbook';
  const ship = (id, teamId, x, z, vehicleType = 'torpedo-boat', more = {}) => ({
    id, teamId, x, z, y: 0, heading: 0, speed: 0, state: 'active', vehicleType,
    controlledBy: 'bot', engineOrder: 2, rudderDegrees: 0, turnVelocity: 0,
    flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0,
    depthState: 'surface', ...more
  });
  const crew = { id: 'manual', shipId: 'light-S1', controller: playerId, station: 'bridge', revision: 1,
    members: [{ playerId, name: 'Lea', station: 'bridge' }, { playerId: 'player-FINN-handbook', name: 'Finn', station: 'flak' }], aimRequests: [], lookoutReset: 0 };
  let type = 'torpedo-boat', scenic = true;
  const state = { type: 'state', instanceId: 'handbook', sessionId: 'handbook', state: 'running', t: 0,
    ships: [], torpedoes: [], torpedoImpacts: [], bombs: [], bombImpacts: [], flakProjectiles: [], weaponShots: [],
    flakHits: [], flakImpacts: [], ramHits: [], depthCharges: [], depthChargeControls: {},
    killsByPlayer: { [playerId]: 3, 'player-MARA-handbook': 2 }, destroyedShipsByTeam: {} };
  const seed = () => {
    state.ships = [ship('light-S1','light',0,0,type,{controlledBy:playerId}),
      ship('light-S2','light',-600,550,'torpedo-boat',{controlledBy:'player-MARA-handbook',heading:.7}),
      ship('dark-S1','dark',650,700,'torpedo-boat',{heading:-1.15}),
      ship('dark-U1','dark',-300,800,'submarine',{heading:2}),
      ship('dark-U2','dark',85,145,'submarine',{y:-19,depthState:'submerged',heading:2.4}),
      ship('dark-F1','dark',800,450,'scout-plane',{y:70,heading:3.5})];
    if(!scenic){state.ships[2].x=0;state.ships[2].z=130;state.ships[2].heading=Math.PI/2;}
    state.torpedoes = [{id:'demo-torpedo',shipId:'dark-S1',teamId:'dark',x:700,z:-500,y:.05,heading:Math.PI,
      state:'running',speed:25,firedAt:0,maxRange:1200,tubeSide:0}];
  };
  await page.exposeFunction('__manualSnapshot',()=>({type:'game-stream',state,crew:type==='torpedo-boat'?crew:null}));
  await page.addInitScript(() => {
    localStorage.setItem('accountId','handbook');
    window.EventSource = class {
      constructor() { if(new URLSearchParams(location.search).has('sandbox'))return; this.timer=setInterval(async()=>{const message=await window.__manualSnapshot();this.onopen?.({});this.onmessage?.({data:JSON.stringify(message)});},200); }
      close() { clearInterval(this.timer); }
    };
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({body:''}));
  await page.route('**/game/**', async route => {
    const url = new URL(route.request().url()), p=url.pathname;
    if(p.endsWith('/world')&&!scenic)return route.fulfill({json:{landmasses:[],instrumentMap:{version:1,layers:[0,50,150].map(height=>({height,contours:[]}))}}});
    if (p.endsWith('/world') || p.endsWith('/config') || p.includes('/debug/')) return route.fulfill({response:await route.fetch({url:url.origin+p.replace(/^\/sea-battle/,'')})});
    if(/\/(player-state|motion|aim)$/.test(p) && route.request().method()==='POST') Object.assign(state.ships[0],route.request().postDataJSON().motion ?? route.request().postDataJSON());
    let body = state;
    if(p.includes('/session/')) body={playerId,initials:'LEA',teamId:'light'};
    else if(p.endsWith('/station')) {crew.station=route.request().postDataJSON().station;crew.members[0].station=crew.station;crew.revision++;body=crew;}
    else if(p.includes('/crew/')&&!/\/(player-state|motion|aim)$/.test(p)) body=crew;
    await route.fulfill({json:body});
  });
  const save = async (name, selector) => {
    await page.waitForTimeout(350);
    const target=selector ? page.locator(selector) : page;
    console.log('saving',name);
    await expect(page.locator('body')).not.toContainText(/Schiffsposition nicht best(?:ätigt|aetigt)|Steuerung und Waffen pausiert|Spielstart fehlgeschlagen/i);
    const health=await page.evaluate(()=>window.seaBattleScenarioTest.motionSyncForTest());
    expect(health.blocked,JSON.stringify(health)).toBe(false);
    const boxes={};
    for(const selector of ['.nav-instrument-map','.nav-instrument-radar','.battle-station-panel','.player-list','.ship-controls-panel','#roleHotkeys']){const el=page.locator(selector);if(await el.count()&&await el.isVisible())boxes[selector]=await el.boundingBox();}
    if(['map-players','boat-help','boat-lookout-help','sub-help'].includes(name))await writeFile(path.join(output,name+'-layout.json'),JSON.stringify(boxes,null,2));
    await target.screenshot({path:path.join(output,name+'.png'), animations:'disabled'});
  };
  const open = async (vehicle, initialStation='bridge') => {
    type=vehicle;crew.station=initialStation;crew.members[0].station=initialStation;seed();
    console.log('opening',vehicle);
    await page.goto(`/sea-battle/index.html?vehicle=${vehicle}&scenarioTest=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.seaBattleScenarioTest,null,{timeout:15000}).catch(async e=>{console.log('STARTUP',await page.locator('body').innerText());await page.screenshot({path:path.join(output,'diagnostic.png')});throw e;});
    await page.addStyleTag({content:'.version-panel{visibility:hidden!important}'});
    console.log('ready',vehicle);
    await page.waitForTimeout(1600);
    await page.waitForFunction(()=>!window.seaBattleScenarioTest.motionSyncForTest().blocked,null,{timeout:10000});
  };
  const station = async name => {
    await open('torpedo-boat',name);
    await expect(page.locator('body')).toHaveAttribute(name==='lookout'?'data-lookout-view':'data-crew-station',name==='lookout'?'active':name);
  };
  if (process.env.SEA_BATTLE_MANUAL_DEEP_ONLY === '1') {
    scenic = false;
    await open('submarine');
    state.ships[2].x = -40; state.ships[2].z = 100;
    state.ships[4].x = 0; state.ships[4].z = 110; state.ships[4].heading = Math.PI / 2;
    await page.evaluate(()=>window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
    await page.waitForFunction(()=>{
      const s=window.seaBattleScenarioTest.submarineDiveSequenceSnapshot();
      return s.depthState==='submerged' && Math.abs(s.depthOffset-s.targetDepthOffset)<.03;
    },null,{timeout:40000});
    await save('sub-deep');
    return;
  }
  await open('torpedo-boat');
  await save('boat-bridge');
  await save('radar-surface','.nav-instrument-radar');
  await save('map-players');
  await save('boat-stations','.battle-station-panel');
  await page.keyboard.press('h'); await save('boat-help'); await page.keyboard.press('h');
  scenic=false;
  await station('lookout');await page.keyboard.press('h');await save('boat-lookout-help');await page.keyboard.press('h');await page.keyboard.press('z');await save('boat-lookout');
  // Independent view of the real boat geometry, not a doctored combat screenshot.
  await page.unroute('**/game/**');
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&viewMode=orbit&viewDistance=32&viewHeight=1.7&viewYaw=95');
  await page.waitForFunction(()=>window.seaBattleScenarioTest);await page.waitForTimeout(800);
  await expect(page.locator('body')).not.toHaveAttribute('data-lookout-view','active');
  await page.evaluate(()=>{const c=document.querySelector('#renderCanvas');for(const el of document.querySelectorAll('body *'))if(el!==c&&!el.contains(c))el.style.visibility='hidden';c.style.visibility='visible';});
  await save('boat-side-canvas','#renderCanvas');
  // Reinstall the read-only scene fixture after leaving the isolated side view.
  await page.route('**/game/**', async route => {
    const p=new URL(route.request().url()).pathname;
    if(p.endsWith('/world')||p.endsWith('/config')||p.includes('/debug/'))return route.fulfill({response:await route.fetch({url:new URL(route.request().url()).origin+p.replace(/^\/sea-battle/,'')})});
    if(/\/(player-state|motion|aim)$/.test(p) && route.request().method()==='POST') Object.assign(state.ships[0],route.request().postDataJSON().motion ?? route.request().postDataJSON());
    await route.fulfill({json:p.includes('/session/')?{playerId,initials:'LEA',teamId:'light'}:state});
  });
  scenic=true;
  await open('submarine');await save('sub-bridge');
  await page.evaluate(()=>window.seaBattleScenarioTest.setSubmarineDepthState('periscope'));
  await page.waitForFunction(()=>Math.abs(window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().depthOffset+1.6)<.04,{timeout:20000});
  await page.keyboard.press('1');await save('sub-forward');
  await page.keyboard.press('2');await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().observationYawDeg>28,null,{timeout:15000});await page.keyboard.up('ArrowRight');await save('sub-observation');
  await page.keyboard.press('3');await save('sub-aligning');
  await page.keyboard.press('h');await save('sub-help');await page.keyboard.press('h');
  await page.evaluate(()=>window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  await page.waitForFunction(()=>window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().depthOffset < -6,{timeout:20000});
  await save('sub-sonar','.nav-instrument-radar');
});
