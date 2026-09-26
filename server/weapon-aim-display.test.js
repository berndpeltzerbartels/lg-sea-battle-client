import test from "node:test";
import assert from "node:assert/strict";
import { WeaponAimDisplay } from "../src/weaponAimDisplay.js";

test("observer eases toward aim without jumping or overshooting", () => {
  const aim = new WeaponAimDisplay();
  aim.update("ship", 0, 0, true, 0);
  aim.update("ship", 1, 0.4, true, 1 / 60);
  assert.ok(aim.yaw > 0 && aim.yaw < 0.3);
  assert.ok(aim.pitch > 0 && aim.pitch < 0.4);
  for (let i = 0; i < 60; i++) aim.update("ship", 1, 0.4, true, 1 / 60);
  assert.ok(Math.abs(aim.yaw - 1) < 0.00001);
});

test("local control and ship changes apply immediately", () => {
  const aim = new WeaponAimDisplay();
  aim.update("ship", 1, 0.4, true, 0);
  assert.equal(aim.yaw, 1);
  aim.update("ship", 2, 0.2, false, 1 / 60);
  assert.equal(aim.yaw, 2);
  aim.update("replacement", -1, 0.1, true, 1 / 60);
  assert.equal(aim.yaw, -1);
});

test("yaw takes shortest route across wraparound", () => {
  const aim = new WeaponAimDisplay();
  aim.update("ship", Math.PI - 0.05, 0, true, 0);
  aim.update("ship", -Math.PI + 0.05, 0, true, 1 / 60);
  assert.ok(aim.yaw > Math.PI - 0.05 && aim.yaw < Math.PI + 0.05);
});

test("smoothing is independent of frame rate", () => {
  const values = [30, 60, 144].map(fps => {
    const aim = new WeaponAimDisplay();
    aim.update("ship", 0, 0, true, 0);
    for (let i = 0; i < fps; i++) aim.update("ship", 1, 0.4, true, 1 / fps);
    return aim.yaw;
  });
  assert.ok(Math.max(...values) - Math.min(...values) < 1e-12);
});
