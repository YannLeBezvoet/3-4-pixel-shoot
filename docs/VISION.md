# Vision

> Living document. It records what the project owner wants the game to be.
> When the vision changes, this file is updated and the change is noted in `CHANGELOG.md`.
> Last updated: 2026-11-03. Working title: **Pixel Shoot**.

## 1. Summary

A top-down **twin-stick shooter in pixel art**, playable in the browser.
Gameplay is **arcade** (fast, punchy); the setting is **serious and credible**.
The first theme is the **Vietnam War**; other themes (World War II, etc.) will follow.
Players fight **solo against bots** or **online without an account**, up to **64 participants** per match.

## 2. Working agreement

The project is long-lived and built over many sessions. The lead developer (Claude) works with the project owner as follows:

- **Priorities**, in order: modular and coherent architecture, documentation that is always up to date, then speed.
- **Milestones.** Work proceeds milestone by milestone. A milestone never starts before the owner has approved its plan.
- **No silent decisions.** Any point not specified in this document gets a proposed option, recorded in [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md), until the owner settles it.
- **Technology.** Technology choices are the lead developer's. Every structural choice is justified in a decision record ([`decisions/`](decisions/)).

## 3. The game

### 3.1 Genre and controls

- Top-down twin-stick shooter running in the browser.
- Movement with **ZQSD** (AZERTY layout; the same physical keys as WASD on QWERTY).
- Aim and fire with the **mouse**.
- **Open maps** (not corridors or arenas).

### 3.2 Tone

- Arcade gameplay: fast, nervous, immediate.
- Serious, credible setting.
- The game shows **blood**.

### 3.3 Themes

- First theme: the Vietnam War.
- Later themes: World War II and others.
- A theme is independent of the game mode: any theme combines with any mode (see §6).

### 3.4 Civilians

- Civilians (non-player characters) are present on maps.
- For now they have **no gameplay role**. Later, their role will depend on the game mode.

### 3.5 Game modes

1. **Team elimination with permanent death**: the first mode implemented.
2. Later: **free-for-all**, **zone capture**, **co-op against waves of bots**.

### 3.6 Mechanics

- **Cover** that stops bullets.
- **Grenades**.
- **Flamethrower**.
- **Destructible elements**.
- Later: **vehicles**.

### 3.7 Audio

Out of scope for now. Themes and the engine only reserve the places where sounds will go.

## 4. Art direction

- **Pixel art**, top-down view slightly tilted: a **3/4 perspective with square tiles**, as in RPG Maker MV/MZ. **Not isometric.**
- **One grid: 48×48 px.** Tiles and character frames are 48×48. Large elements (buildings, trees, vehicles) are assembled from several 48×48 tiles. Weapons, projectiles and effects (flames, explosions, blood) also use 48×48 cells or multiples of them.
- **Characters**: chibi style inspired by RPG Maker, **using none of its assets**. 8 on-screen directions, only **5 drawn** (down, down-side, side, up-side, up); the other 3 are obtained by **horizontal mirroring**.
- **The weapon is a separate sprite** that rotates freely toward the mouse.
- **Palette: Resurrect 64** (file `resurrect-64.gpl` in the repository). **No color outside the palette.**
- **Depth sorting by vertical position**: a character is drawn behind a tree when it stands above the tree's base, in front of it when below.
- **Internal resolution: 960×540 px**, scaled up by an **integer factor** (×2 at 1080p, ×4 at 4K), rendered crisp with no smoothing.
- Until the owner provides sprites, **placeholder sprites** are generated at the right dimensions and in the palette. The owner replaces them **without touching code**.

## 5. Multiplayer and bots

- **Solo** against bots, or **online multiplayer without accounts**: a player creates a room and shares its code; others join with the code.
- The number of humans and bots is set when the match is created, **up to 64 participants** in total.
- The network architecture is designed for **64 participants from the start** (authoritative server, each player receives only the entities near them, etc.), even if early milestones are tested with fewer.
- **Even in solo, game logic is separate from rendering**, so the same logic can later run on the server without a rewrite.
- **Bots**: basic intelligence to begin with (move, aim, shoot, take cover), designed to be enriched later.

## 6. Extensibility

- A **theme** groups resources: sprites, tilesets, maps, weapons and their characteristics, texts, and later sounds. It is independent of the game mode.
- **Adding a theme requires no code**: a folder of resources plus configuration files, validated at load time with clear error messages.
- **Behaviors** (weapon types, projectile types, map element types) are **engine code**. A theme picks among them and sets their parameters.
- **Adding a game mode may require code**, but through a documented interface, **without modifying the engine**.
- **The map source is interchangeable**: Tiled files today, a procedural generator later.
- **Entities larger than one tile** are supported (vehicles are coming).

## 7. Creation tools

- **Aseprite** for sprites. Animations are exported as a **PNG sheet + JSON** (one Aseprite tag = one animation) and loaded automatically by the game. The project defines a convention for tag names, the 5 drawn directions and the weapon attachment point. Source `.aseprite` files are versioned.
- **Tiled** for maps. Gameplay properties are set in Tiled: collision, cover, hit points of destructible elements, flammability, spawn points per team, zones.
- **Hot reload**: during development, a change to a sprite or a map appears in the game without a restart.
- **Palette check**: a script verifies that every image uses only Resurrect 64 colors.

## 8. Technical requirements

- Technologies are free to choose and justified in writing.
- Game logic is covered by automated tests.
- The project is **open source**. A decision record proposes the license for the code and the license for the assets (they may differ, e.g. MIT for code and CC BY 4.0 for assets).

## 9. Languages

- **Everything in the repository is in English**: code, comments, documentation (including this file), commit messages.
- **The game is multilingual**: the player chooses the language. Initial languages: **French and English**.
- **No displayed text is hard-coded.** Adding a language means adding a translation file, with no code. Theme-specific texts are translatable the same way.

## 10. Documentation (absolute requirement)

- `CLAUDE.md` at the root: project map, conventions, commands, where to find what. It is the lead developer's entry point at every session. Kept short and current.
- `docs/VISION.md`: this document, updated when the vision changes.
- `docs/ARCHITECTURE.md`: modules and how they relate.
- `docs/decisions/`: one record per structural decision (context, options, choice, consequences).
- Practical guides for the owner: create a sprite, create a map, add a theme, add a mode, add a language.
- `docs/ROADMAP.md` and `CHANGELOG.md`.
- **Every code change updates the related documentation in the same commit.**

## 11. Git workflow

- The lead developer makes the commits: small, one change each, using **Conventional Commits** (`feat:`, `fix:`, `docs:`…).
- **One branch per milestone or feature.**
- **Nothing is merged into `main` and nothing is pushed without the owner's approval.**

## 12. Milestones (overview)

Details, deliverables and success criteria live in [`ROADMAP.md`](ROADMAP.md).

0. **Foundations**: project structure, tooling, documentation, licenses, placeholder sprites, translation system.
1. **Playable solo**: a Tiled map, a soldier in 8 directions, movement, aiming, shooting, a few basic bots, UI in French and English, and the team elimination mode against bots (moved here from milestone 3, see Q13).
2. **Combat**: cover, grenades, flamethrower, destructible elements, blood.
3. **Multiplayer**: rooms with codes, server, team elimination online.
4. **Civilians** on maps, scaling to 64 participants, match settings.
5. Further modes, then procedural generation, then vehicles, then audio.

## 13. Out of scope for now

- Audio (only placeholders for sound references).
- Player accounts.
- Vehicles and procedural maps (planned for milestone 5).
