import { clamp, normalizeAngle, randomBetween } from "./MathUtils.js";

export class BotCaptain {
  constructor({ fireArcRadians = 0.18, aimingErrorRadians = 0.045 } = {}) {
    this.fireArcRadians = fireArcRadians;
    this.aimingErrorRadians = aimingErrorRadians;
  }

  commandShip(ship, enemyShips, nowSeconds) {
    if (ship.state !== "active" || ship.controlledBy !== "bot") return null;

    const target = this.findTarget(ship, enemyShips);
    if (!target) {
      return this.patrolCommand(ship, nowSeconds);
    }

    const desiredHeading = Math.atan2(target.position.x - ship.position.x, target.position.z - ship.position.z);
    const headingError = normalizeAngle(desiredHeading - ship.heading);
    const perceivedHeadingError = normalizeAngle(headingError + randomBetween(-this.aimingErrorRadians, this.aimingErrorRadians));
    const rudderDegrees = clamp(headingError * 55, -35, 35);
    const distance = ship.position.distanceTo(target.position);
    const engineOrder = distance > 150 ? 6 : 4;

    return {
      engineOrder,
      rudderDegrees,
      shouldFire: Math.abs(perceivedHeadingError) < this.fireArcRadians && distance > 65 && distance < 360
    };
  }

  findTarget(ship, enemyShips) {
    return enemyShips
      .map((enemy) => ({ enemy, distance: ship.position.distanceTo(enemy.position) }))
      .sort((a, b) => a.distance - b.distance)[0]?.enemy ?? null;
  }

  patrolCommand(ship, nowSeconds) {
    const turnWave = Math.sin(nowSeconds * 0.08 + ship.id.length) * 12;
    return {
      engineOrder: 4,
      rudderDegrees: turnWave,
      shouldFire: false
    };
  }

}
