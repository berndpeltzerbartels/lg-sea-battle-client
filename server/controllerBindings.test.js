import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTROLLER_STORAGE_KEY, controllerKey, defaultBindings, resolveBindings, saveControllerProfile,
  readControllerProfiles, captureControllerBinding, bindingValue, bindingConflicts, controllerActionsFor } from '../public/controller-bindings.js';
const pad = (id = 'DualSense') => ({ id, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
function storage() { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) }; }

test('saved bindings are shared between vehicles, isolated by controller and raw browser layout', () => {
  const device = pad(), other = pad('Other controller'), store = storage();
  saveControllerProfile(store, device, { fire: [{ kind: 'button', index: 0 }], zoom: [{ kind: 'button', index: 6 }] });
  const profiles = readControllerProfiles(store);
  assert.equal(resolveBindings(device, profiles).fire[0].index, 0);
  assert.equal(resolveBindings(other, profiles).fire[0].index, 7);
  const chrome = { ...device, mapping: '', axes: Array(10).fill(0) };
  assert.equal(resolveBindings(chrome, profiles), null);
  assert.deepEqual(resolveBindings(device, profiles).stationNext, defaultBindings(device).stationNext);
});

test('unassigned raw controllers become usable through a saved profile and empty bindings disable a function', () => {
  const device = { ...pad('unknown'), mapping: '' }, store = storage();
  assert.equal(resolveBindings(device), null);
  saveControllerProfile(store, device, { directX: [{ kind: 'axis', index: 2, sign: -1 }], fire: [] });
  const bindings = resolveBindings(device, readControllerProfiles(store));
  device.axes[2] = -.8;
  assert.equal(bindingValue(device, bindings.directX), .8);
  assert.equal(bindingValue(device, bindings.fire), 0);
});

test('broken storage and invalid bindings fall back safely without affecting standard controllers', () => {
  const device = pad(), store = storage(); store.setItem(CONTROLLER_STORAGE_KEY, 'broken');
  assert.deepEqual(readControllerProfiles(store), {});
  assert.equal(resolveBindings(device, { [controllerKey(device)]: { fire: [{ kind: 'button', index: 999 }] } }).fire[0].index, 7);
  assert.throws(() => saveControllerProfile(store, device, { directY: [{ kind: 'axis', index: -1, sign: 1 }] }));
});

test('capture learns direct-axis orientation, a fire button and N64 hat positions', () => {
  const before = pad(), after = pad();
  after.axes[2] = -1;
  assert.deepEqual(captureControllerBinding(before, after, 'directX'), { kind: 'axis', index: 2, sign: -1 });
  assert.deepEqual(captureControllerBinding(before, after, 'directY'), { kind: 'axis', index: 2, sign: 1 });
  after.buttons[4].pressed = true;
  assert.deepEqual(captureControllerBinding(before, after, 'fire'), { kind: 'button', index: 4 });
  before.axes[0] = 9 / 7; after.axes = [5 / 7, 0, 0, 0]; after.buttons[4].pressed = false;
  const hat = captureControllerBinding(before, after, 'stationPrevious');
  assert.deepEqual(hat, { kind: 'axisValue', index: 0, value: 5 / 7 });
  assert.equal(bindingValue(after, [hat]), 1);
  assert.equal(bindingValue(before, [hat]), 0);
});

test('duplicate buttons are reported by function, not consumed or silently replaced', () => {
  const binding = [{ kind: 'button', index: 1 }];
  assert.deepEqual(bindingConflicts({ fire: binding, zoom: binding }), [['fire', 'zoom']]);
  assert.deepEqual(bindingConflicts(defaultBindings(pad())), []);
});


test('the same button is allowed for distinct vehicles but rejected for simultaneously available functions', () => {
  const button=[{kind:'button',index:2}];
  assert.deepEqual(bindingConflicts({'depth-charge':button,'forward-scope':button}),[]);
  assert.deepEqual(bindingConflicts({'depth-charge':button,dive:button}),[]);
  assert.deepEqual(bindingConflicts({ascend:button,dive:button}),[['ascend','dive']]);
  assert.deepEqual(bindingConflicts({fire:button,zoom:button}),[['fire','zoom']]);
  const boat=controllerActionsFor({role:'bridge',depthChargesReady:true});
  const sub=controllerActionsFor({role:'bridge',submarine:true,depth:'periscope',periscopeAvailable:true,torpedoScope:true});
  assert.equal(boat.has('depth-charge'),true);assert.equal(boat.has('forward-scope'),false);
  assert.equal(sub.has('depth-charge'),false);assert.equal(sub.has('forward-scope'),true);
  assert.equal(sub.has('zoom'),true);
  assert.equal(controllerActionsFor({role:'lookout'}).has('fire'),false);
});


test('helm and aiming controls can share physical inputs across positions but stay independent within a profile', () => {
  const input=[{kind:'button',index:3}];
  assert.deepEqual(bindingConflicts({up:input,aimUp:input,left:[],aimLeft:[]}),[]);
  assert.deepEqual(bindingConflicts({left:input,aimLeft:input}),[]);
  assert.deepEqual(bindingConflicts({aimUp:input,aimDown:input}),[['aimUp','aimDown']]);
  const helm=controllerActionsFor({role:'bridge'}), gun=controllerActionsFor({role:'cannon'});
  assert.equal(helm.has('directX'),true);assert.equal(helm.has('aimX'),false);
  assert.equal(gun.has('directX'),false);assert.equal(gun.has('aimX'),true);
  assert.equal(helm.has('up'),true);assert.equal(gun.has('aimUp'),true);
  const raw={...pad('raw'),mapping:''},store=storage();
  saveControllerProfile(store,raw,{directX:[{kind:'axis',index:1,sign:1}]});
  const profile=resolveBindings(raw,readControllerProfiles(store));
  assert.deepEqual(profile.aimX,[], 'New profiles do not silently assign helm controls to aiming');
  const legacy=resolveBindings(raw,{[controllerKey(raw)]:{directX:[{kind:'axis',index:1,sign:1}]}});
  assert.equal(legacy.aimX[0].index,1,'Previously saved combined profiles retain their aiming');
});
