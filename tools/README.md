# @pixel-shoot/tools

Command-line tools for development and CI. Each tool lives in its own folder under `src/` and is run through a root `npm run` script (see [CLAUDE.md](../CLAUDE.md#commands)).

- **May depend on:** `shared`, `sim`, `content`, Node APIs.
- **Must never:** be imported by the game itself.

| Folder | Script | Purpose |
|---|---|---|
| `validate-themes/` | `validate:themes [ids…]` | Loads every theme exactly as the game does and prints every problem |
| `schemas/` | `schemas`, `check:schemas` | Writes `schemas/*.json` (editor JSON Schemas) from the engine's Zod schemas; the check fails if they are stale |
| `content/` | — | Node `FileProvider` and theme/language discovery shared by the tools |
| `palette-check/` | `check:palette` | Every PNG uses only Resurrect 64 colors, with pixels fully opaque or fully transparent (Q6) |
