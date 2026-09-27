import test from "node:test";
import assert from "node:assert/strict";
import { WeaponHeadingHold, WeaponShotEvents } from "../src/weaponPresentation.js";

test("alignment disables heading hold until that weapon is manually moved", () => {
  const hold = new WeaponHeadingHold();
  hold.align("cannon");
  assert.equal(hold.follows("cannon"), false);
  hold.manual("flak");
  assert.equal(hold.follows("cannon"), false);
  hold.manual("cannon");
  assert.equal(hold.follows("cannon"), true);
});

test("retained shots emit once without a live projectile and skip the local shooter", () => {
  const events = new WeaponShotEvents();
  const emitted = [];
  const shots = [
    { id: "cannon-1", firedAt: 1, shooterPlayerId: "gunner" },
    { id: "flak-2", firedAt: 1, shooterPlayerId: "self" }
  ];
  const emit = shot => emitted.push(shot.id);
  events.consume("session", shots, "self", emit);
  events.consume("session", shots, "self", emit);
  assert.deepEqual(emitted, ["cannon-1"]);
  events.consume("session", [], "self", emit);
  assert.equal(events.seen.size, 0);
  events.consume("new-session", shots, "self", emit);
  assert.equal(emitted.length, 2);
});

test("bridge receives every flak flash once even when no projectile remains", () => {
  const events = new WeaponShotEvents();
  const emitted = [];
  const emit = shot => emitted.push(shot.id);
  const shot = index => ({ id: `flak-${index}`, firedAt: index / 10, shooterPlayerId: "gunner" });
  events.consume("session", [shot(1), shot(2)], "captain", emit);
  events.consume("session", [shot(1), shot(2), shot(3)], "captain", emit);
  events.consume("session", [shot(2), shot(3)], "captain", emit);
  assert.deepEqual(emitted, ["flak-1", "flak-2", "flak-3"]);
});
