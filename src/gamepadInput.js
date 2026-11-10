import { controllerKey, resolveBindings, bindingValue, CONTROLLER_ACTIONS, isAnalogAction } from '../public/controller-bindings.js';

// Standard Gamepad mapping: DualSense, DualShock and compatible browser mappings.
export function createHeldControls(press, release) {
  const owners = new Map(), lastOptions = new Map();
  const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' };
  return {
    set(control, down, source, options = {}) {
      const held = owners.get(control) ?? new Set();
      const wasDown = held.size > 0;
      if (down) { held.add(source); lastOptions.set(control, options); } else held.delete(source);
      if (held.size) owners.set(control, held); else owners.delete(control);
      if (down && (!wasDown || options.repeat)) press(control, options);
      else if (!down && wasDown && !held.size) {
        release(control);
        if (owners.has(opposite[control])) press(opposite[control], { ...lastOptions.get(opposite[control]), repeat: true });
        lastOptions.delete(control);
      }
    },
    clear() { for (const control of owners.keys()) release(control); owners.clear(); lastOptions.clear(); }
  };
}

export function nextGamepadStation(current, step, stations, members = [], playerId) {
  const start = stations.indexOf(current);
  for (let offset = 1; offset <= stations.length; offset++) {
    const index = ((start < 0 ? (step > 0 ? -1 : 0) : start) + step * offset + stations.length * 2) % stations.length;
    const station = stations[index], crewStation = station === 'torpedo' ? 'bridge' : station;
    if (station !== current && !members.some(member => member.station === crewStation && member.playerId !== playerId)) return station;
  }
  return null;
}

export function gamepadBridgeState(horizontal, vertical) {
  const axis = value => Number.isFinite(value) && Math.abs(value) > .18
    ? Math.sign(value) * Math.min(1, (Math.abs(value) - .18) / .82) : 0;
  const rudder = axis(horizontal), throttle = -axis(vertical);
  return { rudder, engineOrder: throttle > 0 ? 2 + Math.ceil(throttle * 6)
    : throttle < 0 ? 2 - Math.ceil(-throttle * 2) : 2 };
}

