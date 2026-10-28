import test from 'node:test';import assert from 'node:assert/strict';
import {wreckPose} from '../src/wreckMotion.js';
const wreck={ship:{x:0,y:0,z:0,heading:0,speed:17.5,vehicleType:'torpedo-boat'},driftDrag:.35,sinkDepth:39.05,sinkSeconds:19,sinkSide:1};
test('late arrival produces the same physical pose without replaying missing frames',()=>{
 const pose=wreckPose(wreck,5);assert.ok(Math.abs(pose.z-41.31130282747774)<.00001);
 const ease=4*(5/19)**3;assert.ok(Math.abs(pose.y-(-.6-ease*39.05))<1e-9);
 assert.equal(wreckPose(wreck,19).finished,true);assert.equal(wreck.ship.z,0);
});
test('already submerged wrecks descend without unrealistically raising an end',()=>{
 const sub={...wreck,ship:{...wreck.ship,y:-19.26,vehicleType:'submarine'}};
 for(let age=0;age<19;age+=.1){const p=wreckPose(sub,age);assert.equal(p.pitch,0);assert.equal(p.roll,0);assert.ok(p.y<=-19.26);}
});
