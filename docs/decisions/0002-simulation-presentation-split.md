# 0002. Pure, fixed-tick simulation separated from presentation

- Status: Proposed
- Date: 2026-11-03

## Context

Solo must work first, and the same game logic must later run on an authoritative server for up to 64 participants. Game logic must be covered by automated tests. Bots must be enriched over time, and game modes added without touching the engine.

## Options considered

1. **Logic inside the renderer's objects** (typical of game frameworks: sprites with update methods). Fast to start; impossible to run on a server without the renderer; hard to test.
2. **Pure simulation package, variable time step.** Separable, but results depend on frame rate: hard to test, hard to reconcile with a server.
3. **Pure simulation package, fixed time step, driven by input commands.** Separable, testable, frame-rate independent, matches what a server tick needs.

For the internal data model:

- **Off-the-shelf ECS library** (bitECS, miniplex…). Proven, but APIs change across major versions, and we need full control over serialization for snapshots.
- **Object-oriented entities.** Familiar, but behaviors tend to accumulate in class hierarchies that are hard to extend from data.
- **Small custom entity-component store.** A few hundred lines, shaped exactly for our needs (typed components, ordered systems, cheap snapshot extraction).

## Decision

- Option 3: a **pure simulation package** (`packages/sim`) with a **fixed 60 Hz tick**, advanced by an external clock.
- Every actor is driven by an **`InputCommand` per tick**; humans, bots and network clients all produce it.
- **Small custom entity-component store**, components as plain data, systems run in a fixed documented order.
- The simulation outputs **events** per tick; presentation, modes and network consume them.
- **Determinism within one runtime**: seeded PRNG streams, no wall-clock time, no `Math.random`.
- The client draws a **`WorldView`** obtained from a **`Session`**, never the simulation's internals ([ARCHITECTURE §2, §6](../ARCHITECTURE.md)).

## Consequences

- The same match code runs in solo and on the server; multiplayer adds a transport and prediction, not a rewrite.
- Tests run headless in Node and can simulate entire matches quickly.
- The renderer must interpolate between ticks to look smooth on high refresh-rate screens.
- 60 Hz costs twice the CPU of 30 Hz on the server; the budget ([ARCHITECTURE §18](../ARCHITECTURE.md)) is checked by load tests in milestones 3–4. The tick rate is a single constant if it must change.
- We maintain our own small ECS; it must stay small and documented.
