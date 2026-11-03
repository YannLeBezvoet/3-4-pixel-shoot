# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Q12](docs/OPEN_QUESTIONS.md): version `0.<n>.0` at the end of milestone n.

## [Unreleased]

Milestone 0 (foundations). Becomes version 0.0.0 when the owner merges it (Q12).

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
