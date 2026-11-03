# 0015. Browser smoke tests with Playwright, outside `npm run check`

- Status: Accepted (2026-11-03, within the approved plan of milestone 1)
- Date: 2026-11-03

## Context

Unit tests run in Node and cannot see what only a browser shows: the page boots, PixiJS draws, a match starts from the menus without a console error (C1.12). `npm run check` must pass before every commit and should stay fast and need nothing but Node.

## Options considered

- **Playwright Test.** Drives real Chromium (and Firefox, WebKit later), starts the dev server itself, waits on accessible roles; one dev dependency, browsers downloaded separately.
- **Puppeteer.** Chromium only, no test runner: assertions, server start and reporting to write.
- **Vitest browser mode.** Runs unit tests in a browser; not meant for driving the whole application through its menus.

## Decision

- **Playwright Test** (`@playwright/test`), configured in `playwright.config.ts`; tests in `apps/client/e2e/*.spec.ts`; `npm run test:e2e` starts the client dev server or reuses a running one.
- The tests are **not** part of `npm run check`. CI runs them in a separate job (`e2e` in `.github/workflows/check.yml`) after `npx playwright install --with-deps chromium`.
- Tests find elements by role and English name, as a player would.

## Consequences

- `npm run check` stays browser-free; a change to the menus or the boot path should also be checked with `npm run test:e2e` before it is committed.
- The first run on a machine downloads Chromium (`npx playwright install chromium`).
- Visual results (crisp scaling, depth sorting) are still checked by hand or by scripts reading screenshots; the smoke test only proves that a match runs without errors.
