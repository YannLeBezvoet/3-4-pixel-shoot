# 0003. Rendering with PixiJS at 960×540, integer scaling

- Status: Proposed
- Date: 2026-11-03

## Context

Pixel art in Resurrect 64, 960×540 internal resolution, integer upscaling with no smoothing, y-sorting, a freely rotating weapon sprite, many sprites at once (64 characters, projectiles, particles, multi-tile objects), and hot-swappable textures. Game logic must stay out of the renderer ([0002](0002-simulation-presentation-split.md)).

## Options considered

- **Phaser.** Complete framework (scenes, loader, physics, input). Its strengths are things we deliberately keep elsewhere (logic, physics, game loop); running it headless on a server is awkward. We would use a fraction of it while fighting its structure.
- **PixiJS v8.** A fast, batched 2D renderer (WebGL, WebGPU) and nothing more. Nearest-neighbor textures, sprite sorting, render textures, custom shaders. We own the loop and the logic.
- **Raw Canvas 2D.** No dependency, simple. But no batching, and effects (palette-quantization pass, flashes, palette swaps) are hard or slow.
- **Raw WebGL.** Maximum control, but we would rebuild a sprite batcher, texture management and text rendering.

## Decision

**PixiJS v8** (exact version pinned by the lockfile), used purely as a renderer.

- Canvas backing size fixed at **960×540**; CSS upscales it by the **largest integer factor** that fits the window, computed in device pixels, with `image-rendering: pixelated`. Remaining space is letterboxed (see open questions for small screens).
- Nearest-neighbor sampling for every texture; camera and sprites snapped to whole pixels.
- Weapon rotation happens at internal resolution, so rotated pixels remain palette colors.
- Layers: ground (tile chunks baked into textures), y-sorted world layer (sort key = ground y), overhead layer, effects, HUD.
- An optional final pass snaps every pixel to the nearest palette color, so blending effects stay in palette (pending an open question).

## Consequences

- We write our own animation player (from Aseprite data), camera, tile-chunk baking and y-sort; each is small.
- PixiJS major versions change APIs; all Pixi usage stays inside `apps/client/src/render` so an upgrade touches one folder.
- Nothing in the renderer influences gameplay; it can be replaced without touching the simulation.
