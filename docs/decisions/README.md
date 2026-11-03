# Decision records

One file per structural decision, numbered in order: `NNNN-short-title.md`.
A record is never rewritten after acceptance; a later record *supersedes* it and both are cross-linked.
Implementation details that do not change the decision (a tool version, a file name) may be corrected in an **Amendments** section at the end of the record, dated.

**Statuses:** `Proposed` (awaiting the owner's approval) · `Accepted` · `Superseded by NNNN` · `Rejected`.

## Template

```markdown
# NNNN. Title

- Status: Proposed
- Date: YYYY-MM-DD

## Context
What forces the decision: requirements, constraints, what is at stake.

## Options considered
Each option with its main pros and cons.

## Decision
What is chosen, stated plainly.

## Consequences
What becomes easier, what becomes harder, what must be watched.
```

## Index

| # | Decision | Status |
|---|---|---|
| [0001](0001-typescript-monorepo.md) | TypeScript monorepo with npm workspaces | Accepted |
| [0002](0002-simulation-presentation-split.md) | Pure, fixed-tick simulation separated from presentation | Accepted |
| [0003](0003-rendering-pixijs.md) | Rendering with PixiJS at 960×540, integer scaling | Accepted |
| [0004](0004-ui.md) | DOM menus with Preact, HUD in PixiJS | Accepted |
| [0005](0005-networking.md) | Authoritative server, WebSocket, custom binary protocol | Accepted |
| [0006](0006-themes-as-data.md) | Themes as validated data; behaviors as engine code | Accepted |
| [0007](0007-aseprite-pipeline.md) | Aseprite export pipeline and conventions | Accepted |
| [0008](0008-tiled-maps.md) | Tiled JSON maps behind a `MapSource` interface | Accepted |
| [0009](0009-i18n.md) | Translations with i18next, languages as files | Accepted |
| [0010](0010-collision.md) | Custom collision instead of a physics engine | Accepted |
| [0011](0011-bots.md) | Bots as input-producing utility-AI controllers | Accepted |
| [0012](0012-tooling.md) | Build, test and lint tooling | Accepted |
| [0013](0013-licensing.md) | MIT for code, CC BY 4.0 for assets | Accepted |
