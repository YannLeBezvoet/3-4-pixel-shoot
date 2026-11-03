# Contributing

Thank you for helping. This file covers how work is organized; [CLAUDE.md](CLAUDE.md) lists the commands and where everything is.

## Before you start

- Read [docs/VISION.md](docs/VISION.md) (what the game must be) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (how the code is organized). Structural choices are explained in [docs/decisions/](docs/decisions/).
- Work happens milestone by milestone ([docs/ROADMAP.md](docs/ROADMAP.md)). Open questions live in [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md).
- Content creators: see the guides in [docs/guides/](docs/guides/) (sprites, themes, languages).

## Rules

- **English everywhere** in the repository: code, comments, documentation, commit messages.
- **No displayed text in code.** Every text shown to players is a translation key.
- **Respect module boundaries** ([ARCHITECTURE §4](docs/ARCHITECTURE.md#4-modules-and-dependencies)); the lint rules and type-checking enforce them.
- **Documentation changes in the same commit as the code** it describes.
- **Tests** next to the code (`*.test.ts`). Game logic must be tested.
- `npm run check` must pass before every commit.

## Git

- One branch per milestone (`milestone/<n>-<name>`) or feature.
- Small commits, one change each, in [Conventional Commits](https://www.conventionalcommits.org/) format: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`, with an optional scope (`feat(content): …`).
- Merges into `main` are decided by the project owner.

## Licensing of contributions

By contributing, you agree that your code is licensed under the MIT license and your assets (art, maps, translations, under `themes/` and `locales/`) under CC BY 4.0, as described in [LICENSE](LICENSE), [LICENSE-ASSETS](LICENSE-ASSETS) and [REUSE.toml](REUSE.toml). Add only material you created or whose license allows it, and record third-party material in `CREDITS.md` and `REUSE.toml`.
