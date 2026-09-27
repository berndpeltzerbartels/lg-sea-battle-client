import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const start = source.indexOf("function applyServerGameSnapshot(snapshot) {");
const guard = source.slice(start, source.indexOf("  const snapshotClientTime =", start)) + " accepted++; }";

test("restart check works without a crew stream and tolerates an offline server", async () => {
  const start = source.indexOf("async function checkServerRestart() {");
  const end = source.indexOf("\n}\n", start) + 2;
  const ctx = {
    serverRestartPending: false, gameState: { instanceId: "old" },
    getGameStateEndpoint: () => "/game/state",
    fetch: async () => { throw new Error("offline"); },
    applyServerGameSnapshot: snapshot => { ctx.serverRestartPending = snapshot.instanceId === "new"; }
  };
  const check = runInNewContext(source.slice(start, end) + "\ncheckServerRestart", ctx);
  assert.equal(await check(), false);
  ctx.fetch = async () => ({ ok: true, json: async () => ({ instanceId: "old", ships: [] }) });
  assert.equal(await check(), false);
  ctx.fetch = async () => ({ ok: true, json: async () => ({ instanceId: "new", ships: [] }) });
  assert.equal(await check(), true);
});

test("new server instance sinks once even with identical ship IDs; old packets cannot revive it", () => {
  const ctx = {
    gameState: { instanceId: "old" }, serverRestartPending: false,
    sideViewSandboxMode: false, playerDamageState: "active", time: 10,
    pendingPlayerServerShip: {}, playerServerTarget: {}, accepted: 0,
    document: { body: { dataset: {} } }, calls: 0
  };
  ctx.beginPlayerSinking = () => { ctx.calls++; ctx.playerDamageState = "sinking"; };
  runInNewContext(guard + `
    applyServerGameSnapshot({ instanceId: "old", ships: [{id: "S1"}] });
    applyServerGameSnapshot({ instanceId: "new", ships: [{id: "S1"}] });
    applyServerGameSnapshot({ instanceId: "new", ships: [{id: "S1"}] });
    applyServerGameSnapshot({ instanceId: "old", ships: [{id: "S1"}] });
  `, ctx);
  assert.equal(ctx.accepted, 1);
  assert.equal(ctx.calls, 1);
  assert.equal(ctx.pendingPlayerServerShip, null);
  assert.equal(ctx.playerServerTarget, null);
  assert.equal(ctx.serverRestartPending, true);
});

test("restart reloads before either ship or plane can respawn locally", () => {
  for (const name of ["respawnPlayerBoat(playerBoat)", "respawnPlayerScoutPlane(playerPlane)"]) {
    const start = source.indexOf(`function ${name} {`);
    const end = source.indexOf("\n  }", start) + 4;
    let reloads = 0;
    runInNewContext(source.slice(start, end) + `\n} ${name.split("(")[0]}({});`, {
      serverRestartPending: true, location: { reload() { reloads++; } }
    });
    assert.equal(reloads, 1);
  }
});
