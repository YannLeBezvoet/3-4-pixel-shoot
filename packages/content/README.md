# @pixel-shoot/content

Theme and locale schemas, validation and error formatting, and adapters from source files to engine data (Aseprite JSON → sprite sheets, later Tiled JSON → `MapData`). Reads files only through the `FileProvider` interface it defines.

- **May depend on:** `shared`, `sim`, `zod`.
- **Must never:** read files directly or use DOM or Node APIs.

Other packages import it only through `src/index.ts`. See [ARCHITECTURE §4](../../docs/ARCHITECTURE.md#4-modules-and-dependencies).
