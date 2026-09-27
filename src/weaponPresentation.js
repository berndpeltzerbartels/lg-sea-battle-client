export class WeaponHeadingHold {
  constructor() {
    this.enabled = { flak: true, cannon: true };
  }

  align(weapon) { this.enabled[weapon] = false; }
  manual(weapon) { this.enabled[weapon] = true; }
  follows(weapon) { return this.enabled[weapon]; }
}

export class WeaponShotEvents {
  constructor() {
    this.seen = new Set();
    this.sessionId = null;
  }

  consume(sessionId, shots, playerId, emit) {
    if (this.sessionId !== sessionId) {
      this.seen.clear();
      this.sessionId = sessionId;
    }
    const current = new Set();
    for (const shot of shots) {
      const key = `${shot.id}@${shot.firedAt}`;
      current.add(key);
      if (!this.seen.has(key) && shot.shooterPlayerId !== playerId) emit(shot);
    }
    this.seen = current;
  }
}
