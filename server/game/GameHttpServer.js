import { createServer } from "node:http";
import { URL } from "node:url";
import { GameLoop } from "./GameLoop.js";
import { GameSession } from "./GameSession.js";
import { SseClientRegistry } from "./SseClientRegistry.js";

export class GameHttpServer {
  constructor({ port = 8787, session = new GameSession() } = {}) {
    this.port = port;
    this.session = session;
    this.sseClients = new SseClientRegistry();
    this.loop = new GameLoop({
      session,
      tickRate: 20,
      snapshotRate: 4,
      onSnapshot: (snapshot) => this.sseClients.broadcast(snapshot),
      onEvent: (event) => this.sseClients.broadcast(event)
    });
    this.server = createServer((request, response) => this.handleRequest(request, response));
  }

  start() {
    this.loop.start();
    return new Promise((resolve) => {
      this.server.listen(this.port, () => resolve(this));
    });
  }

  stop() {
    this.loop.stop();
    return new Promise((resolve) => this.server.close(resolve));
  }

  async handleRequest(request, response) {
    const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/game/state") {
      return this.sendJson(response, this.session.snapshot());
    }
    if (request.method === "GET" && url.pathname === "/game/events") {
      return this.openEventStream(url, response);
    }
    if (request.method === "POST" && url.pathname === "/game/command") {
      return this.handleCommand(request, response);
    }
    if (request.method === "POST" && url.pathname === "/game/join") {
      return this.handleJoin(request, response);
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }

  openEventStream(url, response) {
    const playerId = url.searchParams.get("playerId") || "anonymous";
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    response.write(": connected\n\n");
    this.sseClients.register(`player:${playerId}`, response);
    this.sseClients.write(response, this.session.snapshot());
  }

  async handleCommand(request, response) {
    const body = await readBody(request);
    const command = body ? JSON.parse(body) : {};
    const playerId = command.playerId || "anonymous";
    const accepted = this.session.applyPlayerCommand(playerId, command);
    this.sendJson(response, { accepted });
  }

  async handleJoin(request, response) {
    const body = await readBody(request);
    const joinRequest = body ? JSON.parse(body) : {};
    const playerId = joinRequest.playerId || "anonymous";
    const teamId = joinRequest.teamId || "red";
    const ship = this.session.assignPlayer(playerId, teamId);
    if (!ship) {
      response.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ joined: false, reason: "no-ship-available" }));
      return;
    }
    this.sendJson(response, { joined: true, ship: ship.snapshot() });
  }

  sendJson(response, payload) {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(payload));
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}
