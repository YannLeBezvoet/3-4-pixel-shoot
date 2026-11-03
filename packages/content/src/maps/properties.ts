// Gameplay properties set in Tiled (ARCHITECTURE §9). The map loader reads them and the Tiled
// project file is generated from them (tools/tiled/), so the editor and the engine agree.
import { TileFlag } from '@pixel-shoot/sim';

export type PropertyType = 'bool' | 'int' | 'string';

export interface PropertyDefinition {
  readonly type: PropertyType;
  readonly default: boolean | number | string;
  /** For the guide and the Tiled project file. */
  readonly description: string;
}

/** Properties of tiles in a tileset, overridable on each tile object of a map. */
export const TILE_PROPERTIES = {
  solid: {
    type: 'bool',
    default: false,
    description: 'Blocks movement, bullets and sight (walls, rocks, huts, tree trunks).',
  },
  impassable: {
    type: 'bool',
    default: false,
    description: 'Blocks movement only; bullets and sight pass (deep water).',
  },
  low: {
    type: 'bool',
    default: false,
    description:
      'Tile objects only: drawn just above the ground, below characters, their weapons and bullets, instead of being depth-sorted (sandbags). No gameplay effect.',
  },
} as const satisfies Record<string, PropertyDefinition>;

/** The tile flag each boolean gameplay property sets; `low` only changes drawing. */
export const TILE_FLAG_PROPERTIES: Readonly<Record<'solid' | 'impassable', number>> = {
  solid: TileFlag.solid,
  impassable: TileFlag.impassable,
};

/** Properties of the map itself. */
export const MAP_PROPERTIES = {
  nameKey: {
    type: 'string',
    default: '',
    description: 'Translation key of the map name, in the theme translation files.',
  },
} as const satisfies Record<string, PropertyDefinition>;

/** Properties of a spawn area (an object of class "spawn" in a gameplay layer, Q52). */
export const SPAWN_PROPERTIES = {
  team: {
    type: 'int',
    default: 1,
    description: 'Team that appears in this area: 1, 2…',
  },
} as const satisfies Record<string, PropertyDefinition>;

/** Layer classes and what they do. */
export const LAYER_CLASSES = {
  ground: 'Tile layer drawn below everything; its tiles carry gameplay flags.',
  overhead: 'Tile layer drawn above everything (canopy, roofs); no gameplay effect.',
  objects: 'Object layer of tile objects (trees, huts), depth-sorted by their base.',
  gameplay: 'Object layer of spawn areas; not drawn.',
} as const;

export type LayerClass = keyof typeof LAYER_CLASSES;

/** Classes of objects in a gameplay layer. */
export const GAMEPLAY_OBJECT_CLASSES = { spawn: SPAWN_PROPERTIES } as const;
