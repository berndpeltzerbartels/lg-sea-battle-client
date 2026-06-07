export class SseClientRegistry {
  constructor() {
    this.clientsByKey = new Map();
  }

  register(key, response) {
    if (!this.clientsByKey.has(key)) {
      this.clientsByKey.set(key, new Set());
    }
    this.clientsByKey.get(key).add(response);
    response.on("close", () => this.unregister(key, response));
  }

  unregister(key, response) {
    const clients = this.clientsByKey.get(key);
    if (!clients) return;

    clients.delete(response);
    if (clients.size === 0) {
      this.clientsByKey.delete(key);
    }
  }

  sendTo(key, payload) {
    const clients = this.clientsByKey.get(key);
    if (!clients) return;

    for (const response of [...clients]) {
      this.write(response, payload);
    }
  }

  broadcast(payload) {
    const clients = new Set();
    for (const clientsForKey of this.clientsByKey.values()) {
      clientsForKey.forEach((client) => clients.add(client));
    }
    for (const response of clients) {
      this.write(response, payload);
    }
  }

  write(response, payload) {
    if (response.destroyed) return;
    response.write(`data:${JSON.stringify(payload)}\n\n`);
  }

  connectionCount() {
    let count = 0;
    for (const clients of this.clientsByKey.values()) {
      count += clients.size;
    }
    return count;
  }
}
