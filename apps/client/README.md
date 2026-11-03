# @pixel-shoot/client

The browser application and composition root: sessions, rendering (PixiJS), input, menus (Preact), HUD, translations, asset manager, hot reload and developer pages.

- **May depend on:** every package.
- **Must never:** contain game rules; those live in `sim`, `modes` and `bots`.

All PixiJS code stays in `src/render`; all Vite-specific code stays in this app. See [ARCHITECTURE §11–12](../../docs/ARCHITECTURE.md#11-rendering-appsclientsrcrender).
