# Isolated SSE compression diagnostic

Run `node scripts/diagnose-stream-compression.mjs` with the game server available
at `http://localhost:8080`, or set `SEA_BATTLE_BASE_URL`.

The diagnostic reads 20 public snapshots without joining a game. An isolated
loopback HTTP server replays them cyclically at 10 Hz through Chromium's native
EventSource. Each case sends 100 full snapshots. It compares plain SSE, gzip
with Z_SYNC_FLUSH after every message, and intentionally buffered gzip.
The temporary browser and server are closed on completion.

## Observation, 2026-09-25

30 vehicles; Chromium 151.0.7922.34; one short run per case:

| Connection | Encoding | Body bytes | p95 delivery delay | Longest arrival gap |
| --- | --- | ---: | ---: | ---: |
| Localhost | Plain | 1,179,680 | 1 ms | 106 ms |
| Localhost | Gzip, immediate flush | 78,405 | 3 ms | 105 ms |
| Localhost | Gzip, buffered | 74,755 | 3,736 ms | 4,036 ms |
| CDP 2 Mbit/s, 30 ms latency | Plain | 1,179,680 | 49 ms | 110 ms |
| CDP 2 Mbit/s, 30 ms latency | Gzip, immediate flush | 78,404 | 8 ms | 109 ms |
| CDP 2 Mbit/s, 30 ms latency | Gzip, buffered | 74,772 | 3,749 ms | 3,940 ms |

Every case delivered all 100 messages in order. JSON parsing averaged less than
0.1 ms per message. This does not measure decompression CPU time independently.
Byte counts exclude HTTP/TCP overhead. CDP throttling is synthetic, not a real
WAN; configured request latency is not an extra delay on every SSE message.

## Limits and decision

This tests HTTP decoding, EventSource delivery, and JSON parsing, not game
rendering, live-world application, multi-client server CPU, Safari, reverse
proxies, or the actual XIS/Netty compression pipeline. Replayed snapshots are
not a long combat workload. It does not establish production performance.

XIS history contains 92e4023 (compression), ef1c871 (exclude SSE), then bb5eb1e
and abcf56c (reverts). The reason for the regression is not documented there.
The inspected current Netty JdkZlibEncoder uses SYNC_FLUSH, so the deliberately
buffered control is not evidence of the cause of the historical regression.

Leave production compression disabled. A next-stage test must use an isolated
XIS server and the actual game under load, comparing frame times and message
arrival timing as well as bandwidth before considering activation.

## Rendered-game follow-up

Run a separate Vite instance on port 5182, then
`node scripts/diagnose-game-stream-compression.mjs /tmp/game-stream-compression`.
Requires Java and the locally cached Netty 4.2.13.Final jars. `GAME_ORIGIN`
selects the read-only capture server; `SEA_BATTLE_BASE_URL` selects Vite and
`PROBE_PORT` selects the isolated Netty listener (default 5193).

This captures 120 consecutive snapshots and the landscape without joining or
modifying the live game. The same sequence is replayed six times, alternating
plain/gzip/gzip/plain/plain/gzip. The player's ship is held constant in the
recording; other ships and combat events retain their recorded states.
All game HTTP writes from the test browser are intercepted locally.

The real client landscape, radar, ship rendering, snapshot application and
render loop run in each case. Only sandbox data/bootstrap and the SSE endpoint
are substituted. NettyStreamProbe uses HttpServerCodec, HttpContentCompressor,
and writeAndFlush(DefaultHttpContent), matching the relevant original server
compression path. It is not the complete XIS application: database, simulation,
multi-user load and proxy effects are excluded.

Each run warms shaders for four seconds and excludes the first 20 messages
from timing statistics. Headers are asserted to be identity/gzip respectively;
all 120 sequence numbers must arrive in order with no browser page errors.
Raw timing samples and screenshots are written to the output directory.
The second screenshot was visually checked for a rendered game scene.

The automated Chromium renderer in this environment is SwiftShader, not the
normal browser's hardware GPU. Absolute frame times are not representative of
normal gameplay. Results describe this short replay only; they do not resolve
the historical regression or justify enabling compression globally.

Results on 2026-09-25, 30 vehicles, 2,218 scene meshes, three runs per mode:

| Metric | Plain | Gzip |
| --- | ---: | ---: |
| Mean encoded stream bytes per 120-message run | 1,450,742 | 86,631 |
| Mean frame interval | 48.79 ms | 48.32 ms |
| Frame interval p95 | 52.10 ms | 53.90 ms |
| Mean delivery delay | 25.24 ms | 24.68 ms |
| Delivery delay p95 | 46 ms | 47 ms |
| Mean snapshot application, including production JSON parse | 0.520 ms | 0.525 ms |

Encoding reduced measured stream bytes by 94%. There was no consistent
slowdown across this replay, but run-to-run variation was substantial
(mean frame intervals: plain 48.71/47.58/50.15 ms, gzip 46.85/46.55/51.92 ms).
Do not interpret the small aggregate mean difference as a rendering speedup.
Compression remains disabled in production. No restart is needed for these
diagnostics; both temporary servers were stopped after measurement.
