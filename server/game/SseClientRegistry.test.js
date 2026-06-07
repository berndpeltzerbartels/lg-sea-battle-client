import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { SseClientRegistry } from "./SseClientRegistry.js";

test("registry writes SSE data payloads to registered clients", () => {
  const registry = new SseClientRegistry();
  const response = new FakeResponse();

  registry.register("player:one", response);
  registry.sendTo("player:one", { type: "state", t: 1 });

  assert.equal(response.writes.length, 1);
  assert.match(response.writes[0], /^data:/);
  assert.match(response.writes[0], /"type":"state"/);
});

test("registry removes closed clients", () => {
  const registry = new SseClientRegistry();
  const response = new FakeResponse();

  registry.register("player:one", response);
  response.emit("close");

  assert.equal(registry.connectionCount(), 0);
});

class FakeResponse extends EventEmitter {
  constructor() {
    super();
    this.writes = [];
    this.destroyed = false;
  }

  write(data) {
    this.writes.push(data);
  }
}
