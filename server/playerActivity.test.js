import test from "node:test";
import assert from "node:assert/strict";
import { trackPlayerActivity } from "../src/playerActivity.js";

function setup(send) {
  const listeners = new Map();
  let tick, expired = false;
  const stop = trackPlayerActivity({
    target: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    send, expired: () => { expired = true; }, schedule: fn => { tick = fn; return 1; }, cancel: () => {}
  });
  return { input: trusted => listeners.get("keydown")({ isTrusted: trusted }),
    controller: () => stop.markActive(),
    tick: () => tick(), stop, listeners, expired: () => expired };
}
test("only actual input sends one activity report per interval, not idle timers or synthetic events", async () => {
  let calls = 0;
  const s = setup(async () => { calls++; return { ok: true }; });
  await s.tick(); s.input(false); await s.tick();
  assert.equal(calls, 0);
  s.input(true); s.input(true); await s.tick(); await s.tick();
  assert.equal(calls, 1);
  s.stop(); assert.equal(s.listeners.size, 0);
});
test("actual gamepad input keeps the session active using the existing report interval", async () => {
  let calls = 0;
  const s = setup(async () => { calls++; return { ok: true }; });
  await s.tick(); assert.equal(calls, 0);
  for (let i = 0; i < 60; i++) s.controller();
  await s.tick(); assert.equal(calls, 1);
  await s.tick(); assert.equal(calls, 1);
  s.stop(); s.controller(); await s.tick(); assert.equal(calls, 1);
});
test("expired sessions stop reporting and return to selection", async () => {
  const s = setup(async () => ({ status: 403 }));
  s.input(true); await s.tick();
  assert.equal(s.expired(), true);
  assert.equal(s.listeners.size, 0);
});
