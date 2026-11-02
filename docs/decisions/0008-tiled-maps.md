# 0008. Tiled JSON maps behind a `MapSource` interface

- Status: Proposed
- Date: 2026-11-03

## Context

The owner builds maps in Tiled and sets gameplay properties there: collision, cover, hit points of destructible elements, flammability, spawn points per team, zones. A procedural generator will be added later, so the map source must be interchangeable. Map edits must appear in game without restart. Large objects (trees, buildings) span several 48×48 tiles and are y-sorted by their base.

## Options considered

### File format

- **TMX (XML).** Tiled's default; needs an XML parser in the browser and on the server.
- **TMJ/TSJ (Tiled JSON).** Tiled saves it natively (no export step); parsed with `JSON.parse` everywhere.
- **A custom format produced by a Tiled export script.** Tailored, but adds a manual step and a second format to maintain.

### Gameplay properties

- **Free-form custom properties.** Flexible, but typos fail silently.
- **Tiled custom types** (classes and enums in a Tiled project file). Typed fields with defaults and dropdowns inside Tiled.

## Decision

- Maps and tilesets saved directly as **`.tmj` / `.tsj`** with external tilesets, 48×48 orthogonal tiles.
- Layer roles given by Tiled's **class** field: `ground`, `objects` (y-sorted tile objects), `overhead`, `gameplay` (spawns and zones, not drawn). See [ARCHITECTURE §9](../ARCHITECTURE.md).
- Gameplay properties defined as **typed custom classes** in a Tiled project file (`tools/tiled/`), **generated from the engine's behavior schemas**. Defaults go on tileset tiles; objects can override them.
- Collision footprints of multi-tile objects come from **Tiled's tile collision editor**.
- A **`MapSource`** interface converts any source into engine-neutral **`MapData`**; `TiledMapSource` lives in `packages/content`. The simulation never sees Tiled structures.
- Tiled-specific validation (unknown class, missing team spawn, property out of range) reports map file, layer, object id and position.

## Consequences

- The owner opens `tools/tiled/<project>.tiled-project` once to get typed properties.
- When an engine behavior gains a parameter, the Tiled project file is regenerated; CI fails if it is out of date.
- Supported Tiled features are a documented subset (no infinite maps, no isometric, no image layers for gameplay); the validator rejects the rest with a clear message.
