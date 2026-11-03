# @pixel-shoot/modes

Game modes, one folder per mode, written against the public API of `sim`, plus the list of built-in modes. Today: `sandbox` (development only).

- **May depend on:** `shared`, `sim` (public API only), `zod` (settings schemas). Its tests may also use `match`, to run modes inside a real match host.
- **Must never:** reach into `sim` internals or use platform APIs.

Other packages import it only through `src/index.ts`. See [ARCHITECTURE §4](../../docs/ARCHITECTURE.md#4-modules-and-dependencies).
