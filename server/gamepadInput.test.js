import test from 'node:test';
import { controllerActionsFor } from '../public/controller-bindings.js';
import assert from 'node:assert/strict';
import { createGamepadInput, createHeldControls, nextGamepadStation, gamepadBridgeState } from '../src/gamepadInput.js';

function fixture() {
  const pad = { id: 'DualSense Wireless Controller', index: 0, mapping: 'standard', connected: true,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  const events = []; let available = true;
  const controller = createGamepadInput({ getGamepads: () => available ? [pad] : [],
    direction: (...args) => events.push(['direction', ...args]), fire: down => events.push(['fire', down]),
    cycleStation: step => events.push(['station', step]), action: action => events.push(['action', action]) });
  const tick = (enabled = true, context = 'bridge') => controller.update(enabled, context);
  tick(); events.length = 0;
  return { pad, events, controller, tick, disconnect() { available = false; } };
}

test('left stick maps both axes independently, including diagonals, without key-repeat floods', () => {
  const f = fixture();
  f.pad.axes = [-.8, -.8, 1, 1]; f.tick();
  assert.deepEqual(f.events, [['direction', 'left', true], ['direction', 'up', true]]);
  for (let i = 0; i < 60; i++) f.tick();
  assert.equal(f.events.length, 2);
  f.pad.axes = [0, 0, 1, 1]; f.tick();
  assert.deepEqual(f.events.slice(2), [['direction', 'left', false], ['direction', 'up', false]]);
});

test('dead zone tolerates drift and hysteresis avoids chatter', () => {
  const f = fixture(); f.pad.axes[0] = .2; f.tick(); assert.equal(f.events.length, 0);
  f.pad.axes[0] = .4; f.tick(); f.pad.axes[0] = .29; f.tick();
  assert.deepEqual(f.events, [['direction', 'right', true]]);
  f.pad.axes[0] = -.25; f.tick();
  assert.deepEqual(f.events.at(-1), ['direction', 'right', false]);
});

test('R2 holds fire, while L1/R1 switch once and require release before reuse', () => {
  const f = fixture(); f.pad.buttons[7].pressed = true; f.tick(); f.tick();
  assert.deepEqual(f.events, [['fire', true]]);
  f.pad.buttons[5].pressed = true; f.tick();
  assert.deepEqual(f.events.slice(-2), [['fire', false], ['station', 1]]);
  f.tick(); assert.equal(f.events.filter(e => e[0] === 'station').length, 1);
  f.pad.buttons.forEach(b => { b.pressed = false; }); f.tick();
  f.pad.buttons[4].pressed = true; f.tick();
  assert.deepEqual(f.events.at(-1), ['station', -1]);
});

for (const reason of ['disconnect', 'focus', 'station']) test(`held controls stop safely on ${reason}`, () => {
  const f = fixture(); f.pad.axes[0] = 1; f.pad.buttons[7].pressed = true; f.tick();
  if (reason === 'disconnect') f.disconnect();
  f.tick(reason !== 'focus', reason === 'station' ? 'cannon' : 'bridge');
  assert.deepEqual(f.events.slice(-2), [['direction', 'right', false], ['fire', false]]);
  const count = f.events.length; f.tick(); assert.equal(f.events.length, count, 'held input must be neutralised before rearming');
});

test('unknown mappings and unavailable browser API produce no actions', () => {
  const f = fixture(); f.pad.mapping = ''; f.pad.buttons[7].pressed = true; f.tick();
  assert.equal(f.events.length, 0);
  assert.doesNotThrow(() => createGamepadInput({ getGamepads() { throw new Error('blocked'); } }).update(true, 'bridge'));
});

test('held keyboard input survives gamepad release, without doubled initial actions', () => {
  const events = [], inputs = createHeldControls(c => events.push(['press', c]), c => events.push(['release', c]));
  inputs.set('left', true, 'keyboard'); inputs.set('left', true, 'gamepad');
  inputs.set('left', false, 'gamepad');
  assert.deepEqual(events, [['press', 'left']]);
  inputs.set('left', false, 'keyboard');
  assert.deepEqual(events.at(-1), ['release', 'left']);
  inputs.set('fire', true, 'gamepad'); inputs.clear();
  assert.deepEqual(events.at(-1), ['release', 'fire']);
});

test('position cycling skips all occupied posts, including the shared bridge/torpedo position', () => {
  const stations = ['bridge', 'lookout', 'flak', 'cannon', 'torpedo'];
  const members = [{ station: 'flak', playerId: 'other' }, { station: 'cannon', playerId: 'other-2' }];
  assert.equal(nextGamepadStation('lookout', 1, stations, members, 'me'), 'torpedo');
  assert.equal(nextGamepadStation('torpedo', -1, stations, members, 'me'), 'lookout');
  assert.equal(nextGamepadStation('bridge', -1, stations, [], 'me'), 'torpedo');
  const occupied = ['bridge', 'flak', 'cannon'].map(station => ({ station, playerId: 'other' }));
  assert.equal(nextGamepadStation('lookout', 1, stations, occupied, 'me'), null);
  assert.equal(nextGamepadStation('bridge', 1, ['bridge'], [], 'me'), null);
});

test('releasing the opposite keyboard direction resumes a still-held controller direction', () => {
  const events = [], inputs = createHeldControls((c, options) => events.push([c, options.repeat]), () => {});
  inputs.set('right', true, 'gamepad'); inputs.set('left', true, 'keyboard');
  inputs.set('left', false, 'keyboard');
  assert.deepEqual(events.at(-1), ['right', true]);
});

test('extra controls use one-shot actions for zoom, depth charges and submarine diving', () => {
  const f = fixture();
  for (const [button, action] of [[6, 'zoom'], [2, 'depth-charge'], [12, 'ascend'], [13, 'dive']]) {
    f.pad.buttons[button].pressed = true; f.tick(); f.tick();
    assert.deepEqual(f.events.at(-1), ['action', action]);
    f.pad.buttons[button].pressed = false; f.tick();
  }
  assert.equal(f.events.length, 4);
});


test('bridge stick selects absolute gears and proportional rudder with drift protection', () => {
  assert.deepEqual(gamepadBridgeState(.12, -.12), { rudder: 0, engineOrder: 2 });
  assert.deepEqual(gamepadBridgeState(1, -1), { rudder: 1, engineOrder: 8 });
  assert.deepEqual(gamepadBridgeState(-1, 1), { rudder: -1, engineOrder: 0 });
  assert.equal(gamepadBridgeState(.59, -.59).engineOrder, 5);
  assert.ok(Math.abs(gamepadBridgeState(.59, -.59).rudder - .5) < .001);
  assert.equal(gamepadBridgeState(0, .4).engineOrder, 1);
});

for (const end of ['neutral', 'disconnect', 'focus', 'station']) test(`analog bridge returns to Stop/midships on ${end}`, () => {
  const pad = { id: 'DualSense', mapping: 'standard', axes: [0, 0], buttons: [] };
  let connected = true; const commands = [], directions = [];
  const input = createGamepadInput({ getGamepads: () => connected ? [pad] : [],
    analog: (x, y, axes) => commands.push([x, y, axes]), direction: (...args) => directions.push(args) });
  const axes = { x: true, y: true };
  input.update(true, 'bridge', axes);
  input.update(true, 'bridge', axes);
  assert.equal(commands.length, 0, 'idle controller must leave keyboard orders alone');
  pad.axes = [.6, -.8]; input.update(true, 'bridge', axes);
  for (let i = 0; i < 60; i++) input.update(true, 'bridge', axes);
  assert.equal(commands.length, 1, 'holding a stick never steps up to full throttle');
  assert.equal(directions.length, 0, 'bridge must not also receive arrow key holds');
  if (end === 'neutral') pad.axes = [0, 0];
  if (end === 'disconnect') connected = false;
  input.update(end !== 'focus', end === 'station' ? 'cannon' : 'bridge', end === 'station' ? {} : axes);
  assert.deepEqual(commands.at(-1), [0, 0, axes]);
});

test('360 degree periscope keeps digital view rotation but uses absolute throttle', () => {
  const pad = { id: 'DualSense', mapping: 'standard', axes: [0, 0], buttons: [] };
  const commands = [], directions = [];
  const input = createGamepadInput({ getGamepads: () => [pad], analog: (...args) => commands.push(args), direction: (...args) => directions.push(args) });
  input.update(true, 'scope', { y: true });
  pad.axes = [.8, -.5]; input.update(true, 'scope', { y: true });
  assert.deepEqual(directions, [['right', true]]);
  assert.deepEqual(commands, [[0, -.5, { y: true }]]);
});

function helmFixture() {
  const pad = { id: 'DualSense', index: 0, mapping: 'standard', connected: true,
    axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
  const state = { engineOrder: 2, rudder: 0, hold: false, stations: [], actions: [] };
  const input = createGamepadInput({ getGamepads: () => [pad], direction() {},
    analog(x, y, axes) { const c = gamepadBridgeState(x, y); if (axes.y) state.engineOrder = c.engineOrder; if (axes.x) state.rudder = c.rudder; },
    throttleHold: held => { state.hold = held; },
    cycleStation: step => state.stations.push(step), action: action => state.actions.push(action) });
  const tick = (context = 'bridge') => input.update(true, context, context === 'bridge' ? { x: true, y: true } : {});
  tick(); tick();
  const button = (index, context = 'bridge') => { pad.buttons[index].pressed = true; tick(context); pad.buttons[index].pressed = false; tick(context); };
  const lock = () => { pad.axes[1] = -1; tick(); button(10); };
  return { pad, state, input, tick, button, lock };
}

test('L3 holds only throttle; releasing and horizontal steering leave it held', () => {
  const f = helmFixture(); f.lock();
  assert.equal(f.state.hold, true);
  f.pad.axes = [0, 0]; f.tick();
  assert.equal(f.state.engineOrder, 8);
  f.pad.axes[0] = 1; f.tick();
  assert.equal(f.state.rudder, 1); assert.equal(f.state.hold, true);
  f.pad.axes[0] = 0; f.tick();
  assert.equal(f.state.rudder, 0); assert.equal(f.state.engineOrder, 8);
  f.pad.axes[1] = .59; f.tick();
  assert.equal(f.state.hold, false); assert.equal(f.state.engineOrder, 1);
  f.pad.axes[1] = 0; f.tick();
  assert.equal(f.state.engineOrder, 2);
});

test('holding the original gas position or clicking L3 again does not release it', () => {
  const f = helmFixture(); f.lock();
  f.pad.axes[1] = -.8; f.tick();
  assert.equal(f.state.hold, true); assert.equal(f.state.engineOrder, 8);
  f.button(10); assert.equal(f.state.hold, true);
  f.pad.axes[1] = 0; f.tick();
  f.pad.axes[1] = -.59; f.tick();
  assert.equal(f.state.hold, false); assert.equal(f.state.engineOrder, 5);
});

for (const locked of [false, true]) test(`triangle station change ${locked ? 'preserves held gas' : 'returns unlocked gas to Stop'}`, () => {
  const f = helmFixture();
  if (locked) f.lock(); else { f.pad.axes[1] = -1; f.tick(); }
  f.button(3);
  assert.deepEqual(f.state.stations, [1]);
  assert.equal(f.state.engineOrder, locked ? 8 : 2);
});

test('weapon stations cannot set or release throttle hold; returning to bridge and moving vertically can', () => {
  const f = helmFixture(); f.lock(); f.pad.axes = [0, 0]; f.tick('cannon'); f.tick('cannon');
  f.pad.axes = [1, 1]; f.button(10, 'cannon');
  assert.equal(f.state.hold, true); assert.equal(f.state.engineOrder, 8);
  f.pad.axes = [0, 0]; f.tick('bridge'); f.tick('bridge');
  assert.equal(f.state.hold, true);
  f.pad.axes[0] = -1; f.tick();
  assert.equal(f.state.hold, true); assert.equal(f.state.rudder, -1);
  f.pad.axes[1] = 1; f.tick();
  assert.equal(f.state.hold, false); assert.equal(f.state.engineOrder, 0);
  f.pad.axes = [0, 0]; f.tick('cannon'); f.tick('cannon'); f.button(10, 'cannon');
  assert.equal(f.state.hold, false);
});

test('temporary input resets preserve explicit throttle hold; a new life clears it', () => {
  const f = helmFixture(); f.lock(); f.input.reset();
  assert.equal(f.state.engineOrder, 8); assert.equal(f.state.hold, true);
  f.input.clearThrottleHold();
  assert.equal(f.state.hold, false);
});

test('triangle cycles once and circle retains the alignment action', () => {
  const f = fixture();
  f.pad.buttons[3].pressed = true; f.tick(); f.tick();
  assert.deepEqual(f.events, [['station', 1]]);
  f.pad.buttons[3].pressed = false; f.tick();
  f.pad.buttons[1].pressed = true; f.tick(); f.tick();
  assert.deepEqual(f.events.at(-1), ['action', 'align']);
});

function n64Fixture() {
  const pad = { id: '057e-2019-N64 Controller', mapping: '', index: 0, connected: true,
    axes: [0, 0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
  const events = [];
  const input = createGamepadInput({ getGamepads: () => [pad],
    analog: (...args) => events.push(['analog', ...args]), direction: (...args) => events.push(['direction', ...args]),
    fire: down => events.push(['fire', down]), cycleStation: step => events.push(['station', step]),
    action: name => events.push(['action', name]) });
  const tick = (axes = {}) => input.update(true, 'test', axes);
  tick();
  return { pad, events, input, tick };
}

test('measured N64 Firefox axes support diagonal aiming and button 1 fires without aligning', () => {
  const f = n64Fixture();
  f.pad.axes[1] = -.96; f.pad.axes[2] = -1; f.pad.buttons[1].pressed = true; f.tick();
  assert.deepEqual(f.events, [['direction', 'left', true], ['direction', 'up', true], ['fire', true]]);
  f.pad.axes.fill(0); f.pad.buttons[1].pressed = false; f.tick();
  assert.deepEqual(f.events.slice(-3), [['direction', 'left', false], ['direction', 'up', false], ['fire', false]]);
});

test('N64 bridge uses proportional measured axes and stops on release', () => {
  const f = n64Fixture(); const axes = { x: true, y: true };
  f.pad.axes[1] = 1; f.pad.axes[2] = -1; f.tick(axes);
  assert.deepEqual(f.events, [['analog', 1, -1, axes]]);
  assert.deepEqual(gamepadBridgeState(1, -1), { rudder: 1, engineOrder: 8 });
  f.pad.axes.fill(0); f.tick(axes);
  assert.deepEqual(f.events.at(-1), ['analog', 0, 0, axes]);
});

test('unmeasured N64 buttons do not trigger PS actions and a different raw layout is ignored', () => {
  const f = n64Fixture();
  for (let i = 0; i < 16; i++) if (![1, 2, 3, 7, 8].includes(i)) {
    f.pad.buttons[i].pressed = true; f.tick(); f.pad.buttons[i].pressed = false; f.tick();
  }
  assert.deepEqual(f.events, []);
  f.pad.axes = Array(10).fill(0); f.pad.axes[1] = 1; f.pad.buttons[1].pressed = true; f.tick();
  assert.deepEqual(f.events, []);
});

test('N64 disconnect releases held aim and fire', () => {
  const f = n64Fixture(); f.pad.axes[1] = 1; f.pad.buttons[1].pressed = true; f.tick();
  f.pad.connected = false; f.tick();
  assert.deepEqual(f.events.slice(-2), [['direction', 'right', false], ['fire', false]]);
});


test('N64 C buttons use keyboard directions at the helm without resetting the analog commands', () => {
  const f = n64Fixture(); const axes = { x: true, y: true };
  f.pad.buttons[3].pressed = true; f.pad.buttons[2].pressed = true; f.tick(axes);
  assert.deepEqual(f.events, [['direction', 'left', true], ['direction', 'up', true]]);
  f.tick(axes); assert.equal(f.events.length, 2);
  f.pad.buttons[3].pressed = false; f.pad.buttons[2].pressed = false; f.tick(axes);
  assert.deepEqual(f.events.slice(-2), [['direction', 'left', false], ['direction', 'up', false]]);
  assert.equal(f.events.some(e => e[0] === 'analog'), false, 'Neutral stick cannot reset the persistent keyboard setting');
  f.pad.buttons[8].pressed = true; f.pad.buttons[7].pressed = true; f.tick(axes);
  assert.deepEqual(f.events.slice(-2), [['direction', 'right', true], ['direction', 'down', true]]);
});

test('N64 C buttons take over a deflected stick and retain settings after both are released', () => {
  const f = n64Fixture(); const axes = { x: true, y: true };
  f.pad.axes[1] = .8; f.pad.axes[2] = -.7; f.tick(axes);
  f.events.length = 0;
  f.pad.buttons[8].pressed = true; f.pad.buttons[2].pressed = true; f.tick(axes);
  f.pad.axes.fill(0); f.tick(axes);
  f.pad.buttons[8].pressed = false; f.pad.buttons[2].pressed = false; f.tick(axes);
  assert.equal(f.events.some(e => e[0] === 'analog'), false);
  f.pad.axes[1] = -.8; f.tick(axes);
  assert.deepEqual(f.events.at(-1), ['analog', -.8, 0, axes]);
});

for (const [hat, step] of [[5 / 7, -1], [-3 / 7, 1]]) test(`N64 hat ${hat} switches one free position and rearms only after release`, () => {
  const f = n64Fixture(); f.pad.axes[0] = hat; f.tick(); f.tick(); f.tick();
  assert.deepEqual(f.events, [['station', step]]);
  f.pad.axes[0] = 9 / 7; f.tick();
  f.pad.axes[0] = hat; f.tick();
  assert.deepEqual(f.events, [['station', step], ['station', step]]);
});

test('N64 vertical hat directions do not change position', () => {
  const f = n64Fixture(); for (const hat of [-1, 1 / 7, 9 / 7]) { f.pad.axes[0] = hat; f.tick(); }
  assert.deepEqual(f.events, []);
});

test('saved custom buttons drive the same game input and neutralisation as standard defaults', () => {
  const pad = { id: 'custom raw controller', index: 0, mapping: '', connected: true, axes: [0,0,0],
    buttons: Array.from({length:4},()=>({pressed:false})) };
  const key=JSON.stringify([pad.id,pad.mapping,3,4]), events=[];
  const input=createGamepadInput({getGamepads:()=>[pad], profiles:{[key]:{
    directX:[{kind:'axis',index:1,sign:1}], directY:[{kind:'axis',index:2,sign:1}],
    fire:[{kind:'button',index:0}], zoom:[{kind:'button',index:1}],
    stationNext:[{kind:'button',index:2}], up:[{kind:'button',index:3}]}},
    direction:(...a)=>events.push(['direction',...a]),fire:down=>events.push(['fire',down]),
    cycleStation:step=>events.push(['station',step]),action:name=>events.push(['action',name])});
  input.update(true,'cannon'); pad.buttons[0].pressed=true;pad.buttons[1].pressed=true;input.update(true,'cannon');
  assert.deepEqual(events,[['fire',true],['action','zoom']]);
  input.update(true,'cannon');assert.equal(events.length,2);
  pad.buttons[2].pressed=true;input.update(true,'cannon');
  assert.deepEqual(events.slice(-2),[['fire',false],['station',1]]);
});


test('a shared torpedo-boat/U-boat button dispatches only its current vehicle function and requires release after switching', () => {
  const pad={id:'Shared raw controller',index:0,mapping:'',connected:true,axes:[],buttons:[{pressed:false}]};
  const key=JSON.stringify([pad.id,'',0,1]);
  const shared=[{kind:'button',index:0}];
  let context={role:'bridge',depthChargesReady:true};const events=[];
  const input=createGamepadInput({getGamepads:()=>[pad],profiles:{[key]:{'depth-charge':shared,'forward-scope':shared}},
    contextActions:()=>controllerActionsFor(context),action:name=>events.push(name)});
  const tick=()=>input.update(true,JSON.stringify(context));
  tick();pad.buttons[0].pressed=true;tick();
  assert.deepEqual(events,['depth-charge']);
  context={role:'bridge',submarine:true,depth:'periscope',torpedoScope:true,periscopeAvailable:true};tick();tick();
  assert.deepEqual(events,['depth-charge'],'A held button cannot trigger an action when the context changes');
  pad.buttons[0].pressed=false;tick();pad.buttons[0].pressed=true;tick();
  assert.deepEqual(events,['depth-charge','forward-scope']);
});

test('the same button controls helm rudder or gun aiming according to the occupied position', () => {
  const pad={id:'Position controller',index:0,mapping:'',connected:true,axes:[],buttons:[{pressed:false}]};
  const key=JSON.stringify([pad.id,'',0,1]),shared=[{kind:'button',index:0}];
  let role='bridge';const events=[];
  const input=createGamepadInput({getGamepads:()=>[pad],profiles:{[key]:{left:shared,aimRight:shared}},
    contextActions:()=>controllerActionsFor({role}),direction:(...args)=>events.push(args)});
  const tick=()=>input.update(true,role,role==='bridge'?{x:true,y:true}:{});
  tick();pad.buttons[0].pressed=true;tick();pad.buttons[0].pressed=false;tick();
  assert.deepEqual(events,[['left',true],['left',false]]);
  role='cannon';tick();pad.buttons[0].pressed=true;tick();pad.buttons[0].pressed=false;tick();
  assert.deepEqual(events.slice(2),[['right',true],['right',false]]);
});
