import test from 'node:test';
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
