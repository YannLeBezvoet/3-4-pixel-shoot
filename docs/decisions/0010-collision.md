# 0010. Custom collision instead of a physics engine

- Status: Proposed
- Date: 2026-11-03

## Context

The game needs: characters sliding along walls; fast bullets that must never tunnel through cover; grenades bouncing off walls; explosions blocked by walls; line-of-sight checks for bots; entities larger than a tile (vehicles later). It runs on the server for up to 64 participants and must be deterministic within a runtime and easy to test.

## Options considered

- **Rapier (WebAssembly).** Robust, deterministic, fast. But WASM loading on both sides, a general 2D rigid-body engine for needs that are mostly grid queries, and a second state model to keep in sync with ours.
- **Matter.js / Planck.js.** Pure JS rigid-body engines; heavier than needed, rigid-body behavior (pushing, stacking) is not what an arcade shooter wants, and they do not handle bullet tunneling out of the box better than a swept test.
- **Custom collision.** Tile grid flags, circles for characters, boxes for map elements, swept segment tests for projectiles, spatial hash for entity queries. A few hundred lines, fully under our control.

## Decision

**Custom collision** in `packages/sim`:

- static grid of tile flags (`solid`, `cover`, …) rebuilt locally when a tile changes;
- characters: circles, resolved against the grid and boxes with sliding;
- projectiles: swept segments each tick (grid traversal + segment/circle and segment/box tests), so no tunneling at any speed;
- grenades: swept circles with reflection on the grid;
- uniform spatial hash for entity queries (projectile targets, explosions, bot perception, network interest management reuses the same idea);
- line-of-sight raycasts on the grid.

Oriented boxes are added when vehicles arrive.

## Consequences

- Behavior is simple and predictable, tuned for arcade feel rather than realism.
- Every collision routine gets unit tests, including exhaustive angle sweeps against cover.
- If vehicles later need real rigid-body dynamics, a physics engine can be introduced for vehicles only; this record will then be superseded.
