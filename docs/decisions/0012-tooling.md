# 0012. Build, test and lint tooling

- Status: Proposed
- Date: 2026-11-03

## Context

We need a dev server with hot reload hooks for sprites, maps and translations; a production build for a static client; a way to run the TypeScript server in development and to bundle it for deployment; one test runner for all packages; linting that enforces module boundaries and "no hard-coded text"; CI on GitHub (the repository's remote).

## Options considered

- **Dev server / bundler:** Vite (fast, plugin API with a WebSocket channel to the page, standard for TypeScript web apps) vs webpack (slower, heavier config) vs Parcel (less control over custom hot reload).
- **Tests:** Vitest (shares Vite's TypeScript handling, fast, Jest-compatible API) vs Jest (needs separate TS transform) vs Node's built-in test runner (fewer features: no watch UI, weaker mocking).
- **Lint / format:** ESLint (typescript-eslint) + Prettier (rich rule ecosystem: import boundaries, literal-string rule for i18n) vs Biome (one fast tool, but fewer of the rules we need).
- **Running the server:** `tsx` (runs TS directly, watch mode) vs Node's native type stripping (does not cover all TS syntax and workspace edge cases) vs compiling before each run (slow loop). For production: esbuild bundle (single file, fast).
- **Browser tests:** Playwright (reliable, headless Chromium/Firefox/WebKit) vs Cypress (heavier, Chromium-centric).

## Decision

- **Vite** for the client dev server and build, with a project plugin that serves and watches `themes/` and `locales/` and notifies the page of changed files.
- **Vitest** for all packages; coverage reports for `sim`, `content`, `match`, `bots`, `modes`, `protocol`.
- **ESLint (typescript-eslint, flat config) + Prettier.** Boundary rules per package; literal-string rule in UI code.
- **tsx** to run the server and tools in development; **esbuild** to bundle the server for production.
- **Playwright** for a small number of browser smoke tests, from milestone 1.
- **GitHub Actions**: install, type-check, lint, test, validators (themes, i18n, font coverage, generated files up to date), palette check.
- Top-level `npm run check` runs everything CI runs.

## Consequences

- One command (`npm run check`) tells whether a change is ready to commit.
- Vite-specific code (glob imports, hot reload API) stays in `apps/client`; packages remain bundler-agnostic.
- Several tools to keep updated; Renovate or Dependabot can be added later (not proposed now).
