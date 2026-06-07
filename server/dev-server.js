import { GameHttpServer } from "./game/GameHttpServer.js";

const port = Number(process.env.GAME_SERVER_PORT ?? 8787);
const server = new GameHttpServer({ port });

await server.start();
console.log(`Sea battle game server listening on http://127.0.0.1:${port}`);
