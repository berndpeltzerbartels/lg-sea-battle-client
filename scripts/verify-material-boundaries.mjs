import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const world = JSON.parse(await readFile(process.argv[2], "utf8"));
const browser = await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try {
  const page = await browser.newPage({viewport:{width:1000,height:700}});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",message=>{ if(message.type()==="error") errors.push(message.text()); });
  await page.route("**/material-test",route=>route.fulfill({contentType:"text/html",body:'<body style="margin:0"><canvas style="width:100vw;height:100vh;display:block"></canvas></body>'}));
  await page.goto("http://127.0.0.1:5176/material-test");
  await page.evaluate(async world=>{
    const base="/sea-battle/node_modules/@babylonjs/core/";
    await import(base+"Shaders/default.vertex.js");
    await import(base+"Shaders/default.fragment.js");
    const {Engine}=await import(base+"Engines/engine.js");
    const {Scene}=await import(base+"scene.js");
    const {ArcRotateCamera}=await import(base+"Cameras/arcRotateCamera.js");
    const {HemisphericLight}=await import(base+"Lights/hemisphericLight.js");
    const {Vector3}=await import(base+"Maths/math.vector.js");
    const {Color4}=await import(base+"Maths/math.color.js");
    const {TransformNode}=await import(base+"Meshes/transformNode.js");
    const {createAuthoredTerrainMesh}=await import("/sea-battle/packages/landscape/renderer.js");
    const {createLandscapeMaterials}=await import("/sea-battle/packages/landscape/materials.js");
    const g=await import("/sea-battle/packages/landscape/geometry.js");
    const canvas=document.querySelector("canvas");
    const engine=new Engine(canvas,true,{preserveDrawingBuffer:true});
    const scene=new Scene(engine);
    scene.clearColor=new Color4(0.34,0.47,0.56,1);
    const camera=new ArcRotateCamera("camera",1.5,1.35,220,new Vector3(0,42,0),scene);
    camera.attachControl(canvas,true);
    new HemisphericLight("light",new Vector3(-1,1,0.5),scene);
    const materials=createLandscapeMaterials(scene);
    const center=world.landmasses[1];
    let roots=[];
    window.drawMaterialTest=before=>{
      roots.forEach(root=>root.dispose()); roots=[];
      for(const land of world.landmasses.slice(0,2)) {
        const root=new TransformNode(land.name,scene);roots.push(root);
        root.position=new Vector3(land.x-center.x,0,land.z-center.z);
        const mesh=g.createAuthoredTerrainMeshData(land), local=g.authoredLocalTerrainIsland(land);
        let surfaces;
        if(before) {
          surfaces=Object.fromEntries(["land","sand","snow","seaFloor"].map(key=>[key,g.createAuthoredSurfaceData()]));
          for(let i=0;i<mesh.indices.length;i+=3) {
            const triangle=mesh.indices.slice(i,i+3).map(j=>mesh.vertices[j]);
            const above=g.clipAuthoredHeightPolygon(triangle,0,true);
            g.appendAuthoredSurfacePolygon(g.surfaceForAuthoredLandPolygon(above,surfaces,local),above);
            g.appendAuthoredSurfacePolygon(surfaces.seaFloor,g.clipAuthoredHeightPolygon(triangle,0,false));
          }
        } else surfaces=g.splitAuthoredTerrainSurfaces(mesh,local);
        for(const [key,surface] of Object.entries(surfaces)) {
          if(key==="seaFloor")continue;
          const material=key==="sand"?materials.terrainSand:key==="snow"?materials.snow:g.authoredLandMaterial(land,materials);
          createAuthoredTerrainMesh(key,surface.positions,surface.indices,material,scene,root);
        }
      }
      scene.render();
    };
    window.drawMaterialTest(true);
    engine.runRenderLoop(()=>scene.render());
    window.materialTestPixels=()=>{
      const sample=document.createElement("canvas");sample.width=canvas.width;sample.height=canvas.height;
      const ctx=sample.getContext("2d");ctx.drawImage(canvas,0,0);
      const pixels=ctx.getImageData(0,0,sample.width,sample.height).data;
      let count=0;
      for(let i=0;i<pixels.length;i+=4) if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>20)count++;
      return count;
    };
    window.addEventListener("resize",()=>engine.resize());
  },world);
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(()=>window.materialTestPixels())>1000);
  await page.screenshot({path:"/tmp/material-boundaries-before.png"});
  await page.evaluate(()=>window.drawMaterialTest(false));
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(()=>window.materialTestPixels())>1000);
  await page.screenshot({path:"/tmp/material-boundaries-after.png"});
  await page.setViewportSize({width:390,height:700});
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(()=>window.materialTestPixels())>1000);
  await page.screenshot({path:"/tmp/material-boundaries-mobile.png"});
  assert.deepEqual(errors,[]);
  console.log("Material boundary before/after and mobile screenshots captured without browser errors.");
} finally {await browser.close();}
