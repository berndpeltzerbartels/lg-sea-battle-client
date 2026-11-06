import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
function fn(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}

test('forced vehicle change preserves the login and loads the assigned vehicle', () => {
  const saved = [], navigated = [];
  const ctx = {
    playerVehicleType: 'submarine', URL,
    location: { href: 'http://localhost/app?vehicle=submarine', replace: href => navigated.push(href) },
    localStorage: { setItem: (...entry) => saved.push(entry) }
  };
  const change = runInNewContext(fn('switchToAssignedVehicle') + '\nswitchToAssignedVehicle', ctx);
  assert.equal(change({state: 'sunk',vehicleType: 'torpedo-boat'}), false);
  assert.equal(change({state: 'active',vehicleType: 'submarine'}), false);
  assert.equal(navigated.length,0);
  assert.equal(change({state: 'active',vehicleType: 'torpedo-boat'}), true);
  assert.deepEqual(saved,[['vehicleType','torpedo-boat']]);
  assert.equal(new URL(navigated[0]).searchParams.get('vehicle'),'torpedo-boat');
});

test('finite round result stops motion and is displayed once with a winner or a draw', () => {
  for (const winningTeam of ['light','dark',null]) {
    let result;
    const ctx = {
      playerMotionBlocked: false, engineOrder: 7, speed: 12,
      startPageUrl: () => '/start.html',
      document: {
        getElementById: () => result,
        createElement: tag => ({tag,style:{},append(...children){this.children=children;}}),
        body: {append: element => {result=element;}}
      }
    };
    const show = runInNewContext(fn('showRoundResult') + '\nshowRoundResult',ctx);
    assert.equal(show({mode:'ENDLESS',state:'finished'}),false);
    assert.equal(show({mode:'BURN_DOWN',state:'running'}),false);
    assert.equal(ctx.playerMotionBlocked,false);
    assert.equal(show({mode:'BURN_DOWN',state:'finished',winningTeam}),true);
    assert.equal(ctx.playerMotionBlocked,true);
    assert.equal(ctx.engineOrder,2);
    assert.equal(ctx.speed,0);
    const first=result;
    show({mode:'BURN_DOWN',state:'finished',winningTeam});
    assert.equal(result,first);
    assert.match(result.children[0].textContent,winningTeam ? /gewinnt/ : /Unentschieden/);
    assert.equal(result.children[2].href,'/start.html');
  }
});
