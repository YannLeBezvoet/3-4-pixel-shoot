# @pixel-shoot/protocol

Network message types, binary codec, quantization, snapshot and delta encoding. Implemented in milestone 3.

- **May depend on:** `shared`, `sim`.
- **Must never:** contain game rules or use platform APIs.

Other packages import it only through `src/index.ts`. See [ARCHITECTURE §4](../../docs/ARCHITECTURE.md#4-modules-and-dependencies).
