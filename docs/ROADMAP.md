# Roadmap

> Each milestone has its own branch, a plan approved by the owner before it starts, and success criteria that can be checked.
> Milestone 0 is planned in detail below. Later milestones list their scope and criteria; each gets a detailed task plan, submitted for approval, when it starts.
> Questions referenced as **Qn** are in [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

## Status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Foundations | **Plan awaiting approval** |
| M1 | Playable solo | Not started |
| M2 | Combat | Not started |
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

- [ ] **C0.1** On a clean clone, `npm ci && npm run check` exits with code 0. The CI workflow passes on the branch (once pushed, with the owner's approval).
- [ ] **C0.2** The boundary test passes: a fixture using a DOM global inside a platform-agnostic package fails type-checking, and a fixture importing `pixi.js` from `packages/sim` fails lint.
- [ ] **C0.3** `npm run dev`, then `/dev/sprites`: each placeholder soldier shows in 8 directions; the 3 left-facing ones are mirrored copies of the drawn right-facing ones (facing marker visible); every tag plays with its Aseprite frame durations; the rifle stays attached to the `hand` point, rotates to follow the mouse, flips so it is never upside down, and is drawn behind the body when aiming up.
- [ ] **C0.4** Scaling: unit tests confirm factor ×2 for a 1920×1080 device-pixel viewport, ×4 for 3840×2160, ×1 for 1366×768, with centered letterboxing. In the browser at ×2, a screenshot shows every source pixel as a 2×2 block of one color (no smoothing).
- [ ] **C0.5** Hot reload: overwriting a placeholder's PNG + JSON while the viewer is open updates it within 2 seconds, without a page reload, keeping the selected animation. Writing invalid JSON shows the error overlay with the file and the problem; fixing the file clears it.
- [ ] **C0.6** `npm run check:palette` passes on every image in the repository. On fixtures with one off-palette pixel and one semi-transparent pixel, it fails and prints file, coordinates, color and nearest palette color (covered by tests).
- [ ] **C0.7** `npm run validate:themes` passes on `vietnam`. Tests cover at least 10 broken fixtures (missing file, unknown reference, frame size not a multiple of 48, missing direction tag, missing `hand` slice, invalid weapon parameter, unknown `formatVersion`, missing translation key, duplicate id, unknown faction), each asserting the exact message.
- [ ] **C0.8** `npm run assets:placeholders` is deterministic: running it twice leaves `git status` clean. Generated files pass the palette check and theme validation.
- [ ] **C0.9** The viewer's UI text is in French or English, switchable, and the choice survives a reload; first visit follows the browser language. Adding a fixture `locales/xx.json` with a `_meta.name` makes it appear in the language menu with no code change. `npm run check:i18n` fails when a key is missing in `fr.json`. ESLint reports a string literal in a UI component.
- [ ] **C0.10** *(checked by the owner, Aseprite required)* With `ASEPRITE_PATH` set, `npm run sprites:export` re-exports every `.aseprite` file. A character created with `new-character.lua`, then exported, passes validation and appears in the viewer with no other change.
- [ ] **C0.11** `reuse lint` passes. All files listed in task 16 exist and describe the current state; `ARCHITECTURE.md` marks what is still planned.

---

## M1 — Playable solo

**Goal:** a complete solo match against bots on a Tiled map, with the architecture that multiplayer will reuse.

**Depends on:** Q13–Q28. **Proposed change to the original plan:** the team elimination mode is implemented here, in solo, rather than in M3 (Q13). It gives solo a goal and validates the `GameMode` interface early; M3 then brings it online.

### Scope

- `sim`: world and entity store, 60 Hz tick, input commands, movement with collision (circle vs grid), aiming, `firearm` weapon behavior (fire rate, spread, damage, magazine, reload), `bullet` projectile behavior with swept collision, health and death, events, `MapData`, behavior registry, determinism.
- `content`: `TiledMapSource` (`.tmj`/`.tsj` → `MapData`), Tiled layer classes, tile flags `solid`; Tiled project file generated from engine schemas; map validation messages.
- `match`: `MatchHost` with participants, bot scheduling, mode lifecycle.
- `modes`: `team-elimination` (Q21).
- `bots`: perception with line of sight, utility AI with wander / engage / chase / reload, A\* navigation, difficulty parameters.
- `client`: `LocalSession`; renderer (tile chunks, y-sorted world layer with multi-tile trees, overhead layer, interpolation, camera with look-ahead, optional palette pass per Q14); input (physical keys, mouse aim); HUD in PixiJS with bitmap font (health, ammo, team counts, round info, kill feed); DOM menus (main menu, solo setup, settings, end of round/match); spectating after death; map hot reload; client particles for muzzle flash and hits.
- Theme: Vietnam placeholder map (Q27), factions and rifles (Q22, Q23); a second minimal theme `themes/example/` proving a theme needs no code.
- Docs: guides `docs/guides/create-a-map.md` and `docs/guides/add-a-mode.md`; add-a-theme guide completed for weapons; generated behavior reference.

### Success criteria

- [ ] **C1.1** From the main menu: Solo → choose bots per team (up to 16 participants, Q24) → the match starts on the Vietnam map; a full match plays to a winner and returns to the menu.
- [ ] **C1.2** ZQSD on AZERTY and WASD on QWERTY move the player with no setting (physical keys). The character faces the cursor in 8 directions; the weapon follows the exact mouse angle.
- [ ] **C1.3** Y-sorting: a dev scene shows the player walking around a tree; the player is hidden by the tree when above its base and drawn over it when below (screenshot check, and a unit test on sort keys).
- [ ] **C1.4** Simulation tests (ASCII maps): bullets never cross `solid` tiles over a 360° sweep of angles at max projectile speed; a character never overlaps a `solid` tile after 10,000 random-input ticks; damage and death follow weapon parameters.
- [ ] **C1.5** Determinism: same seed and inputs give the same state hash after 10,000 ticks.
- [ ] **C1.6** Headless bot matches: in 100 seeded bot-only matches (8 vs 8) run in Node, ≥ 95 end with a winner before the round time limit; bots never fire at an enemy they have no line of sight to (asserted from events).
- [ ] **C1.7** Map hot reload: saving the map in Tiled updates the running game within 2 seconds without a page reload (tiles, collision); an invalid change shows the error overlay naming map, layer and object, and the previous map stays active.
- [ ] **C1.8** The `example` theme, added as files only, passes validation, appears in the solo setup, and plays.
- [ ] **C1.9** Every visible text is translated in French and English; `check:i18n`, font coverage check and literal-string lint pass.
- [ ] **C1.10** Performance on the reference machine (Q25): 60 FPS sustained with 16 participants; average simulation tick < 1 ms (benchmark script output recorded in the milestone report).
- [ ] **C1.11** Line coverage ≥ 80 % for `sim`, `content`, `match`, `modes`, `bots`.
- [ ] **C1.12** A Playwright smoke test starts a solo match and checks there is no console error for 10 seconds.

---

## M2 — Combat

**Goal:** the full combat toolbox: cover, grenades, flamethrower, destructible elements, blood.

**Depends on:** Q29–Q34.

### Scope

- Tile and object flag `cover` with its rules (Q29); bots gain a *take cover* action.
- `thrown` weapon behavior and `grenade` projectile: arc (height `z`), bounces, fuse, explosion with falloff blocked by walls (Q30).
- `flamethrower` weapon behavior and `flame` projectile: short range, ignites flammable tiles, objects and characters; fire spreads; burnt variants (Q31).
- `destructible` map elements: hit points and flammability from Tiled, damage filters, destroyed variants, collision updates (Q33).
- Blood: impact sprays, persistent decals baked into ground chunks, pools under corpses; blood setting (Q32).
- Overhead see-through around the local player (Q34).
- Effects as placeholder 48×48 animations; Vietnam theme weapons extended (Q23).
- Docs: behavior reference regenerated; create-a-map guide covers cover, destructibles, flammability.

### Success criteria

- [ ] **C2.1** Cover: over a 360° sweep, bullets never pass a `cover` tile; characters behave per Q29 (tests).
- [ ] **C2.2** Grenades: damage decreases with distance as parameterized; a character behind a wall takes no damage; a grenade thrown at a wall bounces back (tests).
- [ ] **C2.3** Destructibles: an element with `hp = N` is destroyed by exactly the damage that reaches N; it switches to its destroyed variant and stops blocking movement and bullets; the renderer updates the tile chunk (tests + dev scene).
- [ ] **C2.4** Fire spreads only across flammable tiles and objects, burns out, and is deterministic for a given seed; burning characters take the configured damage over time (tests).
- [ ] **C2.5** Bots: in a scenario test, a bot under fire reaches a position hidden from its attacker by cover within 3 seconds in ≥ 90 % of seeded runs.
- [ ] **C2.6** Blood decals persist until the end of the round; the blood setting changes effects as specified (manual check + unit test on the effect factory).
- [ ] **C2.7** Performance: 60 FPS on the reference machine with 32 participants, 200 flame particles and 10 simultaneous explosions.
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
