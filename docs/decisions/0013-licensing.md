# 0013. MIT for code, CC BY 4.0 for assets

- Status: Accepted (2026-11-03)
- Date: 2026-11-03

## Context

The project is open source. Code and assets (sprites, tilesets, maps, translations, later sounds) may have different licenses. Contributors and reusers must be able to tell which license applies to which file.

## Options considered

### Code

- **MIT.** Permissive, short, universally understood. Anyone may reuse the code, including in closed products.
- **MPL-2.0.** File-level copyleft: modified files stay open, the rest can be combined freely.
- **GPL-3.0.** Strong copyleft for distributed software; does not cover a hosted server.
- **AGPL-3.0.** Strong copyleft including network use: anyone running a modified server must publish their changes. Protects the project from closed forks of the server; discourages some reuse.

### Assets

- **CC BY 4.0.** Free reuse with attribution, including commercial.
- **CC BY-SA 4.0.** Same, but derivatives must use the same license.
- **CC0.** Public domain dedication; no attribution required.

### Marking

- A `LICENSE` file for code and a `LICENSE-ASSETS` file for assets, with a short rule in the README.
- The **REUSE** specification (a `REUSE.toml` mapping paths to licenses, checkable by a tool).

## Decision

- **Code: MIT** (`LICENSE`).
- **Assets: CC BY 4.0** (`LICENSE-ASSETS`), covering everything under `themes/` and `locales/`, and any original image, map or translation file elsewhere.
- Paths are mapped in a **`REUSE.toml`** file; a REUSE check runs in CI.
- The README states the rule in two lines and asks for attribution in the form "Pixel Shoot contributors" (working title, Q1).
- **Third-party material** (fonts, palette) keeps its own license and is credited in `CREDITS.md`. The Resurrect 64 palette was created by Kerrie Lake; it is credited even though a list of colors is generally not copyrightable. Fonts must be OFL, CC0 or CC BY.
- **No RPG Maker assets**, even modified: only the style is a reference.

## Consequences

- Maximum freedom for reusers; anyone may run a closed modified server. If that matters, AGPL-3.0 for the code is the alternative (see open questions).
- Contributors agree to license their contributions under these terms (stated in `CONTRIBUTING.md`, created in milestone 0).
- Copyright line in `LICENSE`: "Copyright (c) 2026 Yann Le Bezvoet and contributors" (Q1).

## Amendments

- **2026-11-03.** Implemented: `LICENSE` (MIT), `LICENSE-ASSETS` (notice for CC BY 4.0), license texts in `LICENSES/` (REUSE layout), `REUSE.toml`, `CREDITS.md`, `CONTRIBUTING.md`. Documentation under `docs/` is covered by the code license (MIT). The palette gets a `LicenseRef-Resurrect64-Palette` entry that credits its author without claiming a license on their behalf. The Press Start 2P font is SIL OFL 1.1.
