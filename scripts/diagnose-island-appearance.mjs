// Isolated browser-only replay. No live game state or production rendering is changed.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.SEA_BATTLE_BASE_URL ?? 'http://127.0.0.1:5182';
const out = process.argv[2] ?? '/tmp/island-appearance';
await mkdir(out, {recursive:true});
const distance = Number(process.env.ISLAND_DISTANCE ?? 4800);
const straight = process.env.APPEARANCE_SCENARIO === 'straight';
const island = {
  name:'appearance-probe',kind:'island',x:0,z:distance,radius:300,rx:300,rz:300,
  seaFloorHeight:-80,baseHeight:0,material:'grass',
  polygon:Array.from({length:24},(_,i)=>({x:300*Math.cos(i*Math.PI/12),z:distance+300*Math.sin(i*Math.PI/12)})),
  heightPoints:[{x:0,z:distance,h:300}]
};
const islands = straight ? [-400,400].map((x,i)=>({
  ...island,name:`appearance-probe-${i}`,x,z:distance+i*250,
  polygon:island.polygon.map(p=>({...p,x:p.x+x,z:p.z+i*250})),
  heightPoints:island.heightPoints.map(p=>({...p,x:p.x+x,z:p.z+i*250}))
})) : [island];
const world = {landmasses:islands,mapObjects:[],instrumentMap:{version:1,layers:[0,50,150].map(height=>({height,contours:[]}))}};
const browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1200,height:800}});
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.route('**/src/main.js*',async route=>{
    const response=await route.fetch();
    let source=await response.text();
    const emptyWorld=/return \{ landmasses: \[\], mapObjects: \[\], instrumentMap:[^\n]+/;
    assert.match(source,emptyWorld);
    source=source.replace(emptyWorld,`return ${JSON.stringify(world)};`);
    const sandbox='const sideViewSandboxMode = directSideViewSandboxRequested || gameState.sessionId === "side-view-sandbox";';
    assert.ok(source.includes(sandbox));
    // Keep isolated data/network behavior, but exercise the normal bridge camera and lighting.
    source=source.replace(sandbox,'const sideViewSandboxMode = false;');
    source+=`
      engine.stopRenderLoop();
      engine.getDeltaTime=()=>0;
      let probeMode=2, probeFar=null;
      scene.onBeforeRenderObservable.add(()=>{
        scene.fogMode=probeMode;
        scene.fogStart=0; scene.fogEnd=2200;
        if(probeFar) camera.maxZ=probeFar;
      });
      const probeMeshes=scene.meshes.filter(m=>m.name.startsWith('appearance-probe'));
      const copy=document.createElement('canvas');
      copy.width=engine.getRenderWidth();copy.height=engine.getRenderHeight();
      const ctx=copy.getContext('2d',{willReadFrequently:true});
      function probePixels(){ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,copy.width,copy.height).data;}
      function measure(visible,background){
        let pixels=0,minY=copy.height,maxY=-1;
        for(let i=0;i<visible.length;i+=4){
          if(Math.max(Math.abs(visible[i]-background[i]),Math.abs(visible[i+1]-background[i+1]),Math.abs(visible[i+2]-background[i+2]))>2){
            pixels++;const y=Math.floor(i/4/copy.width);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
          }
        }
        return {pixels,minY,maxY,height:pixels ? maxY-minY+1 : 0};
      }
      window.appearanceProbe={
        step(pose,mode,far){
          probeMode=mode;probeFar=far;
          heading=pose.heading;speed=0;engineOrder=0;rudderDegrees=0;turnVelocity=0;
          boat.root.position.x=pose.x;boat.root.position.z=pose.z;
          scene.render();
          const visible=probePixels();
          const enabled=probeMeshes.map(m=>m.isVisible);
          probeMeshes.forEach(m=>m.isVisible=false);scene.render();
          const background=probePixels();
          probeMeshes.forEach((m,i)=>m.isVisible=enabled[i]);scene.render();
          const perIsland=[];
          for(const land of ${JSON.stringify(islands)}){
            const meshes=probeMeshes.filter(m=>m.name.startsWith(land.name+'_'));
            const visibility=meshes.map(m=>m.isVisible);
            meshes.forEach(m=>m.isVisible=false);scene.render();
            const without=probePixels();
            meshes.forEach((m,i)=>m.isVisible=visibility[i]);scene.render();
            perIsland.push({name:land.name,...measure(visible,without)});
          }
          const view=camera.getViewMatrix();
          const base=Vector3.TransformCoordinates(new Vector3(0,0,${distance}),view);
          const peak=Vector3.TransformCoordinates(new Vector3(0,300,${distance}),view);
          return {...measure(visible,background),islands:perIsland,camera:camera.position.asArray(),far:camera.maxZ,fov:camera.fov,
            fog:scene.fogMode,density:scene.fogDensity,baseDepth:base.z,peakDepth:peak.z,
            lods:probeMeshes.filter(m=>m._masterMesh).map(m=>m.name)};
        }
      };
    `;
    await route.fulfill({response,body:source});
  });
  await page.goto(`${base}/sea-battle/?setup=8&scenarioTest=1`);
  await page.waitForFunction(()=>window.appearanceProbe);
  // Wait for shaders to compile before any measured frame.
  for(let i=0;i<8;i++){
    await page.evaluate(()=>appearanceProbe.step({x:0,z:0,heading:0},0,12000));
    await page.waitForTimeout(100);
  }
  const results={distance,scenario:straight?'straight':'turn',separation:straight?250:0,scenarios:{}};
  const scenarios=straight ? [['exp2',2,null],['exp2-long-clip',2,12000]]
    : [['none',0,null],['linear',3,null],['exp',1,null],['exp2',2,null],['exp2-long-clip',2,12000]];
  for(const [name,mode,far] of scenarios){
    const rows=[];
    for(let i=0;i<=60;i++){
      // First turn from an empty view, then approach straight ahead.
      const t=Math.min(1,i/30);
      const angle=(1-t)*Math.PI/2;
      const pose=straight ? {x:0,z:i*25,heading:0}
        : {x:200*(Math.cos(angle)-1),z:200*Math.sin(t*Math.PI/2)+Math.max(0,i-30)*40,heading:angle};
      const row=await page.evaluate(({pose,mode,far})=>appearanceProbe.step(pose,mode,far),{pose,mode,far});
      rows.push({frame:i,...pose,...row});
      if(i%5===0)await page.locator('#renderCanvas').screenshot({path:`${out}/${name}-${String(i).padStart(2,'0')}.png`});
    }
    results.scenarios[name]=rows;
    console.log(name,rows.map(r=>r.pixels).join(','));
  }
  assert.deepEqual(errors,[]);
  const control=results.scenarios['exp2-long-clip'];
  const firstVisible=control.findIndex(r=>r.pixels>100);
  assert.ok(firstVisible>=0,'control must actually render the island');
  assert.ok(control.slice(firstVisible).every(r=>r.pixels>0),'long-clip control must not lose the island');
  results.disappearance=Object.fromEntries(Object.entries(results.scenarios).map(([name,rows])=>{
    const first=rows.findIndex(r=>r.pixels>100);
    const gap=rows.findIndex((r,i)=>i>first && first>=0 && r.pixels===0);
    return [name,{firstVisible:first,firstMissing:gap,returns:gap>=0 && rows.slice(gap+1).some(r=>r.pixels>100)}];
  }));
  await writeFile(`${out}/measurements.json`,JSON.stringify(results,null,2));
  console.log(`Diagnostic captures: ${out}`);
} finally {await browser.close();}
