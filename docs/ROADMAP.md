# Roadmap

> Each milestone has its own branch, a plan approved by the owner before it starts, and success criteria that can be checked.
> Milestone 0 is planned in detail below. Later milestones list their scope and criteria; each gets a detailed task plan, submitted for approval, when it starts.
> Questions referenced as **Qn** are in [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

## Status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Foundations | **Done** — version 0.0.0, merged into `main` and pushed on 2026-11-03 (C0.10 to be checked by the owner) |
| M1 | Playable solo | **Done** — version 0.1.0, merged into `main` and pushed on 2026-11-03 |
| M2 | Combat | **Plan proposed** on 2026-11-03 (tasks below, questions Q61–Q70); awaiting the owner's approval |
| M3 | Multiplayer | Not started |
| M4 | Civilians, 64 participants, match settings | Not started |
| M5 | Further modes, procedural maps, vehicles, audio | Not started |

## How a milestone runs

1. The lead developer submits the milestone's detailed plan (tasks, criteria, questions to settle).
2. The owner approves or amends it.
3. Work happens on branch `milestone/<n>-<name>`, in small Conventional Commits, each updating the docs it affects.
4. At the end: every criterion is checked and reported (with command output or a description of the manual check), `CHANGELOG.md` gets a version entry (see Q12), and the owner decides about merging into `main` and pushing.

Unless stated otherwise, every milestone also requires: `npm run check` passes; docs listed in the milestone are current; no open question the milestone depends on is left unsettled without a recorded provisional answer.

---

## M0 — Foundations

**Goal:** a repository where every later piece has its place, its rules and its tooling: structure, quality checks, documentation, licenses, placeholder art, translations, and the sprite pipeline end to end (Aseprite export → validated → drawn in the browser → hot reloaded).

**Branch:** `milestone/0-foundations`. **Depends on:** Q1–Q12 (Q13 affects M1 only).

### Tasks (one or a few commits each)

1. **Workspace.** Root `package.json` with npm workspaces, `tsconfig.base.json` (strict), `.editorconfig`, `.gitignore`, `.nvmrc`, `engines` field. Every package from [ARCHITECTURE §3](ARCHITECTURE.md) created with `package.json`, `tsconfig.json`, `src/index.ts` (empty public entry point) and a `README.md` stating its responsibility and allowed dependencies. Move `resurrect-64.gpl` to `palette/`.
2. **Boundaries.** TypeScript project references; `lib: ["ES2023"]` and no ambient types for platform-agnostic packages; ESLint (flat config, typescript-eslint) with import-boundary rules; Prettier. A test proves the rules bite (a fixture using `window` in a platform-agnostic package fails type-checking).
3. **Tests.** Vitest workspace configuration, coverage reporting; `npm run check` running type-check, lint, tests and every validator.
4. **Shared basics.** `packages/shared`: vector and angle helpers needed by the sprite viewer (aim angle → direction), seeded PRNG, `Result` type; with tests.
5. **Palette check.** `tools/palette-check`: reads the `.gpl` file, scans every PNG in the repository (fixtures excluded), fails on off-palette colors and on partial transparency (Q6), reports file, coordinates, color and nearest palette color. Tests with fixture images.
6. **Content foundations.** `packages/content`: `FileProvider` interface; Zod schemas for `theme.json` v1 (manifest, factions, characters, weapons with behavior id + parameters as an opaque, validated-later block); Aseprite JSON parser (frames, durations, tags, tag direction, slices with per-frame keys); validation rules for sprites (frame size multiple of 48, required tags and directions, required slices); error collection and formatting; JSON Schema generation (`npm run schemas`) with a CI check that generated schemas are up to date. Tests with ≥ 10 broken fixtures.
7. **Placeholder generator.** `tools/placeholders`: deterministic generator writing PNG + Aseprite-format JSON, in palette, marked as placeholders: one soldier per faction (actions `idle`, `walk`, `death`; 5 directions; `hand` slice; a visible facing marker so directions and mirroring are checkable), one rifle (`grip`, `muzzle` slices), a ground tileset (grass, dirt, path, water, wall, sandbags, hut wall intact/destroyed), a 2×3-tile tree, effect cells (muzzle flash, blood splat, explosion, flame). `npm run assets:report` lists the placeholders still in use.
8. **Vietnam theme skeleton.** `themes/vietnam/` with `theme.json`, two factions using the placeholder soldiers, the placeholder rifle, `locales/en.json` and `locales/fr.json`. `npm run validate:themes` validates every theme.
9. **Client bootstrap.** `apps/client` with Vite and PixiJS: 960×540 canvas, integer upscaling in device pixels with letterboxing (Q7), nearest-neighbor everywhere; unit tests for the scale computation.
10. **Translations.** i18next setup; `locales/en.json`, `locales/fr.json`; language discovery from files; default from the browser (Q9), choice saved; theme namespaces; `npm run check:i18n` (key parity); ESLint rule against literal strings in UI code; a DOM language menu (Preact) using a pixel font (Q10).
11. **Asset manager and sprite viewer.** Client asset manager loading theme presentation content through the `content` package; animation player honoring Aseprite durations and tag direction; direction mapping with mirroring; weapon attached at `hand`, rotating around `grip`, behind the body when aiming up. Dev page `/dev/sprites` listing every sprite and animation of every theme.
12. **Hot reload.** Vite plugin serving and watching `themes/` and `locales/`; the client reloads changed files in place; invalid files show a dev overlay with the validation errors and the last valid version stays on screen.
13. **Aseprite helpers.** `npm run sprites:export` (Aseprite CLI via `ASEPRITE_PATH`, optional watch mode); `tools/aseprite/new-character.lua` creating a correctly set-up character file (48×48, palette, tags for every required action and direction, `hand` slice).
14. **Licenses and repo files.** `LICENSE`, `LICENSE-ASSETS`, `REUSE.toml`, `CREDITS.md`, `CONTRIBUTING.md` (workflow, Conventional Commits, docs-in-same-commit rule), README rewritten.
15. **CI.** GitHub Actions workflow running `npm run check` and the REUSE check (Q3).
16. **Documentation.** `CLAUDE.md` with real commands; `ARCHITECTURE.md` updated to what exists; decision records marked Accepted or amended; guides `docs/guides/create-a-sprite.md`, `docs/guides/add-a-language.md` and `docs/guides/add-a-theme.md` (covering what exists in M0); `CHANGELOG.md` entry.

### Success criteria

- [x] **C0.1** On a clean clone, `npm ci && npm run check` exits with code 0. The CI workflow passes on the branch (once pushed, with the owner's approval).
  **Result:** `npm ci && npm run check` on a fresh clone of the branch exits with 0 (93 tests). CI: runs once the branch is pushed.
- [x] **C0.2** The boundary test passes: a fixture using a DOM global inside a platform-agnostic package fails type-checking, and a fixture importing `pixi.js` from `packages/sim` fails lint.
  **Result:** `tools/src/boundaries/boundaries.test.ts` passes (DOM/Node globals rejected by the agnostic settings; `pixi.js`, `node:fs`, undeclared packages, deep imports and PixiJS outside `render/` rejected by lint).
- [x] **C0.3** `npm run dev`, then `/dev/sprites`: each placeholder soldier shows in 8 directions; the 3 left-facing ones are mirrored copies of the drawn right-facing ones (facing marker visible); every tag plays with its Aseprite frame durations; the rifle stays attached to the `hand` point, rotates to follow the mouse, flips so it is never upside down, and is drawn behind the body when aiming up.
  **Result:** checked in Chromium at `/dev/sprites`: `walk.side` when aiming right, mirrored `walk.up-side` when aiming up-left, weapon behind the body for NE, N, NW; the backpack switches sides in the mirrored directions.
- [x] **C0.4** Scaling: unit tests confirm factor ×2 for a 1920×1080 device-pixel viewport, ×4 for 3840×2160, ×1 for 1366×768, with centered letterboxing. In the browser at ×2, a screenshot shows every source pixel as a 2×2 block of one color (no smoothing).
  **Result:** unit tests pass; in Chromium the 1-pixel checkerboard of the dev test pattern gives uniform N×N blocks at ×1 (1366×768, letterboxed at 203,114), ×2 (1920×1080), ×4 (3840×2160 and 1920×1080 at 200 %).
- [x] **C0.5** Hot reload: overwriting a placeholder's PNG + JSON while the viewer is open updates it within 2 seconds, without a page reload, keeping the selected animation. Writing invalid JSON shows the error overlay with the file and the problem; fixing the file clears it.
  **Result:** checked in Chromium: replacing the M16A1 PNG + JSON showed after 280 ms with no page reload and the selection kept; broken JSON showed the overlay after 161 ms, fixing it cleared it after 215 ms.
- [x] **C0.6** `npm run check:palette` passes on every image in the repository. On fixtures with one off-palette pixel and one semi-transparent pixel, it fails and prints file, coordinates, color and nearest palette color (covered by tests).
  **Result:** passes on the 10 repository images; tests cover the off-palette and semi-transparent cases with exact messages.
- [x] **C0.7** `npm run validate:themes` passes on `vietnam`. Tests cover at least 10 broken fixtures (missing file, unknown reference, frame size not a multiple of 48, missing direction tag, missing `hand` slice, invalid weapon parameter, unknown `formatVersion`, missing translation key, duplicate id, unknown faction), each asserting the exact message.
  **Result:** `vietnam` valid; `load-theme.test.ts` covers 16 problems, each with its exact message.
- [x] **C0.8** `npm run assets:placeholders` is deterministic: running it twice leaves `git status` clean. Generated files pass the palette check and theme validation.
  **Result:** a second run leaves `git status` clean; generated files pass both checks (tests).
- [x] **C0.9** The viewer's UI text is in French or English, switchable, and the choice survives a reload; first visit follows the browser language. Adding a fixture `locales/xx.json` with a `_meta.name` makes it appear in the language menu with no code change. `npm run check:i18n` fails when a key is missing in `fr.json`. ESLint reports a string literal in a UI component.
  **Result:** checked in Chromium: French browser → French; clicking English → English, kept after reload; a new `locales/xx.json` appeared in the menu after 158 ms without reload. `check:i18n` and the lint rule are covered by tests.
- [ ] **C0.10** *(checked by the owner, Aseprite required)* With `ASEPRITE_PATH` set, `npm run sprites:export` re-exports every `.aseprite` file. A character created with `new-character.lua`, then exported, passes validation and appears in the viewer with no other change.
  **Pending:** Aseprite is not installed on the development machine. The export arguments are unit-tested and the Lua script compiles; the owner checks the rest.
- [x] **C0.11** `reuse lint` passes. All files listed in task 16 exist and describe the current state; `ARCHITECTURE.md` marks what is still planned.
  **Result:** `reuse lint`: compliant with REUSE 3.3 (every file has copyright and license information). Documentation updated in each commit.

---

## M1 — Playable solo

**Goal:** a complete solo match against bots on a Tiled map, with the architecture that multiplayer will reuse.

**Branch:** `milestone/1-playable-solo`. **Depends on:** Q13–Q28 and Q48–Q60. **Change from the original plan (Q13, accepted):** the team elimination mode is implemented here, in solo, rather than in M3 (Q13). It gives solo a goal and validates the `GameMode` interface early; M3 then brings it online.

### Scope

- `sim`: world and entity store, 60 Hz tick, input commands, movement with collision (circle vs grid), aiming, `firearm` weapon behavior (fire rate, spread, damage, magazine, reload), `bullet` projectile behavior with swept collision, health and death, events, `MapData`, behavior registry, determinism.
- `content`: `TiledMapSource` (`.tmj`/`.tsj` → `MapData`), Tiled layer classes, tile flags `solid`; Tiled project file generated from engine schemas; map validation messages.
- `match`: `MatchHost` with participants, bot scheduling, mode lifecycle.
- `modes`: `team-elimination` (Q21).
- `bots`: perception with line of sight, utility AI with wander / engage / chase / reload, A\* navigation, difficulty parameters.
- `client`: `LocalSession`; renderer (tile chunks, y-sorted world layer with multi-tile trees, overhead layer, interpolation, camera centered on the player (Q20), optional palette pass per Q14); input (physical keys, mouse aim); HUD in PixiJS with bitmap font (health, ammo, team counts, round info, kill feed); DOM menus (main menu, solo setup, settings, end of round/match); spectating after death; map hot reload; client particles for muzzle flash and hits.
- Theme: Vietnam placeholder map (Q27), factions and rifles (Q22, Q23); a second minimal theme `themes/example/` proving a theme needs no code.
- Docs: guides `docs/guides/create-a-map.md` and `docs/guides/add-a-mode.md`; add-a-theme guide completed for weapons; generated behavior reference.

### Tasks (one or a few commits each)

*Approved on 2026-11-03; all done.* The order gives a first playable scene early (end of task 13: walking and shooting on the Vietnam map), then the match, the bots and the interface. Each commit updates the docs it affects; task 24 is the final pass.

#### Simulation (`sim`)

1. **World core.** Entity ids and typed component stores; systems run in the order of [ARCHITECTURE §5](ARCHITECTURE.md#5-simulation-core-packagessim--planned-for-milestone-1-except-the-behavior-registry); `step()` at 60 Hz with time counted in ticks; `InputCommand` (movement vector, aim angle, fire and reload buttons); named PRNG streams owned by the world; `SimEvent`s per tick; a state hash; the `MapData` type and the static grid of tile flags (`solid`, and `impassable` if Q50 is accepted). An ASCII-map helper (`#` solid, `~` impassable, `1`/`2` spawn…) exported for the tests of every package.
2. **Movement and collision.** Characters as circles against the grid, sliding along walls; near-instant acceleration (Q19); separation between characters (Q48); spatial hash for entity queries; grid raycast for line of sight. Test: no character overlaps a `solid` tile after 10,000 random-input ticks (C1.4).
3. **Weapons and projectiles.** Aim; `firearm` behavior (auto and semi, rate of fire, spread drawn from the world PRNG, magazine, reload including automatic reload (Q53), optional reserve); `bullet` projectile behavior (speed, range) with swept segment tests against the grid and character circles, including the segment from the shooter to the muzzle so nobody fires through a wall they stand against; events `shotFired`, `reloadStarted`, `reloaded`, `projectileImpact`, `hit`. Test: 360° sweep at the maximum projectile speed the schema allows (C1.4).
4. **Health and death.** 100 hit points (Q15), damage from weapon parameters, friendly-fire flag (Q49), `damaged` and `killed` events carrying killer and weapon, corpses that block nothing (Q28). Determinism test (C1.5).

#### Content and maps (`content`, `tools`)

5. **Theme gameplay data.** Character fields `speed`, `radius`, `hitPoints` with defaults (Q54); new `projectiles.json` (behavior `bullet` + parameters + sprite); weapon entries gain `projectile` and an `effects` block (muzzle flash); new `effects.json` (effect id → sprite animation) for muzzle flashes and impacts; muzzle offset derived from the `hand`, `grip` and `muzzle` slices (gameplay content, [ARCHITECTURE §8.3](ARCHITECTURE.md#83-gameplay-content-vs-presentation-content)); conversion of a theme into the simulation's catalog of characters, weapons and projectiles. Format policy per Q56. JSON Schemas regenerated; Vietnam theme, add-a-theme guide and broken fixtures updated for every new message.
6. **Tiled maps.** `MapSource` interface and `TiledMapSource`: `.tmj` with external `.tsj` tilesets → `MapData`; layer classes `ground`, `objects`, `overhead`, `gameplay`; tile properties (`solid`, `impassable`) with per-object overrides; multi-tile tile objects with rectangle collision footprints from Tiled's collision editor; `spawn` areas with a `team` (Q52); map `nameKey` (Q55); maps discovered in `maps/` and listed in the content index. Unsupported Tiled features (infinite maps, other orientations, embedded tilesets, non-48 px tiles) rejected; messages name map, layer, object id and position; at least 10 broken fixtures, each asserting the exact message.
7. **Generated files.** The Tiled project file `tools/tiled/pixel-shoot.tiled-project` (custom classes and enums for layers, tiles, spawns and maps, generated from engine schemas) and the behavior reference `docs/reference/behaviors.md` (every behavior, its description and parameters), both written by `npm run schemas` and verified by `check:schemas` in CI.
8. **Placeholder art and the Vietnam map.** Generator additions: river banks and bridge tiles, hut roof tiles for the `overhead` layer, bullet sprite, wall-impact effect, crosshair; `.tsj` tilesets carrying tile properties and collision footprints; a deterministic generator for the first map (about 80×60 tiles: jungle edge, village, rice paddies, river, Q27), which stops overwriting it once it is edited in Tiled (same hash mechanism as other placeholders). Palette check and validation pass.

#### First playable scene (`match`, `modes`, client)

9. **Game-mode API and `MatchHost`.** `GameModeDefinition`, `ModeApi` (spawn in a team's spawn area, spectate, timers, announcements as translation keys, end round or match), `ModeState`, map requirements, settings schema with defaults, in `sim`. `MatchHost` in `match`: participants (human or bot) with team and character, input routing, mode lifecycle, bot scheduling (thinking staggered at about 10 Hz), `WorldView` and event stream, driven by a clock it is given, map replacement in place (used by hot reload). A minimal `sandbox` mode (spawn and nothing else) serves dev pages and tests; it is not offered in menus and is the first example of the add-a-mode guide.
10. **`LocalSession` and game loop.** The `Session` interface ([ARCHITECTURE §6](ARCHITECTURE.md#6-match-host-and-sessions--planned-for-milestone-1)); a fixed-step accumulator driven by `requestAnimationFrame`, giving the interpolation factor; pause; a catch-up limit after the tab was hidden.
11. **Input.** Physical key codes (`KeyW/A/S/D`, arrows), mouse aim measured from the character's hand on screen, buttons per Q53, keys released when the window loses focus; unit tests of the mapping.
12. **World rendering.** Ground layer baked into chunk textures; y-sorted world layer (characters, multi-tile objects such as trees, corpses below the living); overhead layer; interpolation between ticks; camera keeping the player at the exact center of the screen (Q20); dev page `/dev/scene` where the player walks and shoots on any map in the `sandbox` mode (C1.2, C1.3); unit test of the sort keys.
13. **Effects.** Client particles driven by events: muzzle flash at the weapon's `muzzle`, bullet sprites, wall impacts, blood splat on hits. No gameplay effect.

#### Match and bots (`modes`, `bots`)

14. **Team elimination.** Q21 rules with Q51 (countdown, round result, round cap) and Q52 (spawns); spectating teammates; mode state for the HUD; scripted tests of every rule (elimination, time limit, draw, match end, friendly fire).
15. **Bot perception and navigation.** Sight limited to a view rectangle the size of the screen with line of sight; hearing gunfire within a radius; memory of the last position seen or heard; A\* on the grid with clearance for the collider radius, path smoothing, cached paths, time-sliced requests; tests on ASCII maps.
16. **Bot decisions.** Utility AI with wander, engage, chase, reload; aim smoothing every tick, reaction delay and aim error; difficulty presets easy, normal, hard; the bots' own PRNG stream. Headless bot-match test (C1.6), determinism with bots, and `npm run bench:sim` printing tick times for 16 participants (C1.10).

#### Interface (client)

17. **HUD.** A bitmap font generated from Press Start 2P as a 1-bit glyph atlas at 8 px, in palette, built by a tool and covered by the font check (decision record); HUD widgets per Q58; teammates' names and health bars (Q26); crosshair; every text from translation keys.
18. **Menus.** Main menu, solo setup, settings, pause, end of match (Q59); spectating controls; names per Q57; every text translated in English and French.
19. **Palette pass.** A final full-screen pass snapping every pixel to the nearest Resurrect 64 color (Q14), on by default, switchable in the settings.
20. **Map hot reload.** The content store reloads changed maps and tilesets and swaps them into the running match (tiles and collision; characters left inside a wall are moved to the nearest free spot; spawn areas apply from the next round). An invalid map shows the error overlay and the previous map stays active (C1.7).

#### Proofs, tests and documentation

21. **Example theme.** `themes/example/` (Q60). Its art is produced by the placeholder generator in a tools-only commit; the theme itself is added in a commit that touches only `themes/example/` (C1.8).
22. **Browser smoke test.** Playwright test starting a solo match (C1.12), run by `npm run test:e2e` and by a separate CI job; `npm run check` stays free of browsers so it remains fast before each commit (decision record).
23. **Coverage and performance.** Line-coverage thresholds of 80 % for `sim`, `content`, `match`, `modes`, `bots`, enforced in CI (C1.11); an FPS counter in development builds; measurements recorded (C1.10).
24. **Documentation.** Guides `create-a-map.md` and `add-a-mode.md`; add-a-theme guide completed (weapons, projectiles, effects, maps); `ARCHITECTURE.md` updated to what exists; new decision records accepted; `CLAUDE.md`; `CHANGELOG.md` entry `0.1.0`; criteria results in this file.

### Success criteria

- [x] **C1.1** From the main menu: Solo → choose bots per team (up to 16 participants, Q24) → the match starts on the Vietnam map; a full match plays to a winner and returns to the menu.
  **Result:** checked in Chromium: Solo → Start (3 allied and 4 enemy bots, player idle) → the match on `river-village` ended after 117 s (PAVN & Viet Cong 3–0), the end screen showed the winner, the score and every participant's kills and deaths, and "Main menu" returned to the menu. The setup accepts up to 16 participants (measured with 16 in C1.10).
- [x] **C1.2** ZQSD on AZERTY and WASD on QWERTY move the player with no setting (physical keys). The character faces the cursor in 8 directions; the weapon follows the exact mouse angle.
  **Result:** input reads `KeyboardEvent.code` (`KeyW/A/S/D`, the same physical keys as ZQSD on AZERTY) and the arrows (`key-map.test.ts`); the browser scripts drive the player with those codes. The character view picks the octant of the aim and draws the weapon at the exact angle (M0, C0.3); the local player's weapon uses the live mouse angle (captures in `/dev/scene`).
- [x] **C1.3** Y-sorting: a dev scene shows the player walking around a tree; the player is hidden by the tree when above its base and drawn over it when below (screenshot check, and a unit test on sort keys).
  **Result:** `depth.test.ts` covers both cases and ties. Captures in Chromium on `/dev/scene?theme=vietnam`: walking down between trees, the player is hidden by a canopy while standing above that tree's base, and drawn over the trunk of a tree once its base is just above the player's feet.
- [x] **C1.4** Simulation tests (ASCII maps): bullets never cross `solid` tiles over a 360° sweep of angles at max projectile speed; a character never overlaps a `solid` tile after 10,000 random-input ticks; damage and death follow weapon parameters.
  **Result:** `combat.test.ts`: 4,320 shots (360° in 0.25° steps from 3 positions) at 6,000 px/s, every segment clear, every impact on an obstacle's edge; `movement.test.ts`: 8 characters, 10,000 random-input ticks, no overlap with tiles or footprints (more than 10,000 contacts with obstacles); `damage.test.ts`: 4 hits of 28 kill (72, 44, 16, 0).
- [x] **C1.5** Determinism: same seed and inputs give the same state hash after 10,000 ticks.
  **Result:** `damage.test.ts`: 8 characters fighting with random inputs, same hash after 10,000 ticks (more than 1,000 shots and several kills), different hash for another seed or other inputs; bot rounds replay identically from their seed (`bot-rounds.test.ts`).
- [x] **C1.6** Headless bot rounds: in 100 seeded bot-only rounds (8 vs 8) run in Node, ≥ 95 end by elimination before the 3-minute limit; bots never fire at an enemy they have no line of sight to (asserted from events). *(Reworded with the plan: the original said "matches", but the time limit applies to rounds.)*
  **Result:** `npm run bench:sim`: 98 of 100 rounds ended by elimination (average 33.0 s; rounds 20 and 23 reached the limit); 13,172 shots, none without a living enemy in sight within 35° of the shot. A 10-round version runs in the tests.
- [x] **C1.7** Map hot reload: saving the map in Tiled updates the running game within 2 seconds without a page reload (tiles, collision); an invalid change shows the error overlay naming map, layer and object, and the previous map stays active.
  **Result:** checked in headless Chromium on `/dev/scene`: a wall written into `river-village.tmj` was drawn after 1.67 s and stopped the player, with no page reload; an invalid change (a resized tree) showed "themes/vietnam/maps/river-village.tmj › layer "trees" › object 1 at (264, 188)" after 1.64 s while the previous map stayed in play; restoring the file cleared the overlay.
- [x] **C1.8** The `example` theme, added as files only, passes validation, appears in the solo setup, and plays.
  **Result:** its commit (`feat(themes): add the example theme, as files only`) touches only `themes/example/` (22 files); `validate:themes` passes; in Chromium it appears in the solo setup ("Training", map "Arena") and a match starts. Bot rounds also run on its arena (tests). Playing it revealed a client bug, fixed separately: a map without tile objects failed to start.
- [x] **C1.9** Every visible text is translated in French and English; `check:i18n`, font coverage check and literal-string lint pass.
  **Result:** `check:i18n` (keys, variables, coverage by the interface font and the HUD font) and the lint rule pass; menus, HUD and end screen checked in both languages. Content diagnostics in the development overlay stay in English, as decided in M0.
- [x] **C1.10** Performance on the reference machine (Q25): 60 FPS sustained with 16 participants; average simulation tick < 1 ms (benchmark script output recorded in the milestone report, with the hardware used).
  **Result:** on the owner's machine (AMD Ryzen 7 3700X, AMD Radeon RX 5700 XT, Linux, Chromium 151 driven by Playwright with the GPU through ANGLE/OpenGL, 1920×1080, palette pass on): 60 FPS average and minimum over 20 s of a solo match with 16 participants. `npm run bench:sim`: average tick 0.053 ms, p99 0.90 ms with 16 bots (Node 24). Not yet measured on an Iris Xe-class laptop.
- [x] **C1.11** Line coverage ≥ 80 % for `sim`, `content`, `match`, `modes`, `bots`.
  **Result:** sim 99.8 %, content 96.1 %, match 100 %, modes 96.1 %, bots 99.6 %; `npm run check` now fails below 80 %.
- [x] **C1.12** A Playwright smoke test starts a solo match and checks there is no console error for 10 seconds.
  **Result:** `npm run test:e2e` passes locally (11.7 s); CI runs it in the `e2e` job on every push.

---

## M2 — Combat

**Goal:** the full combat toolbox: cover, grenades, flamethrower, destructible elements, blood.

**Branch:** `milestone/2-combat`. **Depends on:** Q29–Q34 and Q61–Q70.

### Scope

- Tile and object flag `cover` with its rules (Q29); bots gain a *take cover* action.
- `thrown` weapon behavior and `grenade` projectile: arc (height `z`), bounces, fuse, explosion with falloff blocked by walls (Q30).
- `flamethrower` weapon behavior and `flame` projectile: short range, ignites flammable tiles, objects and characters; fire spreads; burnt variants (Q31).
- `destructible` map elements: hit points and flammability from Tiled, damage filters, destroyed variants, collision updates (Q33).
- Blood: impact sprays, persistent decals baked into ground chunks, pools under corpses; blood setting (Q32).
- Overhead see-through around the local player (Q34).
- Effects as placeholder 48×48 animations; Vietnam theme weapons extended (Q23).
- Docs: behavior reference regenerated; create-a-map guide covers cover, destructibles, flammability.

### Tasks (one or a few commits each)

*Proposed on 2026-11-03, awaiting approval.* Gameplay first (testable headless), then content and art, then presentation, bots and measurements. Each commit updates the docs it affects.

#### Simulation (`sim`)

1. **Cover.** Tile flag `cover` (Q29): blocks movement and projectiles, not sight; line of sight, bullets and navigation follow. The 360° sweep and random-walk tests extended to cover (C2.1).
2. **Loadouts.** A character carries a primary weapon and a throwable with a count per life (Q61); a `throw` button (Q62); the world tracks both; `ActorState` and events report them.
3. **Explosions.** An explosion system (step 6): damage falling off with distance as parameterized, blocked by obstacles per Q65, friendly fire and self-damage per Q64; `exploded` events; damage sources tagged (`bullet`, `explosion`, `fire`) for damage filters.
4. **Grenades.** `thrown` weapon behavior (to the cursor, clamped to a maximum range, Q30) and `grenade` projectile: arc in height `z`, bounces off solid obstacles with a restitution factor, rolls to a stop, fuse of 2.5 s from the throw; tests for falloff, a wall shielding a character and a bounce (C2.2).
5. **Map elements.** Destructible tiles and objects (Q33): hit points and damage filter from the map, damage from bullets, explosions and fire, destroyed variant replacing the tile or object, collision grid and navigation updated locally, `tileChanged` / `elementDestroyed` events; explosive elements (fuel barrels) explode when destroyed; test of exact hit points (C2.3).
6. **Fire.** Flammable tiles, objects and characters (Q31, Q63): ignition, spread to adjacent flammable cells from a seeded stream, burn-out into the burnt variant, burning characters damaged over about 3 s; `flamethrower` weapon behavior and short-lived `flame` projectiles stopped by obstacles; determinism and spread tests (C2.4).

#### Content, art, maps

7. **Theme and map data.** Weapon and projectile entries for the new behaviors; character loadouts (Q61); Tiled properties `cover`, `hp`, `damageFilter`, `flammable`, `destroyedTile`, `burntTile`, `explosive` on tiles and objects; validation messages and broken fixtures; Tiled project file and behavior reference regenerated (C2.8).
8. **Placeholder art and the Vietnam theme.** M26 and Type 67 grenades, M2A1-7 and LPO-50 flamethrowers and their troopers (Q61, Q23), burnt and destroyed tile variants, fuel barrel, smoke and fire effects, blood spray, decal and pool; the Vietnam map gains sandbag cover, destructible huts and fences, barrels and flammable tall grass (Q63); the example theme stays as it is.

#### Presentation (client)

9. **Changing maps.** A changed tile re-bakes its ground chunk; destroyed objects swap their sprite; fire and burnt ground drawn from events.
10. **Explosions, flames, smoke.** Client effects driven by events, within the palette pass.
11. **Blood.** Impact sprays, decals painted into the ground chunks and pools under corpses, cleared at the start of a round; the blood setting full / reduced / off (Q32, Q66) with a unit-tested effect factory (C2.6).
12. **See-through roofs.** A dithered circle around the local player cuts through overhead tiles and canopies (Q34).
13. **HUD and controls.** Throwables left, the current weapon, the throw key (Q62); the trajectory of a grenade is not shown (Q30: arcade, no aid).

#### Bots

14. **Take cover.** A *take cover* action: under fire, find nearby positions where cover or a solid obstacle stops the attacker's bullets, reach the best one; scenario test (C2.5, reworded per Q68).
15. **New weapons.** Bots use the flamethrower at short range and throw grenades per Q67.

#### Proofs and documentation

16. **Performance.** A dev page parameter for 32 participants (Q69), a stress scene with 200 flame particles and 10 simultaneous explosions, measurements recorded (C2.7); `bench:sim` extended with grenades and fire.
17. **Documentation.** Create-a-map guide (cover, destructibles, flammability, explosives), add-a-theme guide (loadouts, thrown weapons, flamethrowers), behavior reference, ARCHITECTURE, CHANGELOG `0.2.0`, criteria results.

### Success criteria

- [ ] **C2.1** Cover: over a 360° sweep, bullets never pass a `cover` tile; characters behave per Q29 (tests).
- [ ] **C2.2** Grenades: damage decreases with distance as parameterized; a character behind a wall takes no damage; a grenade thrown at a wall bounces back (tests).
- [ ] **C2.3** Destructibles: an element with `hp = N` is destroyed by exactly the damage that reaches N; it switches to its destroyed variant and stops blocking movement and bullets; the renderer updates the tile chunk (tests + dev scene).
- [ ] **C2.4** Fire spreads only across flammable tiles and objects, burns out, and is deterministic for a given seed; burning characters take the configured damage over time (tests).
- [ ] **C2.5** Bots: in a scenario test, a bot under fire reaches a position where cover or a solid obstacle stops its attacker's bullets within 3 seconds in ≥ 90 % of seeded runs. *(Proposed rewording, Q68: under Q29 cover does not hide, it stops bullets.)*
- [ ] **C2.6** Blood decals persist until the end of the round; the blood setting changes effects as specified (manual check + unit test on the effect factory).
- [ ] **C2.7** Performance: 60 FPS on the reference machine with 32 participants, 200 flame particles and 10 simultaneous explosions (measured on a development page, Q69).
- [ ] **C2.8** Every new Tiled property is available as a typed field in the Tiled project file, and the generated behavior reference is up to date (CI check).

---

## M3 — Multiplayer

**Goal:** online matches with room codes, on an authoritative server, playing team elimination.

**Depends on:** Q35–Q41.

### Scope

- `protocol`: lobby messages (JSON), binary codec for inputs, snapshots (quantized, delta-encoded) and events; versioning; handshake with content hash.
- `apps/server`: HTTP + WebSocket (`ws`), room manager with codes, lobby (nickname, team choice, ready, admin settings), room loop running `MatchHost`, interest management, input validation and rate limits, reconnection, bots filling slots, content loaded from disk and watched in development.
- `client`: `RemoteSession` with prediction, reconciliation, interpolation; lobby screens; translated network errors.
- Lag compensation for projectiles evaluated, decided in a decision record.
- Dev tooling: one command starts client and server; a network-condition simulator (latency, jitter) in development; headless client for load tests.
- Docs: multiplayer section in `ARCHITECTURE.md` updated to reality; guide for running a local server; add-a-mode guide updated with network aspects.

### Success criteria

- [ ] **C3.1** Two browsers on two different machines on the same network: one creates a room, the other joins with the code; both play a full team elimination match, with bots filling the teams.
- [ ] **C3.2** With 150 ms simulated round-trip time and 30 ms jitter, the local player moves the frame after the key press; in an automated test, reconciliation corrections exceed 2 px in fewer than 1 % of ticks when there is no collision with another player.
- [ ] **C3.3** Interest management: an automated test shows a client never receives an entity outside its area of interest, and always receives entities inside its view.
- [ ] **C3.4** The server ignores out-of-range inputs and enforces fire rates and movement speed (tests with a malicious headless client).
- [ ] **C3.5** Joining with a wrong or expired code, a full room, or a mismatched content version shows a specific translated message.
- [ ] **C3.6** A player who disconnects mid-round is replaced as in Q39 and can reconnect within the grace period.
- [ ] **C3.7** Load test: 16 headless clients + 16 bots in one room for 10 minutes: average tick < 2 ms, p99 < 5 ms; average downstream < 10 KB/s per client (results recorded).
- [ ] **C3.8** Protocol tests: encode/decode round trips for every message type, including randomized inputs.

---

## M4 — Civilians, 64 participants, match settings

**Goal:** full-size matches, civilians on maps, and every match setting exposed.

**Depends on:** Q42–Q47.

### Scope

- Civilians: entity kind, spawn areas as Tiled zones, simple behavior (Q42), placeholder sprites.
- Scale to 64: profiling, AOI tuning, delta compression improvements, bot time-slicing, solo simulation in a Web Worker (Q47).
- Match settings UI and server validation (Q43), generic settings form driven by the mode's schema.
- A map sized for 64 participants (Q44).
- Server metrics (tick time, bandwidth, rooms) exposed for development.

### Success criteria

- [ ] **C4.1** Load test with 64 participants (32 headless clients + 32 bots) for 10 minutes: average tick < 4 ms, p99 < 8 ms; average downstream < 20 KB/s per client; memory stable (growth < 10 % after warm-up).
- [ ] **C4.2** Solo with 63 bots runs at 60 FPS on the reference machine.
- [ ] **C4.3** Civilians follow Q42 (scenario tests, e.g. civilians move away from an explosion within 1 second).
- [ ] **C4.4** Settings: the total of humans and bots can never exceed 64 (UI and server tests); every setting is translated and validated by the mode's schema.

---

## M5 — Further modes, procedural maps, vehicles, audio

Planned as separate sub-milestones, each with its own plan and branch:

- **M5a — Modes:** free-for-all, zone capture, co-op against waves. *Criterion:* each mode is added without changing `sim`, `match` or the apps' core (verified by the diff); each has tests and appears in the add-a-mode guide as an example.
- **M5b — Procedural maps:** a generator package implementing `MapSource`. *Criterion:* generated maps pass the same validation as Tiled maps, are reproducible from a seed, and are playable in every mode whose requirements they declare.
- **M5c — Vehicles:** multi-tile entities, oriented-box collision, seats and attachments. *Criterion:* a vehicle defined in a theme with engine behaviors only; players can enter, drive and leave; network replication within the M4 bandwidth budget.
- **M5d — Audio:** an `AudioSystem` playing the cues already emitted. *Criterion:* adding sounds to a theme requires files and `sounds.json` entries only.

## Ideas not scheduled

Gamepad support and key remapping (Q45), WebTransport, replays (possible thanks to determinism), lighting effects within the palette, an in-game map preview in the lobby.
