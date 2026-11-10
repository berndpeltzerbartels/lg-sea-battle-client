import { roleHotkeys } from './role-hotkeys.js';

// One browser-side model shared by the setup page and the actual game input.
export const CONTROLLER_STORAGE_KEY = 'seaBattle.controllerBindings.v1';
export const CONTROLLER_ACTIONS = [
  'directX', 'directY', 'left', 'right', 'up', 'down', 'aimX', 'aimY', 'aimLeft', 'aimRight', 'aimUp', 'aimDown', 'fire', 'stationPrevious', 'stationNext',
  'zoom', 'depth-charge', 'ascend', 'dive', 'throttleHold', 'align', 'help', 'forward-scope', 'observation-scope'
];
const button = index => ({ kind: 'button', index });
const axis = index => ({ kind: 'axis', index, sign: 1 });
const hat = value => ({ kind: 'axisValue', index: 0, value });
const standard = {
  directX: [axis(0)], directY: [axis(1)], aimX: [axis(0)], aimY: [axis(1)], fire: [button(7)],
  stationPrevious: [button(4)], stationNext: [button(3), button(5)],
  zoom: [button(6)], 'depth-charge': [button(2)], ascend: [button(12)], dive: [button(13)],
  throttleHold: [button(10)], align: [button(1)], help: [button(9)],
  'forward-scope': [button(14)], 'observation-scope': [button(15)]
};
const n64 = {
  directX: [axis(1)], directY: [axis(2)], aimX: [axis(1)], aimY: [axis(2)],
  aimLeft: [button(3)], aimRight: [button(8)], aimUp: [button(2)], aimDown: [button(7)], fire: [button(1)],
  left: [button(3)], right: [button(8)], up: [button(2)], down: [button(7)],
  stationPrevious: [hat(5 / 7)], stationNext: [hat(-3 / 7)]
};
export function controllerKey(pad) {
  return JSON.stringify([pad.id, pad.mapping ?? '', pad.axes.length, pad.buttons.length]);
}
export function defaultBindings(pad) {
  if (pad.mapping === 'standard') return standard;
  if (/^057e-2019-N64 Controller$/i.test(pad.id ?? '') && !pad.mapping
      && pad.axes?.length === 5 && pad.buttons?.length === 16) return n64;
  return null;
}
const ANALOG_ACTIONS = ['directX', 'directY', 'aimX', 'aimY'];
const AIM_ACTIONS = ['aimX', 'aimY', 'aimLeft', 'aimRight', 'aimUp', 'aimDown'];
export function isAnalogAction(action) { return ANALOG_ACTIONS.includes(action); }
function validInput(input, action, pad) {
  if (!input || !Number.isInteger(input.index) || input.index < 0) return false;
  if (isAnalogAction(action))
    return input.kind === 'axis' && input.index < pad.axes.length && [1, -1].includes(input.sign);
  return input.kind === 'button' && input.index < pad.buttons.length
    || input.kind === 'axisValue' && input.index < pad.axes.length && Number.isFinite(input.value) && Math.abs(input.value) <= 2
    || input.kind === 'axisDirection' && input.index < pad.axes.length && [1, -1].includes(input.sign);
}
export function cleanBindings(bindings, pad) {
  if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return null;
  const clean = {};
  for (const action of CONTROLLER_ACTIONS) {
    if (!Object.hasOwn(bindings, action)) continue;
    const values = bindings[action];
    if (!Array.isArray(values) || values.length > 4 || !values.every(value => validInput(value, action, pad))) return null;
    clean[action] = values.map(value => ({ ...value }));
  }
  return clean;
}
export function readControllerProfiles(storage) {
  try {
    const value = JSON.parse(storage?.getItem(CONTROLLER_STORAGE_KEY) ?? 'null');
    return value?.version === 1 && value.profiles && typeof value.profiles === 'object' && !Array.isArray(value.profiles)
      ? value.profiles : {};
  } catch { return {}; }
}
export function resolveBindings(pad, profiles = {}) {
  if (!pad || pad.connected === false) return null;
  const defaults = defaultBindings(pad);
  const saved = Object.hasOwn(profiles, controllerKey(pad)) ? cleanBindings(profiles[controllerKey(pad)], pad) : null;
  if (!defaults && !saved) return null;
  const result = { ...(defaults ?? {}), ...(saved ?? {}) };
  // Older profiles used one input for both helm and aiming. Preserve it until aiming is configured separately.
  if (saved && !AIM_ACTIONS.some(action => Object.hasOwn(saved, action))) {
    for (const [aim, helm] of Object.entries({ aimX: 'directX', aimY: 'directY', aimLeft: 'left', aimRight: 'right', aimUp: 'up', aimDown: 'down' })) {
      if (Object.hasOwn(saved, helm)) result[aim] = saved[helm];
    }
  }
  return result;
}
export function saveControllerProfile(storage, pad, bindings) {
  const clean = cleanBindings(bindings, pad);
  if (!clean) throw new Error('Die Belegung enthält ungültige Eingaben.');
  const profiles = readControllerProfiles(storage);
  const complete = { ...(defaultBindings(pad) ?? {}), ...clean };
  // New profiles explicitly distinguish unassigned aiming controls from legacy shared controls.
  profiles[controllerKey(pad)] = Object.fromEntries(CONTROLLER_ACTIONS.map(action => [action, complete[action] ?? []]));
  storage.setItem(CONTROLLER_STORAGE_KEY, JSON.stringify({ version: 1, profiles }));
}
export function bindingValue(pad, inputs) {
  if (!inputs?.length) return 0;
  const analog = inputs[0];
  if (analog.kind === 'axis') {
    const value = pad.axes[analog.index];
    return Number.isFinite(value) ? Math.max(-1, Math.min(1, value * analog.sign)) : 0;
  }
  return inputs.some(input => {
    if (input.kind === 'button') {
      const value = pad.buttons[input.index];
      return !!value?.pressed || value?.value > .55;
    }
    const value = pad.axes[input.index];
    return Number.isFinite(value) && (input.kind === 'axisValue' ? Math.abs(value - input.value) < .04 : value * input.sign > .55);
  }) ? 1 : 0;
}
export function describeBindings(inputs) {
  if (!inputs?.length) return 'Nicht belegt';
  return inputs.map(input => input.kind === 'button' ? `Taste ${input.index + 1}`
    : input.kind === 'axis' ? `Achse ${input.index + 1}${input.sign < 0 ? ' · umgekehrt' : ''}`
    : input.kind === 'axisValue' ? `Steuerkreuz · Achse ${input.index + 1} (${input.value.toFixed(2)})`
    : `Achse ${input.index + 1} ${input.sign < 0 ? '−' : '+'}`).join(' / ');
}
export function captureControllerBinding(baseline, pad, action) {
  const direct = isAnalogAction(action);
  if (!direct) {
    const index = pad.buttons.findIndex((value, i) => (value.pressed || value.value > .55)
      && !(baseline.buttons[i]?.pressed || baseline.buttons[i]?.value > .55));
    if (index >= 0) return button(index);
  }
  const candidates = pad.axes.map((value, index) => ({ value, index, before: baseline.axes[index] ?? 0 }))
    .filter(v => Number.isFinite(v.value) && Math.abs(v.value - v.before) > (!direct && Math.abs(v.before) > 1.05 ? .08 : .6)
      && (!direct || Math.abs(v.before) < .25 && Math.abs(v.value) <= 1.05))
    .sort((a, b) => Math.abs(b.value - b.before) - Math.abs(a.value - a.before));
  if (!candidates.length) return null;
  const { value, index, before } = candidates[0];
  if (direct) return { kind: 'axis', index, sign: Math.sign(value) * (['directY', 'aimY'].includes(action) ? -1 : 1) };
  if (Math.abs(before) > 1.05) return { kind: 'axisValue', index, value };
  return { kind: 'axisDirection', index, sign: Math.sign(value) };
}
// Runtime input and configuration validation use the same position-specific keyboard rules.
export function controllerActionsFor(context) {
  const keys = roleHotkeys(context);
  const active = new Set(['help', 'stationPrevious', 'stationNext']);
  const actions = { Leertaste: 'fire', Z: 'zoom', W: 'depth-charge', A: 'align',
    '3': 'align', '⇧↑': 'ascend', '⇧↓': 'dive', '1': 'forward-scope', '2': 'observation-scope' };
  for (const [key, label] of keys) {
    if (actions[key]) active.add(actions[key]);
    if (key === '↑ ↓' || key === '↑ ↓ ← →') (label === 'Fahrt' ? ['directY', 'up', 'down'] : ['aimY', 'aimUp', 'aimDown']).forEach(a => active.add(a));
    if (key === '← →' || key === '↑ ↓ ← →') (label === 'Ruder' ? ['directX', 'left', 'right'] : ['aimX', 'aimLeft', 'aimRight']).forEach(a => active.add(a));
    if (label === 'Fahrt') active.add('throttleHold');
  }
  return active;
}
// Enumerate actual vehicle/position contexts once. Binding checks do no game/world scan.
const actionContexts = [];
for (const role of ['bridge', 'lookout', 'flak', 'cannon']) {
  actionContexts.push(controllerActionsFor({ role, depthChargesReady: true }));
  if (role === 'bridge') actionContexts.push(controllerActionsFor({ role, depthChargesReady: true, torpedoScope: true }));
}
for (const depth of ['surface', 'periscope', 'submerged']) {
  if (depth === 'surface') actionContexts.push(controllerActionsFor({ role: 'flak', submarine: true, depth }));
  for (const observationScope of [false, true]) {
    actionContexts.push(controllerActionsFor({ role: 'bridge', submarine: true, depth,
      periscopeAvailable: depth !== 'surface', torpedoScope: depth !== 'surface', observationScope }));
  }
}
export function actionsOverlap(first, second) {
  return actionContexts.some(context => context.has(first) && context.has(second));
}
export function bindingConflicts(bindings) {
  const used = new Map(), conflicts = [];
  for (const action of CONTROLLER_ACTIONS) for (const input of bindings[action] ?? []) {
    const key = input.kind === 'axis' ? `axis:${input.index}` : JSON.stringify(input);
    const previous = used.get(key) ?? [];
    for (const other of previous) if (actionsOverlap(other, action)) conflicts.push([other, action]);
    used.set(key, [...previous, action]);
  }
  return conflicts;
}
