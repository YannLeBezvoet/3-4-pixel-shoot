# @pixel-shoot/tools

Command-line tools for development and CI. Each tool lives in its own folder under `src/` and is run through a root `npm run` script (see [CLAUDE.md](../CLAUDE.md#commands)).

- **May depend on:** `shared`, `sim`, `content`, Node APIs.
- **Must never:** be imported by the game itself.

| Folder | Script | Purpose |
|---|---|---|
| `palette-check/` | `check:palette` | Every PNG uses only Resurrect 64 colors, with pixels fully opaque or fully transparent (Q6) |
