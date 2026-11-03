# CLAUDE.md

Entry point for every session. Keep it short and current.

## Project

Browser twin-stick shooter in pixel art (Resurrect 64 palette, 48×48 grid, 960×540 internal resolution). Solo vs bots now, authoritative multiplayer up to 64 later. Themes are data; behaviors and modes are code. Full vision: [docs/VISION.md](docs/VISION.md).

## Current state

- **Milestone 0 (Foundations) done**: version 0.0.0. Criteria results: [docs/ROADMAP.md](docs/ROADMAP.md#m0--foundations); C0.10 (Aseprite) awaits the owner's check.
- **Milestone 1 (playable solo) done**: version 0.1.0, merged into `main` and pushed on 2026-11-03. Criteria results: [ROADMAP](docs/ROADMAP.md#m1--playable-solo).
- **Next:** milestone 2 (combat), branch `milestone/2-combat`. Its detailed plan ([ROADMAP M2 tasks](docs/ROADMAP.md#m2--combat)) and questions Q61–Q70 ([OPEN_QUESTIONS](docs/OPEN_QUESTIONS.md#open)) await the owner's approval; no code before that.
- Done ahead of the M2 plan on the owner's request: sandbags as tile objects, drawn below characters (`low`, Q71).
- What exists today: [ARCHITECTURE §0](docs/ARCHITECTURE.md#0-what-exists-end-of-milestone-1).

## Where to find what

| Need | File |
|---|---|
| What the game must be | [docs/VISION.md](docs/VISION.md) |
| Modules, dependencies, data flow | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Why each technology / structure | [docs/decisions/](docs/decisions/) |
| Milestones, tasks, success criteria | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Undecided points and their proposals | [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) |
| Owner guides (sprites, maps, themes, modes, languages) | [docs/guides/](docs/guides/) |
| Themes (data only) | `themes/<id>/`; example: [themes/vietnam/](themes/vietnam/) |
| Palette | [palette/resurrect-64.gpl](palette/resurrect-64.gpl) |
| Editor JSON Schemas for theme files (generated) | `schemas/` |
| Behaviors and their parameters (generated) | [docs/reference/behaviors.md](docs/reference/behaviors.md) |
| Tiled project file (generated; open it in Tiled) | `tools/tiled/pixel-shoot.tiled-project` |
| Licenses of every file | [REUSE.toml](REUSE.toml), [CREDITS.md](CREDITS.md), `LICENSES/` |
| A package's role and allowed dependencies | `packages/*/README.md`, `apps/*/README.md`, [tools/README.md](tools/README.md) |

## Working rules

- Priorities: modular architecture > up-to-date docs > speed.
- Never start a milestone without the owner's approval of its plan.
- Never decide an unspecified point silently: propose, and add it to `docs/OPEN_QUESTIONS.md`.
- Every structural choice gets a decision record in `docs/decisions/` (template in its README).
- Everything in the repository is in English. The owner converses in French.
- No displayed text in code: translation keys only (`t('…')`), enforced by the local lint rule `tools/eslint/no-literal-ui-text.js` in `apps/client/src/ui` and `src/dev`.
- Every code change updates the affected docs **in the same commit**.
- Third-party files: add them to `REUSE.toml` and `CREDITS.md` in the same commit.
- Tests live next to the code as `*.test.ts`; tests may use Node to read fixtures, the code they test may not. Boundary rules are proven by `tools/src/boundaries/boundaries.test.ts`.

## Git

- Small commits, one change each, Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`).
- One branch per milestone (`milestone/<n>-<name>`) or feature.
- **Never merge into `main` and never push without the owner's approval.**

## Commands

Node.js ≥ 24 (see `.nvmrc`). Run from the repository root.

| Command | What it does |
|---|---|
| `npm install` | Install all workspaces |
| `npm run dev` | Client dev server (Vite) on http://localhost:5173; sprite viewer at `/dev/sprites` |
| `npm run build` | Production build of the client into `apps/client/dist/` |
| `npm run typecheck` | Type-check every package (`tsc -b`, project references), then tests (`tsconfig.test.json`) |
| `npm run lint` | ESLint, including module boundary rules |
| `npm run format` / `format:check` | Prettier on code and config (not on `themes/`, `locales/`, Markdown) |
| `npm run test` / `test:watch` / `coverage` | Vitest, all workspaces; `coverage` also enforces 80 % of lines in `sim`, `content`, `match`, `modes`, `bots` (C1.11) and is what `check` runs |
| `npm run test:e2e` | Playwright smoke test in Chromium (starts or reuses the dev server; first run: `npx playwright install chromium`). Not in `check`; CI runs it (decision 0015) |
| `npm run check:palette [files…]` | Palette and transparency check of every PNG (or the given files) |
| `npm run validate:themes [ids…]` | Validate themes as the game loads them |
| `npm run schemas` / `check:schemas` | Regenerate / verify the generated files: `schemas/*.json`, the Tiled project file, `docs/reference/behaviors.md` (run after changing a Zod schema, a behavior or a map property) |
| `npm run sprites:export [-- --watch]` | Export every `.aseprite` file (needs `ASEPRITE_PATH`) |
| `npm run assets:placeholders` / `assets:report` | (Re)generate placeholder art; list placeholders still in use |
| `npm run bench:sim [-- --rounds N]` | Headless bot-only rounds on the Vietnam map: round endings, blind shots, tick time (default 100 rounds, about 15 s) |
| `npm run assets:font` | Regenerate the HUD bitmap font from the interface font (decision 0014) |
| `npm run check:i18n` | Key parity with English, `{{variables}}`, font coverage of every text, HUD font up to date |
| `npm run check` | **Everything CI runs** except the browser smoke test (`.github/workflows/check.yml` also runs REUSE and `test:e2e`). Must pass before every commit |
