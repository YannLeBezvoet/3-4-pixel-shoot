# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Q12](docs/OPEN_QUESTIONS.md): version `0.<n>.0` at the end of milestone n.

## [Unreleased]

### Changed

- Vietnam theme: fences are tile objects (tileset `fence.tsj`) placed over any ground, instead of ground tiles with grass drawn in; the `river-village` map places them in a `fences` objects layer. They are now `cover` (Q79): sight goes through them, as do 70 % of the bullets from farther away and every bullet from a weapon reaching over them. They keep their 40 hit points and still burn, and they leave their own broken or burnt remains. The ground tilesets keep an empty slot in their place so later tile ids do not move.

### Fixed

- A tile or object burning out could catch fire again from a neighbor in the same tick, which left a flame on it for the rest of the round.

## [0.2.0] — 2026-11-04

Milestone 2 (combat), merged into `main`.

### Added

- Cover (Q29, changed by the owner, and Q72), ahead of the milestone 2 plan: the tile-object property `cover` blocks movement, not sight; every bullet from a weapon reaching over it passes, the others with the object's `bulletPassPercent` chance, drawn once per bullet and object. Vietnam sandbags are cover with a 40 % chance. Test maps gain `s` (sandbags).
- Tile property `low` for tile objects (drawing only): the object is drawn just above the ground, below corpses, characters, their weapons and bullets, instead of being depth-sorted. Sandbags are `low`, so a soldier's weapon is never hidden behind them.
- `sim`: loadouts with a throwable and a throw button; the distance to the cursor in inputs; `thrown` and `flamethrower` weapon behaviors, `grenade` and `flame` projectile behaviors; explosions with falloff, stopped by obstacles; fire that spreads, burns out and sets characters ablaze; map elements that take damage within a filter, change into their variants and restore at each round; damage tagged with its source.
- `content`: map element properties in Tiled (`hp`, `damageFilter`, `destroyedTile`, `flammable`, `burntTile`, `explosive`, `blastRadius`, `blastDamage`) with validation messages; fire values and world effects in `theme.json`; characters' `throwable`; checks of loadouts and of which projectile a weapon fires.
- `bots`: *take cover*; flamethrower troopers close in and fire within reach; grenades at enemies behind cover or in groups; bots hear explosions.
- Client: tiles that change on the map, destroyed objects, explosions, flames looping on what burns, smoke, blood decals and pools with the blood setting (full, reduced, off), see-through circle under roofs and trees, the throw on the right button or G, throwables, weapon and fuel on the HUD, the choice of character in the solo setup. `/dev/scene` takes `participants`, `character`, `at` and `stress`.
- Content: the Vietnam theme's flamethrower troopers, flamethrowers, grenades, fuel barrels, sandbag rubble, smoke and blood art, all placeholders; what burns and breaks on `river-village`.
- Tools: `bench:sim` counts grenades, explosions, fires and map elements destroyed, with one bot in four a flamethrower trooper; the behavior reference lists the map element properties.
- Tests: a browser test burning a hut through the see-through; the smoke test throws a grenade.
- Docs: create-a-map guide (map elements), add-a-theme guide (loadouts, flamethrowers, grenades, fire, world effects), create-a-sprite guide (decals), decision record 0016 (proposed).

### Changed

- Vietnam theme: sandbags are tile objects (tileset `sandbags.tsj`) placed over any ground, instead of ground tiles with dirt drawn in; the `river-village` map places them in a `sandbags` objects layer. The ground tileset keeps an empty slot in their place so later tile ids do not move.
- Vietnam theme: the sandbags' collision shape covers exactly their redrawn picture, a column 32 px wide.
- Open questions Q61–Q70 settled with the milestone 2 plan.
- Map elements are Tiled properties rather than registered behaviors: the `map-element` kind leaves the behavior registry (decision 0016).

## [0.1.0] — 2026-11-03

Milestone 1 (playable solo), merged into `main`.

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
