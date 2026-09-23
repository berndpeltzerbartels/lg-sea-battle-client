import test from "node:test";
import assert from "node:assert/strict";
import { moveShipOnWater } from "../src/shipMovement.js";

test("grounding cannot push the ship sideways at any frame rate", () => {
  for (const fps of [20, 60, 144]) {
    const position = { x: 12, y: 0.28, z: 40 };
    for (let i = 0; i < fps * 5; i++) {
      assert.equal(moveShipOnWater(position, { x: 0, z: 1 }, 8 / fps, 1000, () => false), false);
    }
    assert.deepEqual(position, { x: 12, y: 0.28, z: 40 });
  }
});

test("blocked forward motion can reverse into free water and approach again", () => {
  const position = { x: 12, y: 0.28, z: 40 };
  const canMove = candidate => candidate.z <= 40;
  const forward = { x: 0, z: 1 };
  assert.equal(moveShipOnWater(position, forward, 1, 1000, canMove), false);
  assert.equal(moveShipOnWater(position, forward, -2, 1000, canMove), true);
  assert.equal(position.z, 38);
  assert.equal(moveShipOnWater(position, forward, 1, 1000, canMove), true);
  assert.equal(moveShipOnWater(position, forward, 2, 1000, canMove), false);
  assert.deepEqual(position, { x: 12, y: 0.28, z: 39 });
});

test("free motion follows heading and respects world bounds", () => {
  const position = { x: 9, y: -8, z: 9 };
  assert.equal(moveShipOnWater(position, { x: 0.6, z: 0.8 }, 5, 10, () => true), true);
  assert.deepEqual(position, { x: 10, y: -8, z: 10 });
});
