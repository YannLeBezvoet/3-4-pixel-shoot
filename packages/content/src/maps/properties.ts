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
  cover: {
    type: 'bool',
    default: false,
    description:
      'Tile objects only: a low obstacle (sandbags) that blocks movement but not sight. Every bullet passes it when the weapon firing it reaches over it; otherwise with the bulletPassPercent chance (Q29).',
  },
  bulletPassPercent: {
    type: 'int',
    default: 0,
    description:
      'Cover only: chance in percent (0 to 100) that a bullet fired from a weapon not over the object passes it, drawn once per bullet and object.',
  },
  low: {
    type: 'bool',
    default: false,
    description:
      'Tile objects only: drawn just above the ground, below characters, their weapons and bullets, instead of being depth-sorted (sandbags). No gameplay effect.',
  },
  hp: {
    type: 'int',
    default: 0,
    description:
      'Hit points of a destructible element; 0 means damage cannot destroy it. A destructible ground tile needs destroyedTile.',
  },
  damageFilter: {
    type: 'string',
    default: '',
    description:
      'What hurts a destructible element, separated by commas: bullet, explosion, fire. Empty means everything.',
  },
  destroyedTile: {
    type: 'int',
    default: -1,
    description:
      'Id, in the same tileset, of the tile left once destroyed (rubble). -1 means none: an object then disappears.',
  },
  flammable: {
    type: 'bool',
    default: false,
    description:
      'Catches fire, spreads it to adjacent flammable elements and burns out (Q31). Also works on overhead tiles (thatch roofs). A flammable ground tile needs burntTile or destroyedTile.',
  },
  burntTile: {
    type: 'int',
    default: -1,
    description:
      'Id, in the same tileset, of the tile left once burnt out. -1 means the destroyed tile, or none.',
  },
  explosive: {
    type: 'bool',
    default: false,
    description:
      'Explodes when destroyed (fuel barrels): it needs hp, or flammable to go off when it burns out.',
  },
  blastRadius: {
    type: 'int',
    default: 144,
    description: 'Explosive only: radius of the blast in pixels (one tile is 48 pixels).',
  },
  blastDamage: {
    type: 'int',
    default: 120,
    description: 'Explosive only: damage at the center of the blast, falling linearly to 0.',
  },
} as const satisfies Record<string, PropertyDefinition>;

/** The tile flag each boolean gameplay property sets; `low` only changes drawing. */
export const TILE_FLAG_PROPERTIES: Readonly<Record<'solid' | 'impassable' | 'cover', number>> = {
  solid: TileFlag.solid,
  impassable: TileFlag.impassable,
  cover: TileFlag.cover,
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
