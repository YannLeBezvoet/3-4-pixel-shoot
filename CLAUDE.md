# CLAUDE.md

Entry point for every session. Keep it short and current.

## Project

Browser twin-stick shooter in pixel art (Resurrect 64 palette, 48×48 grid, 960×540 internal resolution). Solo vs bots now, authoritative multiplayer up to 64 later. Themes are data; behaviors and modes are code. Full vision: [docs/VISION.md](docs/VISION.md).

## Current state

- **Milestone 0 (Foundations) in progress** on branch `milestone/0-foundations`. Plan, decision records and all open questions (Q1–Q47) approved on 2026-11-03.
- Planning docs live on branch `docs/project-planning`; neither branch is merged or pushed yet.

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
| A package's role and allowed dependencies | `packages/*/README.md`, `apps/*/README.md`, [tools/README.md](tools/README.md) |

## Working rules

- Priorities: modular architecture > up-to-date docs > speed.
- Never start a milestone without the owner's approval of its plan.
- Never decide an unspecified point silently: propose, and add it to `docs/OPEN_QUESTIONS.md`.
- Every structural choice gets a decision record in `docs/decisions/` (template in its README).
- Everything in the repository is in English. The owner converses in French.
- No displayed text in code: translation keys only.
- Every code change updates the affected docs **in the same commit**.
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
| `npm run dev` | Client dev server (Vite) on http://localhost:5173 |
| `npm run build` | Production build of the client into `apps/client/dist/` |
| `npm run typecheck` | Type-check every package (`tsc -b`, project references), then tests (`tsconfig.test.json`) |
| `npm run lint` | ESLint, including module boundary rules |
| `npm run format` / `format:check` | Prettier on code and config (not on `themes/`, `locales/`, Markdown) |
| `npm run test` / `test:watch` / `coverage` | Vitest, all workspaces |
| `npm run check:palette [files…]` | Palette and transparency check of every PNG (or the given files) |
| `npm run validate:themes [ids…]` | Validate themes as the game loads them |
| `npm run schemas` / `check:schemas` | Regenerate / verify `schemas/*.json` (run after changing a Zod schema) |
| `npm run assets:placeholders` / `assets:report` | (Re)generate placeholder art; list placeholders still in use |
| `npm run check` | **Everything CI runs.** Must pass before every commit |