export function createGamepadInput({ getGamepads, direction, fire, cycleStation, action, analog = () => {}, status = () => {}, activity = () => {}, throttleHold = () => {}, profiles = {}, contextActions = () => null }) {
  let identity = null, context = null, armed = false, x = 0, y = 0, firing = false;
  let buttons = {}, activeActions = null;
  const layouts = new Map();
  function profileFor(pad) {
    if (!pad || pad.connected === false) return null;
    const key = controllerKey(pad);
    if (!layouts.has(key)) layouts.set(key, resolveBindings(pad, profiles));
    return layouts.get(key);
  }
  let analogX = 0, analogY = 0, analogAxes = {};
  let throttleHeld = false, throttleUnlockReady = false;
  function setThrottleHold(held) {
    if (held === throttleHeld) return;
    throttleHeld = held;
    throttleHold(held);
  }
  const commandAxes = axes => throttleHeld && axes.y ? { ...axes, y: false } : axes;
  function reset() {
    if (x) direction(x < 0 ? 'left' : 'right', false);
    if (y) direction(y < 0 ? 'up' : 'down', false);
    if (firing) fire(false);
    if (analogX || analogY) analog(0, 0, commandAxes(analogAxes));
    analogX = analogY = 0; analogAxes = {};
    x = y = 0; firing = false; armed = false; buttons = {};
  }
  function axis(value, previous) {
    if (!Number.isFinite(value)) return 0;
    if (value >= .35) return 1;
    if (value <= -.35) return -1;
    return Math.abs(value) > .22 && value * previous > 0 ? previous : 0;
  }
  return {
    reset,
    clearThrottleHold() { setThrottleHold(false); throttleUnlockReady = false; },
    get throttleHeld() { return throttleHeld; },
    update(enabled, nextContext, bridgeAxes = {}) {
      let pads;
      try { pads = getGamepads(); } catch { pads = []; }
      const pad = Array.from(pads ?? []).find(pad => profileFor(pad));
      const layout = profileFor(pad);
      const nextIdentity = pad ? `${pad.index}:${controllerKey(pad)}` : null;
      if (nextIdentity !== identity) {
        reset(); identity = nextIdentity; status(pad?.id ?? null, pad ? { bindings: layout, custom: Object.hasOwn(profiles, controllerKey(pad)) } : null);
      }
      if (!enabled || !pad) { reset(); context = null; return; }
      if (context !== nextContext) { reset(); context = nextContext; activeActions = contextActions(); }
      const horizontalAction = bridgeAxes.x ? 'directX' : 'aimX';
      const verticalAction = bridgeAxes.y ? 'directY' : 'aimY';
      const horizontal = !activeActions || activeActions.has(horizontalAction) ? bindingValue(pad, layout[horizontalAction]) : 0;
      const vertical = !activeActions || activeActions.has(verticalAction) ? bindingValue(pad, layout[verticalAction]) : 0;
      const left = bridgeAxes.x ? 'left' : 'aimLeft', right = bridgeAxes.x ? 'right' : 'aimRight';
      const up = bridgeAxes.y ? 'up' : 'aimUp', down = bridgeAxes.y ? 'down' : 'aimDown';
      const rawPressed = name => !!bindingValue(pad, layout[name]);
      const pressed = name => (!activeActions || activeActions.has(name)) && rawPressed(name);
      // Even a currently inactive held button must be released before a new station is armed.
      const anyButton = CONTROLLER_ACTIONS.some(name => !isAnalogAction(name) && rawPressed(name));
      const buttonX = Number(pressed(right)) - Number(pressed(left));
      const buttonY = Number(pressed(down)) - Number(pressed(up));
      if (!armed) {
        // Reconnects, focus changes and station changes must never fire or steer by surprise.
        armed = Math.abs(horizontal) <= (bridgeAxes.x ? .18 : .22) && Math.abs(vertical) <= (bridgeAxes.y ? .18 : .22)
          && !anyButton;
        if (armed && throttleHeld && bridgeAxes.y) throttleUnlockReady = true;
        return;
      }
      if (x || y || Math.abs(horizontal) >= (bridgeAxes.x ? .18 : .35) || Math.abs(vertical) >= (bridgeAxes.y ? .18 : .35) || anyButton) activity();
      const rising = name => pressed(name) && !buttons[name];
      if (rising('stationPrevious') !== rising('stationNext')) {
        const step = rising('stationPrevious') ? -1 : 1;
        reset(); cycleStation(step); return;
      }
      // Absolute bridge commands are separate from the digital aiming controls.
      // A neutral connected controller never overwrites keyboard commands.
      const clean = value => Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
      // C buttons are keyboard-style controls. Once used, neutral stick polling must
      // leave their persistent gear/rudder setting alone until the stick moves again.
      const usingButtonX = pressed(left) || pressed(right);
      const usingButtonY = pressed(up) || pressed(down);
      if (usingButtonX) analogX = 0;
      if (usingButtonY) analogY = 0;
      const effectiveAxes = usingButtonX || usingButtonY
        ? { ...bridgeAxes, x: bridgeAxes.x && !usingButtonX, y: bridgeAxes.y && !usingButtonY } : bridgeAxes;
      const ax = effectiveAxes.x && Math.abs(horizontal) > .18 ? clean(horizontal) : 0;
      const ay = effectiveAxes.y && Math.abs(vertical) > .18 ? clean(vertical) : 0;
      // Only a fresh vertical movement at the helm releases held throttle.
      // Horizontal steering, aiming and station-change neutralisation do not.
      let resumedThrottle = false;
      if (throttleHeld && bridgeAxes.y) {
        if (Math.abs(vertical) <= .18) throttleUnlockReady = true;
        else if (throttleUnlockReady) { setThrottleHold(false); resumedThrottle = true; }
      }
      if (ax !== analogX || ay !== analogY || resumedThrottle) analog(ax, ay, commandAxes(effectiveAxes));
      analogX = ax; analogY = ay; analogAxes = effectiveAxes;
      const nx = buttonX || (bridgeAxes.x ? 0 : axis(horizontal, x)), ny = buttonY || (bridgeAxes.y ? 0 : axis(vertical, y));
      if (nx !== x) {
        if (x) direction(x < 0 ? 'left' : 'right', false);
        if (nx) direction(nx < 0 ? 'left' : 'right', true);
      }
      if (ny !== y) {
        if (y) direction(y < 0 ? 'up' : 'down', false);
        if (ny) direction(ny < 0 ? 'up' : 'down', true);
      }
      x = nx; y = ny;
      const nextFire = pressed('fire');
      if (nextFire !== firing) fire(nextFire);
      firing = nextFire;
      if (rising('throttleHold') && bridgeAxes.y && !throttleHeld) {
        setThrottleHold(true);
        throttleUnlockReady = Math.abs(vertical) <= .18;
      }
      for (const command of ['zoom', 'depth-charge', 'align', 'help', 'ascend', 'dive', 'forward-scope', 'observation-scope']) {
        if (rising(command)) action(command);
      }
      buttons = Object.fromEntries(CONTROLLER_ACTIONS.map(name => [name, pressed(name)]));
    }
  };
}
