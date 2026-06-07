import { BotCaptain } from "./BotCaptain.js";
import { Fleet } from "./Fleet.js";
import { Ship } from "./Ship.js";
import { ShipVisibility } from "./ShipVisibility.js";
import { Torpedo } from "./Torpedo.js";
import { Vector2 } from "./Vector2.js";

const SHIP_HIT_RADIUS = 5.2;

export class GameSession {
  constructor({ id = "local-test", botCaptain = new BotCaptain(), shipVisibility = new ShipVisibility() } = {}) {
    this.id = id;
    this.nowSeconds = 0;
    this.nextTorpedoId = 1;
    this.botCaptain = botCaptain;
    this.shipVisibility = shipVisibility;
    this.fleets = createStartingFleets();
    this.torpedoes = [];
    this.events = [];
    this.state = "running";
  }

  applyPlayerCommand(playerId, command) {
    const ship = this.findShipForPlayer(playerId);
    if (!ship) return false;

    if (command.type === "helm") {
      ship.applyCommand(command);
      this.events.push({ type: "shipCommanded", shipId: ship.id, at: this.nowSeconds });
      return true;
    }

    if (command.type === "fire") {
      return this.fireTorpedo(ship, this.nowSeconds);
    }

    return false;
  }

  assignPlayer(playerId, teamId) {
    const fleet = this.fleets.get(teamId);
    if (!fleet) return null;
    return fleet.assignNextShipToPlayer(playerId);
  }

  update(deltaSeconds) {
    if (this.state !== "running") return;

    this.nowSeconds += deltaSeconds;
    this.updateBots();
    this.updateShips(deltaSeconds);
    this.updateTorpedoes(deltaSeconds);
    this.checkGameOver();
  }

  pullEvents() {
    const pulled = this.events;
    this.events = [];
    return pulled;
  }

  snapshot() {
    return {
      type: "state",
      sessionId: this.id,
      state: this.state,
      t: round(this.nowSeconds),
      ships: this.allShips()
        .filter((ship) => ship.state === "active")
        .map((ship) => ship.snapshot()),
      torpedoes: this.torpedoes
        .filter((torpedo) => torpedo.state === "running")
        .map((torpedo) => torpedo.snapshot())
    };
  }

  updateBots() {
    for (const ship of this.allShips()) {
      if (ship.controlledBy !== "bot" || ship.state !== "active") continue;

      const enemyShips = this.shipVisibility.visibleEnemyShips(ship, this.enemyShipsForTeam(ship.teamId));
      const command = this.botCaptain.commandShip(ship, enemyShips, this.nowSeconds);
      if (!command) continue;

      ship.applyCommand(command);
      if (command.shouldFire) {
        this.fireTorpedo(ship, this.nowSeconds, command.fireHeadingOffsetRadians ?? 0);
      }
    }
  }

  updateShips(deltaSeconds) {
    this.allShips().forEach((ship) => ship.update(deltaSeconds));
  }

  updateTorpedoes(deltaSeconds) {
    for (const torpedo of this.torpedoes) {
      torpedo.update(deltaSeconds);
      if (torpedo.state !== "running") continue;

      const hitShip = this.enemyShipsForTeam(torpedo.teamId)
        .find((ship) => ship.position.distanceTo(torpedo.position) <= SHIP_HIT_RADIUS);
      if (hitShip) {
        hitShip.sink();
        torpedo.state = "hit";
        this.events.push({
          type: "torpedoHitShip",
          torpedoId: torpedo.id,
          shipId: hitShip.id,
          x: round(torpedo.position.x),
          z: round(torpedo.position.z),
          at: round(this.nowSeconds)
        });
      }
    }

    this.torpedoes = this.torpedoes.filter((torpedo) => torpedo.state === "running");
  }

  fireTorpedo(ship, nowSeconds, headingOffsetRadians = 0) {
    if (!ship.canFire(nowSeconds)) return false;

    const cooldownSeconds = ship.controlledBy === "bot" ? 8.0 : 2.4;
    ship.markFired(nowSeconds, cooldownSeconds);
    const muzzlePosition = ship.position.add(Vector2.fromHeading(ship.heading).scale(5.0));
    const torpedoHeading = ship.heading + headingOffsetRadians;
    const torpedo = new Torpedo({
      id: `torpedo-${this.nextTorpedoId++}`,
      teamId: ship.teamId,
      shipId: ship.id,
      position: muzzlePosition,
      heading: torpedoHeading,
      firedAtSeconds: nowSeconds
    });
    this.torpedoes.push(torpedo);
    this.events.push({
      type: "torpedoFired",
      torpedo: torpedo.snapshot(),
      at: round(nowSeconds)
    });
    return true;
  }

  checkGameOver() {
    const aliveFleets = [...this.fleets.values()].filter((fleet) => fleet.hasActiveShips());
    if (aliveFleets.length <= 1) {
      this.state = "finished";
      this.events.push({ type: "gameOver", winningTeamId: aliveFleets[0]?.teamId ?? null, at: round(this.nowSeconds) });
    }
  }

  findShipForPlayer(playerId) {
    for (const fleet of this.fleets.values()) {
      const ship = fleet.shipForPlayer(playerId);
      if (ship) return ship;
    }
    return null;
  }

  allShips() {
    return [...this.fleets.values()].flatMap((fleet) => fleet.ships);
  }

  enemyShipsForTeam(teamId) {
    return this.allShips().filter((ship) => ship.teamId !== teamId);
  }
}

function createStartingFleets() {
  return new Map([
    ["red", new Fleet({ teamId: "red", ships: createShips("red", -420, -220, 0.85) })],
    ["blue", new Fleet({ teamId: "blue", ships: createShips("blue", 420, 220, -2.3) })]
  ]);
}

function createShips(teamId, baseX, baseZ, heading) {
  return Array.from({ length: 5 }, (_, index) => {
    const ship = new Ship({
      id: `${teamId}-${index + 1}`,
      teamId,
      position: new Vector2(baseX + index * 18, baseZ + (index % 2) * 26),
      heading,
      controlledBy: "bot"
    });
    ship.nextFireTime = 5 + index * 2.5;
    return ship;
  });
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
