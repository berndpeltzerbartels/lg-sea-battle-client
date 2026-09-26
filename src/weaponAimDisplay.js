export class WeaponAimDisplay {
  constructor() {
    this.shipId = null;
    this.yaw = 0;
    this.pitch = 0;
  }

  update(shipId, yaw, pitch, observed, dt) {
    if (![yaw, pitch].every(Number.isFinite)) return;
    if (this.shipId !== shipId || !observed) {
      this.shipId = shipId;
      this.yaw = yaw;
      this.pitch = pitch;
      return;
    }
    // Frame-rate independent easing, with no prediction or overshoot.
    const alpha = -Math.expm1(-Math.max(0, dt) / 0.085);
    const delta = Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw));
    this.yaw += delta * alpha;
    this.pitch += (pitch - this.pitch) * alpha;
  }
}
