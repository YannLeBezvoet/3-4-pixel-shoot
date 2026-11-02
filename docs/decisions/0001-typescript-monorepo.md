# 0001. TypeScript monorepo with npm workspaces

- Status: Proposed
- Date: 2026-11-03

## Context

The game runs in the browser; the multiplayer server must run the *same* game logic without a rewrite. The project will live for years, across many sessions, and its priority is a modular architecture with boundaries that do not erode. We need one language on both sides and a way to make module boundaries checkable by tools rather than by discipline.

## Options considered

- **TypeScript everywhere (browser + Node).** One language; the simulation package is shared as-is. Static types document interfaces between packages. Huge ecosystem for web rendering and tooling. Cost: a build step; JavaScript performance is lower than native, but ample for a 2D game with 64 participants.
- **Rust compiled to WebAssembly + Rust server.** Excellent performance and determinism. But slow iteration, heavier tooling for the owner, harder hot reload, and the browser rendering/UI layer would still be JavaScript, so two languages.
- **C# / Godot web export.** Mature editor, but web exports are heavy, the server would run a different runtime, and the project would be shaped by the engine rather than by our own module boundaries.
- **Plain JavaScript.** No build step, but no checked interfaces: boundaries would rely on discipline only.

For the repository:

- **npm workspaces.** Built into npm (already installed), no extra tool to learn.
- **pnpm workspaces.** Stricter dependency isolation, faster installs; needs an extra tool.
- **Single package with folders.** Simplest, but nothing stops a folder from importing another's internals.

## Decision

- **TypeScript in strict mode** for all code. **Node.js LTS ≥ 24** for the server and tools (the `engines` field pins the minimum).
- **npm workspaces monorepo** with the packages listed in [ARCHITECTURE §3–4](../ARCHITECTURE.md).
- **Boundaries enforced by tools:**
  - each package's `package.json` lists what it may depend on; TypeScript project references follow the same graph;
  - platform-agnostic packages (`shared`, `sim`, `content`, `modes`, `bots`, `match`, `protocol`) compile with `lib: ["ES2023"]` and no ambient types, so DOM or Node APIs do not type-check there;
  - ESLint rules forbid imports of another package's internal files and imports that break the dependency table.
- Packages expose a single public entry point (`src/index.ts`); everything else is internal.

## Consequences

- The simulation is shared byte-for-byte between browser and server.
- Adding a package means adding it to the dependency table in `ARCHITECTURE.md` and to the lint rules.
- npm's hoisting makes undeclared ("phantom") imports possible; the lint rules catch them. If they become a recurring problem, switching to pnpm is a contained change.
