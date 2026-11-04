# 0016. Map elements as Tiled properties over an immutable map

- Status: Proposed
- Date: 2026-11-04

## Context

Milestone 2 makes the map change during a round: tiles and objects break and burn, and everything comes back at the next round (Q31, Q33). The architecture planned map-element behaviors (`destructible`, `flammable`) registered like weapon behaviors. `MapData` is shared: the client draws it, bots read it, hot reload replaces it, and the same map serves every round.

## Options considered

- **Registered map-element behaviors**, each with a parameter schema, as for weapons. Consistent with weapons, but a map maker sets properties on tiles in Tiled, not parameters in a JSON file, and a tile needs several at once (destructible and flammable and explosive): behaviors would have to combine.
- **Plain Tiled properties** (`hp`, `flammable`, `explosive`…) read by the map loader. One place to edit, typed in Tiled through the generated project file, and any combination works.
- **Mutating `MapData`** when something breaks. Simple, but every holder of the map sees a half-destroyed one, and a new round needs a deep copy or a reload.
- **An overlay of current state** beside an immutable `MapData`, with the collision grid following it.

## Decision

- Map elements are **Tiled properties**, defined in `packages/content/src/maps/properties.ts`, not behaviors: the `map-element` kind leaves the behavior registry. The behavior reference lists these properties.
- `MapData` stays **immutable**. `MapElements` (`packages/sim/src/world/elements.ts`) holds the current tiles of each layer and the state of each element, and updates the collision grid in place, so that bots keep their reference to it. `clear` restores everything and reports `mapReset`.
- Presentation and bots follow **events** (`tileChanged`, `elementDestroyed`, `fireStarted`, `fireEnded`, `mapReset`), as for everything else.
- A tile's `destroyedTile` and `burntTile` name a tile of **the same tileset**, by its id.
- Blood is painted into **textures of its own**, above the ground chunks rather than into them (`render/decals.ts`).

## Consequences

- A new kind of element is a new property, not a new class; an element with truly new logic would still need engine code, in the map element or fire systems.
- A multiplayer client joining mid-round will need the current state of the elements as a snapshot, not only events: milestone 3 must add it. `Simulation.elements()` is the starting point.
- A variant must live in the same tileset as its tile, which ties tilesets together: adding tiles to a tileset placed before another in a map shifts the other's ids, as always in Tiled.
- Blood stays on the ground when a tile below it changes: a stain may outlive the wall it was next to. It costs one texture per chunk touched, about 2 MB each.
