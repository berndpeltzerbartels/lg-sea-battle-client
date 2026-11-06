import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/main.js', import.meta.url),'utf8');
const start = source.indexOf('async function loadDebugNavigationPlans()');
const end = source.indexOf('\nfunction ',start);

test('navigation debug data is fetched only for an open debug map, at most once per second',async () => {
  let clock=0,calls=0;
  const ctx={
    performance:{now:()=>clock},debugMapEnabled:false,debugNavigationLoading:false,
    nextDebugNavigationFetch:0,debugNavigationPlans:new Map(),gameState:{instanceId:'round'},
    gameEndpoint:path=>path,
    fetch:async()=>{calls++;return{ok:true,json:async()=>({instanceId:'round',plans:[{shipId:'bot',targetId:'human'}]})};}
  };
  const load=runInNewContext(source.slice(start,end)+'\nloadDebugNavigationPlans',ctx);
  await load();assert.equal(calls,0);
  ctx.debugMapEnabled=true;
  await load();assert.equal(calls,1);
  assert.equal(ctx.debugNavigationPlans.get('bot').targetId,'human');
  for(let frame=0;frame<60;frame++) await load();
  assert.equal(calls,1);
  clock=1000;await load();assert.equal(calls,2);
  ctx.debugMapEnabled=false;clock=2000;await load();assert.equal(calls,2);
});

test('a reply from the previous round never supplies another rounds bot targets',async () => {
  const ctx={
    performance:{now:()=>1000},debugMapEnabled:true,debugNavigationLoading:false,
    nextDebugNavigationFetch:0,debugNavigationPlans:new Map([['stale',{}]]),gameState:{instanceId:'new'},
    gameEndpoint:path=>path,
    fetch:async()=>({ok:true,json:async()=>({instanceId:'old',plans:[{shipId:'old-bot'}]})})
  };
  const load=runInNewContext(source.slice(start,end)+'\nloadDebugNavigationPlans',ctx);
  await load();assert.equal(ctx.debugNavigationPlans.size,0);
});
