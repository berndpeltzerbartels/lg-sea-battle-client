import test from "node:test";
import assert from "node:assert/strict";
import { moveShipOnWater } from "../src/shipMovement.js";

test("grounding cannot push the ship sideways at any frame rate", () => {
  for (const fps of [20, 60, 144]) {
    const position = { x: 12, y: 0.28, z: 40 };
    for (let i = 0; i < fps * 5; i++) {
      assert.equal(moveShipOnWater(position, { x: 0, z: 1 }, 8 / fps, () => false), false);
    }
    assert.deepEqual(position, { x: 12, y: 0.28, z: 40 });
  }
});

test("blocked forward motion can reverse into free water and approach again", () => {
  const position = { x: 12, y: 0.28, z: 40 };
  const canMove = candidate => candidate.z <= 40;
  const forward = { x: 0, z: 1 };
  assert.equal(moveShipOnWater(position, forward, 1, canMove), false);
  assert.equal(moveShipOnWater(position, forward, -2, canMove), true);
  assert.equal(position.z, 38);
  assert.equal(moveShipOnWater(position, forward, 1, canMove), true);
  assert.equal(moveShipOnWater(position, forward, 2, canMove), false);
  assert.deepEqual(position, { x: 12, y: 0.28, z: 39 });
});

test("large landscapes do not redirect ships at the old 5000m ocean-patch boundary", () => {
  for (const start of [-8500, -5001, 4999, 8500]) {
    const position = { x: start, y: -8, z: start };
    assert.equal(moveShipOnWater(position, { x: 0.6, z: 0.8 }, 5, () => true), true);
    assert.deepEqual(position, { x: start + 3, y: -8, z: start + 4 });
    assert.equal(moveShipOnWater(position, { x: 0.6, z: 0.8 }, -5, () => true), true);
    assert.deepEqual(position, { x: start, y: -8, z: start });
  }
});
