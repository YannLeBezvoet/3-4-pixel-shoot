# Create a map

Maps are made in [Tiled](https://www.mapeditor.org/) and saved directly in Tiled's JSON format: no export step. The game reads every `maps/<name>.tmj` file of a theme (Q55). This guide lists what the game understands; `npm run validate:themes` checks every map and names the file, the layer, the object and its position for each problem.

## 1. Files

```
themes/<theme>/
├── maps/<name>.tmj          # the map
└── tilesets/<name>.tsj      # tilesets, shared by the maps
    tilesets/<name>.png      # their images (Resurrect 64 palette, 48 px grid)
```

- **Map:** File › New › New Map: orientation **Orthogonal**, tile size **48 × 48**, fixed size (not infinite), tile layer format **CSV**. Save as `.tmj` under `maps/`.
- **Tilesets:** New Tileset › **Based on Tileset Image**, saved as an external `.tsj` file under `tilesets/` (a tileset embedded in the map is refused: use *Export Tileset As…*). Tilesets made of separate images are not supported.
- **Map name:** Map › Map Properties › custom property `nameKey` (string): the translation key of the map name in the theme's `locales/` files.

## 2. Layers

Each layer has a **class** (Layer Properties › Class) that says what it is for:

| Class | Layer type | What it does |
|---|---|---|
| `ground` | tile layer | Drawn below everything. Its tiles carry the gameplay flags (`solid`, `impassable`). Several ground layers may be stacked; their flags add up. |
| `overhead` | tile layer | Drawn above everything: canopy, roofs. No gameplay effect. |
| `objects` | object layer | Tile objects (Insert Tile) such as trees and huts, larger than a tile if needed, drawn in depth order by their base. |
| `gameplay` | object layer | Spawn areas. Not drawn. |

Group layers and image layers are not supported. Hidden layers still count.

## 3. Gameplay flags

Set on tiles in the tileset editor (Tile Properties), as boolean custom properties:

| Property | Effect |
|---|---|
| `solid` | Blocks movement, bullets and line of sight: walls, rocks, huts, trunks. |
| `impassable` | Blocks movement only; bullets and sight pass over it: deep water (Q50). |

- In a **ground** layer, the flags apply to the whole 48 × 48 tile.
- For a **tile object** (an `objects` layer), the flags apply to the object's **collision shapes**, drawn on the tile in Tiled's collision editor (Tileset › Tile Collision Editor). Shapes are **rectangles** without rotation (Q55); other shapes are refused. A solid tile without shapes blocks nothing (the validator warns).
- A tile object can override its tile's flags with its own `solid` or `impassable` property, e.g. a decorative tree that blocks nothing.

Unknown property names are reported as warnings: they are usually typos.

## 4. Spawn areas

In a `gameplay` layer, draw a **rectangle** (not a point) with the class `spawn` and an `int` property `team` (1, 2…). At the start of each round, the members of a team appear on free tiles inside their team's areas, one per tile (Q52). For team elimination, each team needs room for 8 participants.

## 5. What is refused

- Isometric, staggered or hexagonal maps; infinite maps; tiles that are not 48 × 48 in tile layers (place larger pictures as tile objects).
- Flipped or rotated tiles and tile objects; resized tile objects.
- Tile data that is not CSV (Map Properties › Tile Layer Format).
- Maps larger than 512 × 512 tiles.

## 6. Check it

```
npm run validate:themes
```

For example:

```
error: themes/vietnam/maps/village.tmj › layer "trees" › object 14 at (480, 912)
  The object is resized to 48×144 px; tile objects keep their tile's size (96×144 px).
```
