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
