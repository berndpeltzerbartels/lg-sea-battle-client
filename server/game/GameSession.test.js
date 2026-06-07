import test from "node:test";
import assert from "node:assert/strict";
import { BotCaptain } from "./BotCaptain.js";
import { GameSession } from "./GameSession.js";
import { ShipVisibility } from "./ShipVisibility.js";
import { Vector2 } from "./Vector2.js";

test("new game starts with two fleets of five ships", () => {
  const session = new GameSession();
  const snapshot = session.snapshot();

  assert.equal(snapshot.ships.length, 10);
  assert.equal(snapshot.ships.filter((ship) => ship.teamId === "red").length, 5);
  assert.equal(snapshot.ships.filter((ship) => ship.teamId === "blue").length, 5);
});

test("player can join a team and command the assigned ship", () => {
  const session = new GameSession();
  const ship = session.assignPlayer("player-1", "red");

  assert.equal(ship.controlledBy, "player");
  assert.equal(session.applyPlayerCommand("player-1", {
    type: "helm",
    engineOrder: 7,
    rudderDegrees: 12
  }), true);

  session.update(1);

  assert.equal(ship.engineOrder, 7);
  assert.equal(ship.rudderDegrees, 12);
  assert.notEqual(ship.speed, 0);
});

test("ship can fire a server-owned torpedo", () => {
  const session = new GameSession();
  const ship = session.assignPlayer("player-1", "red");

  assert.equal(session.applyPlayerCommand("player-1", { type: "fire" }), true);

  const snapshot = session.snapshot();
  assert.equal(snapshot.torpedoes.length, 1);
  assert.equal(snapshot.torpedoes[0].shipId, ship.id);
  assert.equal(ship.torpedoesRemaining, 5);
});

test("torpedo starts at the firing ship bow and runs forward", () => {
  const session = new GameSession();
  const ship = session.assignPlayer("player-1", "red");
  ship.position = new Vector2(10, 20);
  ship.heading = Math.PI / 2;

  session.applyPlayerCommand("player-1", { type: "fire" });
  const torpedo = session.snapshot().torpedoes[0];

  assert.equal(torpedo.x, 15);
  assert.equal(torpedo.z, 20);
  assert.equal(torpedo.heading, Math.round((Math.PI / 2) * 1000) / 1000);
});

test("torpedo hit sinks enemy ship and emits hit event", () => {
  const session = new GameSession();
  const redShip = session.assignPlayer("player-1", "red");
  const blueShip = session.enemyShipsForTeam("red")[0];
  blueShip.controlledBy = "player";
  redShip.position = new Vector2(0, 0);
  blueShip.position = new Vector2(0, 7);
  redShip.heading = 0;

  session.applyPlayerCommand("player-1", { type: "fire" });
  session.update(0.05);
  const events = session.pullEvents();

  assert.equal(blueShip.state, "sunk");
  assert.equal(session.snapshot().ships.some((ship) => ship.id === blueShip.id), false);
  assert.equal(events.some((event) => event.type === "torpedoHitShip"), true);
});

test("bot fires when an enemy ship crosses its firing line", () => {
  const session = new GameSession({
    botCaptain: new BotCaptain({ fireArcRadians: 0.18, aimingErrorRadians: 0 })
  });
  const redShip = session.allShips().find((ship) => ship.teamId === "red");
  const blueShip = session.allShips().find((ship) => ship.teamId === "blue");
  redShip.position = new Vector2(0, 0);
  redShip.heading = 0;
  redShip.engineOrder = 2;
  redShip.nextFireTime = 0;
  blueShip.position = new Vector2(0, 180);

  session.update(0.05);

  assert.ok(session.snapshot().torpedoes.length >= 1);
});

test("bot targets enemy bot ships too", () => {
  const session = new GameSession({
    botCaptain: new BotCaptain({ fireArcRadians: 0.18, aimingErrorRadians: 0 })
  });
  const redBot = session.allShips().find((ship) => ship.teamId === "red" && ship.controlledBy === "bot");
  const blueBot = session.allShips().find((ship) => ship.teamId === "blue" && ship.controlledBy === "bot");
  redBot.position = new Vector2(0, 0);
  redBot.heading = 0;
  redBot.nextFireTime = 0;
  blueBot.position = new Vector2(0, 180);

  session.update(0.05);

  assert.equal(session.snapshot().torpedoes.some((torpedo) => torpedo.shipId === redBot.id), true);
});

test("bot does not fire at ships outside radar visibility", () => {
  const session = new GameSession({
    botCaptain: new BotCaptain({ fireArcRadians: 0.18, aimingErrorRadians: 0 }),
    shipVisibility: new ShipVisibility({ radarRange: 100 })
  });
  const redShip = session.allShips().find((ship) => ship.teamId === "red");
  const blueShip = session.allShips().find((ship) => ship.teamId === "blue");
  redShip.position = new Vector2(0, 0);
  redShip.heading = 0;
  redShip.engineOrder = 2;
  redShip.nextFireTime = 0;
  blueShip.position = new Vector2(0, 180);

  session.update(0.05);

  assert.equal(session.snapshot().torpedoes.length, 0);
});
