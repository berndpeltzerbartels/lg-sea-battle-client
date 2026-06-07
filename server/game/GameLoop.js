export class GameLoop {
  constructor({ session, tickRate = 20, snapshotRate = 4, onSnapshot = () => {}, onEvent = () => {} }) {
    this.session = session;
    this.tickRate = tickRate;
    this.snapshotRate = snapshotRate;
    this.onSnapshot = onSnapshot;
    this.onEvent = onEvent;
    this.tickTimer = null;
    this.snapshotTimer = null;
  }

  start() {
    if (this.tickTimer || this.snapshotTimer) return;

    const tickDeltaSeconds = 1 / this.tickRate;
    this.tickTimer = setInterval(() => {
      this.session.update(tickDeltaSeconds);
      this.session.pullEvents().forEach((event) => this.onEvent(event));
    }, 1000 / this.tickRate);

    this.snapshotTimer = setInterval(() => {
      this.onSnapshot(this.session.snapshot());
    }, 1000 / this.snapshotRate);
  }

  stop() {
    clearInterval(this.tickTimer);
    clearInterval(this.snapshotTimer);
    this.tickTimer = null;
    this.snapshotTimer = null;
  }
}
