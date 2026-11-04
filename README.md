# Pixel Shoot

A top-down twin-stick shooter in pixel art, played in the browser. Arcade gameplay in a serious setting; first theme: the Vietnam War. Solo against bots now, online matches up to 64 participants later.

> Working title. **Status: milestone 2 (combat) done**: solo team elimination against bots, with cover, grenades, flamethrowers, destructible map elements and blood. See the [roadmap](docs/ROADMAP.md).

## Quick start

Requires Node.js 24 or newer.

```
npm install
npm run dev      # http://localhost:5173 — Solo; developer pages /dev/scene and /dev/sprites
npm run check    # everything CI checks
```

## Documentation

| | |
|---|---|
| [Vision](docs/VISION.md) | What the game must be |
| [Architecture](docs/ARCHITECTURE.md) | How the code is organized, and why ([decisions](docs/decisions/)) |
| [Roadmap](docs/ROADMAP.md) | Milestones and success criteria |
| [Guides](docs/guides/) | Create a sprite, create a map, add a theme, add a mode, add a language |
| [CLAUDE.md](CLAUDE.md) | Commands and project map |
| [Contributing](CONTRIBUTING.md) | How to contribute |

## Licenses

Code: [MIT](LICENSE). Assets (art, maps, translations): [CC BY 4.0](LICENSE-ASSETS). Third-party material keeps its own license ([credits](CREDITS.md), [REUSE.toml](REUSE.toml)).
