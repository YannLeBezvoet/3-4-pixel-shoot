# @pixel-shoot/tools

Command-line tools for development and CI. Each tool lives in its own folder under `src/` and is run through a root `npm run` script (see [CLAUDE.md](../CLAUDE.md#commands)).

- **May depend on:** `shared`, `sim`, `content`, `bots`, `match`, `modes` (headless matches), Node APIs.
- **Must never:** be imported by the game itself.

| Folder | Script | Purpose |
|---|---|---|
| `validate-themes/` | `validate:themes [ids…]` | Loads every theme, its catalog and its maps exactly as the game does and prints every problem |
| `schemas/` | `schemas`, `check:schemas` | Writes the files generated from engine definitions: `schemas/*.json` (editor JSON Schemas), `tools/tiled/pixel-shoot.tiled-project` (Tiled custom types) and `docs/reference/behaviors.md`; the check fails if any is stale |
| `../tiled/` | (Tiled) | The generated Tiled project file: open it once in Tiled to get typed map properties |
| `placeholders/` | `assets:placeholders`, `assets:report` | Generates placeholder art in the palette and in Aseprite's export format, plus the Vietnam tilesets and first map as Tiled files; never overwrites replaced or edited files (hashes in `tools/placeholders.json`) |
| `check-i18n/` | `check:i18n` | Interface translations match English (keys, `{{variables}}`); every character of every text exists in the interface font |
| `../eslint/` | (ESLint) | Local lint rule `no-literal-ui-text`: no literal displayed text in interface components |
| `sprites-export/` | `sprites:export [-- --watch]` | Exports every `.aseprite` file with the Aseprite CLI (`ASEPRITE_PATH`) as PNG + JSON next to it |
| `../aseprite/` | (Aseprite script) | `new-character.lua`: creates a character file with the palette, all tags and the `hand` slice |
| `content/` | — | Node `FileProvider` and theme/language discovery shared by the tools |
| `bench/` | `bench:sim [-- --rounds N]` | Plays bot-only team-elimination rounds (8 vs 8) on the Vietnam map: how rounds end, shots without an enemy in sight, tick time (C1.6, C1.10) |
| `palette-check/` | `check:palette` | Every PNG uses only Resurrect 64 colors, with pixels fully opaque or fully transparent (Q6) |
