# @pixel-shoot/bots

Bot controllers that turn what a bot perceives into input commands. Perception, navigation, the utility-AI brain and difficulty presets (ARCHITECTURE §14).

- **May depend on:** `shared`, `sim` (public API only).
- **Must never:** read state a bot could not perceive or use platform APIs.

Other packages import it only through `src/index.ts`. See [ARCHITECTURE §4](../../docs/ARCHITECTURE.md#4-modules-and-dependencies).
