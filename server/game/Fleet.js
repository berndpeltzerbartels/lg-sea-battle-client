export class Fleet {
  constructor({ teamId, ships }) {
    this.teamId = teamId;
    this.ships = ships;
    this.activeShipIdByPlayerId = new Map();
  }

  activeShips() {
    return this.ships.filter((ship) => ship.state === "active");
  }

  hasActiveShips() {
    return this.activeShips().length > 0;
  }

  assignNextShipToPlayer(playerId) {
    const availableShip = this.activeShips().find((ship) => ship.controlledBy === "bot") ?? null;
    if (!availableShip) return null;

    availableShip.controlledBy = "player";
    availableShip.nextFireTime = 0;
    this.activeShipIdByPlayerId.set(playerId, availableShip.id);
    return availableShip;
  }

  replaceDestroyedPlayerShip(playerId) {
    this.activeShipIdByPlayerId.delete(playerId);
    return this.assignNextShipToPlayer(playerId);
  }

  shipForPlayer(playerId) {
    const shipId = this.activeShipIdByPlayerId.get(playerId);
    return this.ships.find((ship) => ship.id === shipId && ship.state === "active") ?? null;
  }
}
