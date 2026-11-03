# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Q12](docs/OPEN_QUESTIONS.md): version `0.<n>.0` at the end of milestone n.

## [Unreleased]

## [0.1.0] — 2026-11-03

Milestone 1 (playable solo), on branch `milestone/1-playable-solo`; merging into `main` awaits the owner's decision.

### Added

- `sim`: the world core (entity-component stores, 60 Hz ticks, input commands, events, named random streams, state hash); map data and the collision grid (`solid`, `impassable`); movement with sliding collision and separation between characters; the `firearm` weapon and `bullet` projectile behaviors with swept collision; damage, deaths and corpses; the game-mode API; map replacement for hot reload.
- `content`: projectiles, effects and character gameplay values in themes; conversion of a theme into the simulation catalog, measuring hands and barrels on the sprites; Tiled maps (`.tmj` with external `.tsj` tilesets) read into map data with precise messages.
- `match`: the match host (participants, inputs, bots, mode lifecycle, kills and deaths, world view).
- `modes`: team elimination (rounds, countdown, time limit, round cap, friendly fire setting) and a `sandbox` mode for development.
- `bots`: perception (sight, hearing, memory), A* navigation with path smoothing, a utility-AI brain, easy / normal / hard difficulty.
- Client: local session with a fixed 60 Hz step and interpolation; keyboard (physical keys) and mouse input; the match drawn with map chunks, depth sorting, a centered camera and event-driven effects; a HUD with a generated bitmap font; main menu, solo setup, settings, pause and end screens; spectating teammates after death; the palette pass; map hot reload; a test scene at `/dev/scene`; an FPS counter in development builds.
- Content: the Vietnam theme's rifle bullet, effects, tilesets and first map (`river-village`); the `example` theme, added as files only.
- Tools: generated Tiled project file and behavior reference; HUD font generator (`assets:font`); headless bot benchmark (`bench:sim`); map validation in `validate:themes`.
- Tests: coverage thresholds (80 % of lines in the game-logic packages) in `npm run check`; a Playwright smoke test (`test:e2e`) run by CI.
- Docs: guides "create a map" and "add a mode"; the add-a-theme guide covers projectiles, effects and maps; behavior reference; decision records 0014 (HUD bitmap font) and 0015 (browser smoke tests).

### Changed

- Open questions Q48–Q60 settled with the milestone 1 plan; Q20 changed by the owner: the camera stays centered on the player.

## [0.0.0] — 2026-11-03

Milestone 0 (foundations), merged into `main`.

### Added

- npm workspace with every package of the architecture; module boundaries enforced by TypeScript project references and lint rules generated from `package.json`, proven by a test.
- `shared`: vectors, angles and octants, seeded RNG, `Result`.
- `sim`: behavior registry and the `firearm` weapon parameter schema.
- `content`: theme loading and validation with precise messages, Aseprite sprite sheet reader, sprite conventions (tags, 5 drawn directions, mirroring, slices), animation timing, translation files, palette reader, content index, JSON Schemas for editors.
- Vietnam theme: US Army and PAVN & Viet Cong, one rifleman each, M16A1 and AK-47, placeholder art, English and French texts.
- Client: 960×540 rendering with integer upscaling, translations with a language menu (Press Start 2P font), content store, sprite viewer at `/dev/sprites`, hot reload of themes and translations with an error overlay.
- Tools: `check:palette`, `validate:themes`, `schemas`/`check:schemas`, `check:i18n` (with font coverage), placeholder generator and report, `sprites:export`, Aseprite `new-character.lua`.
- Interface texts in English and French.
- Licenses (MIT code, CC BY 4.0 assets, OFL font), REUSE mapping, credits, contributing guide, README.
- GitHub Actions workflow: `npm run check` and REUSE.
- Guides: create a sprite, add a theme, add a language.

## Planning

### Added

- Project vision (`docs/VISION.md`).
- Architecture proposal (`docs/ARCHITECTURE.md`) and 13 proposed decision records (`docs/decisions/`).
- Roadmap with success criteria per milestone (`docs/ROADMAP.md`).
- Open questions with proposals (`docs/OPEN_QUESTIONS.md`).
- `CLAUDE.md` as the entry point for development sessions.

### Changed

- Decision records 0001–0013 accepted; open questions Q1–Q47 settled as proposed; team elimination moved to milestone 1.
