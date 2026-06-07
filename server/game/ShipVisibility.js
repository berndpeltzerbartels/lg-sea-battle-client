export class ShipVisibility {
  constructor({ radarRange = 360 } = {}) {
    this.radarRange = radarRange;
  }

  visibleEnemyShips(observerShip, enemyShips) {
    return enemyShips.filter((enemyShip) => this.canSeeShip(observerShip, enemyShip));
  }

  canSeeShip(observerShip, targetShip) {
    if (observerShip.state !== "active" || targetShip.state !== "active") return false;

    return observerShip.position.distanceTo(targetShip.position) <= this.radarRange;
  }
}
