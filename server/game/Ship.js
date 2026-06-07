import { engineOrderSpeed } from "./EngineOrders.js";
import { clamp, normalizeAngle } from "./MathUtils.js";
import { Vector2 } from "./Vector2.js";

export class Ship {
  constructor({ id, teamId, position, heading = 0, controlledBy = "bot" }) {
    this.id = id;
    this.teamId = teamId;
    this.position = position.clone();
    this.heading = heading;
    this.speed = 0;
    this.turnVelocity = 0;
    this.engineOrder = 2;
    this.rudderDegrees = 0;
    this.controlledBy = controlledBy;
    this.state = "active";
    this.torpedoesRemaining = 6;
    this.nextFireTime = 0;
  }

  applyCommand(command) {
    if (this.state !== "active") return;

    if (Number.isInteger(command.engineOrder)) {
      this.engineOrder = clamp(command.engineOrder, 0, 8);
    }
    if (Number.isFinite(command.rudderDegrees)) {
      this.rudderDegrees = clamp(command.rudderDegrees, -35, 35);
    }
  }

  update(deltaSeconds) {
    if (this.state !== "active") return;

    const targetSpeed = engineOrderSpeed(this.engineOrder);
    const speedResponse = Math.abs(targetSpeed) > Math.abs(this.speed) ? 0.45 : 0.75;
    this.speed += (targetSpeed - this.speed) * Math.min(1, deltaSeconds * speedResponse);

    const rudderRatio = this.rudderDegrees / 35;
    const turnStrength = this.speed >= 0 ? 0.34 : -0.22;
    const rudderGrip = clamp(0.15 + Math.abs(this.speed) / 5.2, 0.15, 1);
    const targetTurnVelocity = rudderRatio * turnStrength * rudderGrip;
    this.turnVelocity += (targetTurnVelocity - this.turnVelocity) * Math.min(1, deltaSeconds * 2.0);
    this.heading = normalizeAngle(this.heading + this.turnVelocity * deltaSeconds);

    const forward = Vector2.fromHeading(this.heading);
    this.position = this.position.add(forward.scale(this.speed * deltaSeconds));
  }

  canFire(nowSeconds) {
    return this.state === "active" && this.torpedoesRemaining > 0 && nowSeconds >= this.nextFireTime;
  }

  markFired(nowSeconds, cooldownSeconds = 2.4) {
    this.torpedoesRemaining -= 1;
    this.nextFireTime = nowSeconds + cooldownSeconds;
  }

  sink() {
    this.state = "sunk";
    this.speed = 0;
    this.turnVelocity = 0;
    this.rudderDegrees = 0;
  }

  snapshot() {
    return {
      id: this.id,
      teamId: this.teamId,
      x: round(this.position.x),
      z: round(this.position.z),
      heading: round(this.heading),
      speed: round(this.speed),
      rudderDegrees: Math.round(this.rudderDegrees),
      engineOrder: this.engineOrder,
      state: this.state,
      controlledBy: this.controlledBy,
      torpedoesRemaining: this.torpedoesRemaining
    };
  }
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
