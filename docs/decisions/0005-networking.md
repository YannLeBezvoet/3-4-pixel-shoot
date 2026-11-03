# 0005. Authoritative server, WebSocket, custom binary protocol

- Status: Accepted (2026-11-03)
- Date: 2026-11-03

## Context

Online play without accounts: a player creates a room, shares a code, others join. Up to 64 participants (humans + bots) per match. Fast arcade gameplay needs responsive local movement despite latency. The architecture must hold 64 participants from its design: authoritative server, each player receives only what is near them.

## Options considered

### Authority

- **Peer-to-peer / host-in-browser.** No server cost, but trivial to cheat, fragile with 64 peers, and host departure ends the game.
- **Authoritative dedicated server.** The server runs the simulation; clients send inputs. Required by the vision.

### Transport

- **WebSocket.** Universal browser support, simple deployment behind any reverse proxy. TCP head-of-line blocking can cause small stalls under packet loss.
- **WebRTC data channels** (unreliable). UDP-like behavior, but complex (ICE, STUN/TURN), with heavy server libraries.
- **WebTransport** (QUIC datagrams). The right long-term fit, but Node server support is still immature.

### Framework

- **Colyseus.** Rooms, matchmaking and state sync out of the box. But its state model requires our simulation to use its schema classes, or to be mirrored into them every tick; client-side prediction is not built in; and we want precise control over per-client filtering and encoding.
- **Custom protocol over `ws`.** More code to write (rooms, codes, codec), full control over interest management, deltas and prediction. Rooms with codes are a small amount of code.

### Encoding

- **JSON.** Readable, but 5–10× larger and slower than needed for 30 Hz snapshots.
- **MessagePack / Protocol Buffers.** Compact, generic; no quantization or field-level deltas without extra work.
- **Hand-written binary codec** with quantization and per-entity change masks. Most compact; we own it.

## Decision

- **Authoritative dedicated server** in Node, one process hosting many rooms; each room runs the shared `MatchHost`.
- **WebSocket via `ws`**, behind a `Transport` interface on both sides, so WebTransport can replace it later.
- **Custom protocol** (`packages/protocol`): JSON for low-frequency lobby messages; a **binary codec** for gameplay (inputs up, snapshots and events down), with quantized positions and angles and delta encoding against the previous snapshot sent to that client.
- **Rates:** simulation 60 Hz; snapshots 30 Hz (configurable); inputs sent every tick with sequence numbers.
- **Interest management** built in from the start: per-client area of interest computed server-side from the player's camera, uniform spatial grid lookup, hysteresis; global info sent separately.
- **Client:** local movement prediction with the shared simulation code, reconciliation on snapshots, interpolation of remote entities (~100 ms buffer). Projectiles sent as fire events; impacts authoritative from the server.
- **Handshake** checks protocol version and gameplay content hash.

## Consequences

- We write and maintain the room manager, codec and interest management; these get dedicated tests (round trips, filtering guarantees) and a load test.
- Over WebSocket (reliable and ordered), deltas against the last sent snapshot are safe; a switch to an unreliable transport will require acknowledged baselines, which the codec design keeps possible.
- A single Node process runs rooms on one core; several rooms per process scale up with `worker_threads` or more processes when needed.
- Hosting is needed for online play (see open questions); solo stays a static site.
