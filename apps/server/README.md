# @pixel-shoot/server

Node application: HTTP and WebSocket, rooms and codes, lobby, interest management, content loaded from disk. Implemented in milestone 3.

- **May depend on:** every package except the client.
- **Must never:** contain game rules.

Other packages import it only through `src/index.ts`. See [ARCHITECTURE §4](../../docs/ARCHITECTURE.md#4-modules-and-dependencies).
