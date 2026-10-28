export function trackPlayerActivity({ target = window, send, expired, schedule = setInterval,
  cancel = clearInterval }) {
  let changed = false;
  let sending = false;
  let stopped = false;
  const input = (event) => { if (event.isTrusted) changed = true; };
  const events = ["keydown", "pointerdown", "pointermove", "wheel", "touchstart"];
  const tick = async () => {
    if (stopped || !changed || sending) return;
    changed = false;
    sending = true;
    try {
      const response = await send();
      if (response.status === 403) { stop(); expired(); }
      else if (!response.ok) changed = true;
    } catch {
      changed = true;
    } finally { sending = false; }
  };
  const stop = () => {
    stopped = true;
    cancel(timer);
    for (const name of events) target.removeEventListener(name, input, true);
  };
  for (const name of events) target.addEventListener(name, input, { capture: true, passive: true });
  const timer = schedule(tick, 5000);
  // Gamepad polling has no DOM isTrusted event; only actual controller input calls this.
  stop.markActive = () => { if (!stopped) changed = true; };
  return stop;
}
