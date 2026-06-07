import { Vector2 } from "./Vector2.js";

export class Torpedo {
  constructor({ id, teamId, shipId, position, heading, speed = 24, firedAtSeconds, maxRange = 620 }) {
    this.id = id;
    this.teamId = teamId;
    this.shipId = shipId;
    this.position = position.clone();
    this.startPosition = position.clone();
    this.heading = heading;
    this.speed = speed;
    this.firedAtSeconds = firedAtSeconds;
    this.maxRange = maxRange;
    this.runDistance = 0;
    this.state = "running";
  }

  update(deltaSeconds) {
    if (this.state !== "running") return;

    const forward = Vector2.fromHeading(this.heading);
    const step = this.speed * deltaSeconds;
    this.position = this.position.add(forward.scale(step));
    this.runDistance += step;
    if (this.runDistance >= this.maxRange) {
      this.state = "expired";
    }
  }

  snapshot() {
    return {
      id: this.id,
      teamId: this.teamId,
      shipId: this.shipId,
      x: round(this.position.x),
      z: round(this.position.z),
      heading: round(this.heading),
      speed: round(this.speed),
      state: this.state,
      firedAt: round(this.firedAtSeconds)
    };
  }
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
