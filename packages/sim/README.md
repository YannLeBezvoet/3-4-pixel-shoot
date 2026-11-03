# @pixel-shoot/sim

The engine: world state, entities and components, fixed-tick systems, collision, the behavior registry, simulation events, the `GameMode` API and the `MapData` type.

- **May depend on:** `shared`, `zod`.
- **Must never:** use DOM or Node APIs, timers, `Math.random` or wall-clock time; know about files, Tiled, Aseprite, rendering or the network.

Other packages import it only through `src/index.ts`. See [ARCHITECTURE §4](../../docs/ARCHITECTURE.md#4-modules-and-dependencies).
