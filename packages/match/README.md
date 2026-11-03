# @pixel-shoot/match

`MatchHost`: runs one match (simulation, game mode, bots, participants), identically in a browser tab and in a server room. `createMatchHost` exists; bot scheduling arrives later in milestone 1.

- **May depend on:** `shared`, `sim`, `bots`.
- **Must never:** depend on a transport or a platform API.

Other packages import it only through `src/index.ts`. See [ARCHITECTURE §4](../../docs/ARCHITECTURE.md#4-modules-and-dependencies).
