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

export function createGamepadInput({ getGamepads, direction, fire, cycleStation, action, analog = () => {}, status = () => {}, activity = () => {}, throttleHold = () => {} }) {
  let identity = null, context = null, armed = false, x = 0, y = 0, firing = false;
  let buttons = [];
  let analogX = 0, analogY = 0, analogAxes = {};
  let throttleHeld = false, throttleUnlockReady = false;
  function setThrottleHold(held) {
    if (held === throttleHeld) return;
    throttleHeld = held;
    throttleHold(held);
  }
  const commandAxes = axes => throttleHeld && axes.y ? { ...axes, y: false } : axes;
  const pressed = (pad, index) => !!pad.buttons[index]?.pressed || pad.buttons[index]?.value > .55;
  function reset() {
    if (x) direction(x < 0 ? 'left' : 'right', false);
    if (y) direction(y < 0 ? 'up' : 'down', false);
    if (firing) fire(false);
    if (analogX || analogY) analog(0, 0, commandAxes(analogAxes));
    analogX = analogY = 0; analogAxes = {};
    x = y = 0; firing = false; armed = false; buttons = [];
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
      const pad = Array.from(pads ?? []).find(pad => pad?.connected !== false && pad?.mapping === 'standard');
      const nextIdentity = pad ? `${pad.index}:${pad.id}` : null;
      if (nextIdentity !== identity) {
        reset(); identity = nextIdentity; status(pad?.id ?? null);
      }
      if (!enabled || !pad) { reset(); context = nextContext; return; }
      if (context !== nextContext) { reset(); context = nextContext; }
      const horizontal = pad.axes[0] ?? 0, vertical = pad.axes[1] ?? 0;
      if (!armed) {
        // Reconnects, focus changes and station changes must never fire or steer by surprise.
        armed = Math.abs(horizontal) <= (bridgeAxes.x ? .18 : .22) && Math.abs(vertical) <= (bridgeAxes.y ? .18 : .22)
          && !pad.buttons.some((_, i) => pressed(pad, i));
        if (armed && throttleHeld && bridgeAxes.y) throttleUnlockReady = true;
        return;
      }
      if (x || y || Math.abs(horizontal) >= (bridgeAxes.x ? .18 : .35) || Math.abs(vertical) >= (bridgeAxes.y ? .18 : .35) || pad.buttons.some((_, i) => pressed(pad, i))) activity();
      const rising = index => pressed(pad, index) && !buttons[index];
      if (rising(3)) { reset(); cycleStation(1); return; }
      if (rising(4) !== rising(5)) {
        if (rising(4)) { reset(); cycleStation(-1); return; }
        if (rising(5)) { reset(); cycleStation(1); return; }
      }
      // Absolute bridge commands are separate from the digital aiming controls.
      // A neutral connected controller never overwrites keyboard commands.
      const clean = value => Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
      const ax = bridgeAxes.x && Math.abs(horizontal) > .18 ? clean(horizontal) : 0;
      const ay = bridgeAxes.y && Math.abs(vertical) > .18 ? clean(vertical) : 0;
      // Only a fresh vertical movement at the helm releases held throttle.
      // Horizontal steering, aiming and station-change neutralisation do not.
      let resumedThrottle = false;
      if (throttleHeld && bridgeAxes.y) {
        if (Math.abs(vertical) <= .18) throttleUnlockReady = true;
        else if (throttleUnlockReady) { setThrottleHold(false); resumedThrottle = true; }
      }
      if (ax !== analogX || ay !== analogY || resumedThrottle) analog(ax, ay, commandAxes(bridgeAxes));
      analogX = ax; analogY = ay; analogAxes = bridgeAxes;
      const nx = bridgeAxes.x ? 0 : axis(horizontal, x), ny = bridgeAxes.y ? 0 : axis(vertical, y);
      if (nx !== x) {
        if (x) direction(x < 0 ? 'left' : 'right', false);
        if (nx) direction(nx < 0 ? 'left' : 'right', true);
      }
      if (ny !== y) {
        if (y) direction(y < 0 ? 'up' : 'down', false);
        if (ny) direction(ny < 0 ? 'up' : 'down', true);
      }
      x = nx; y = ny;
      const nextFire = pressed(pad, 7);
      if (nextFire !== firing) fire(nextFire);
      firing = nextFire;
      if (rising(10) && bridgeAxes.y && !throttleHeld) {
        setThrottleHold(true);
        throttleUnlockReady = Math.abs(vertical) <= .18;
      }
      for (const [button, command] of [[6, 'zoom'], [2, 'depth-charge'], [1, 'align'],
        [9, 'help'], [12, 'ascend'], [13, 'dive'], [14, 'forward-scope'], [15, 'observation-scope']]) {
        if (rising(button)) action(command);
      }
      buttons = pad.buttons.map((_, i) => pressed(pad, i));
    }
  };
}
