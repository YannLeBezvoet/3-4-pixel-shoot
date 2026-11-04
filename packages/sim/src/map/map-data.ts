// Engine-neutral description of a map (ARCHITECTURE §9). Map sources (Tiled files today, a
// generator later) produce it; the simulation reads its gameplay parts and the client also
// draws its visual parts. Distances are world units: pixels at internal resolution.

/** Side of a square tile, in world units. */
export const TILE_SIZE = 48;

/** Gameplay flags of a tile or a collision footprint, combined as bits. */
export const TileFlag = {
  /** Blocks movement, projectiles and sight: walls, rocks, huts. */
  solid: 1,
  /** Blocks movement only; projectiles and sight pass: deep water, chasms (Q50). */
  impassable: 2,
  /**
   * Low obstacle such as sandbags (Q29), on map objects only: blocks movement, not sight.
   * Projectiles pass it when fired from a weapon reaching over it, otherwise with the
   * footprint's `bulletPassPercent` chance.
   */
  cover: 4,
} as const;

/** Flags that stop a character. */
export const BLOCKS_MOVEMENT = TileFlag.solid | TileFlag.impassable | TileFlag.cover;
/** Flags that always stop a projectile; `cover` stops it only on a failed pass. */
export const BLOCKS_PROJECTILES = TileFlag.solid;
/** Flags that stop line of sight. */
export const BLOCKS_SIGHT = TileFlag.solid;

/** What can hurt a map element (Q33), combined as bits. */
export const DamageFilter = {
  bullet: 1,
  explosion: 2,
  fire: 4,
} as const;

/** Every kind of damage. */
export const ANY_DAMAGE = DamageFilter.bullet | DamageFilter.explosion | DamageFilter.fire;

/** The blast of an element that explodes when destroyed. */
export interface ElementBlast {
  /** World units. */
  readonly radius: number;
  /** Damage at the center. */
  readonly damage: number;
}

/** How a tile or an object behaves as a map element (Q33). */
export interface ElementProperties {
  /** Hit points; missing means damage cannot destroy it. */
  readonly hp?: number;
  /** `DamageFilter` bits of what hurts it; missing means everything. */
  readonly damageFilter?: number;
  /** Blast when destroyed. */
  readonly explosive?: ElementBlast;
}

/** A picture cut from an image: the image's path in the theme folder and a rectangle in it. */
export interface TileVisual {
  /** Image path relative to the theme folder, e.g. "tilesets/jungle-ground.png". */
  readonly image: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One kind of tile used by the map: its gameplay flags and its picture. */
export interface TileType {
  readonly flags: number;
  readonly visual?: TileVisual;
  /** Makes tiles of this kind map elements. */
  readonly element?: ElementProperties;
  /** Tile kind left once destroyed (an index into `MapData.tileTypes`); 0 is no tile. */
  readonly destroyedTile?: number;
}

export interface TileLayer {
  readonly name: string;
  /**
   * `ground` layers are drawn below everything and carry gameplay flags;
   * `overhead` layers are drawn above everything and have no gameplay effect.
   */
  readonly role: 'ground' | 'overhead';
  /** `width × height` indices into `MapData.tileTypes`, row by row; 0 means no tile. */
  readonly cells: readonly number[];
}

/** An axis-aligned rectangle in world units; (x, y) is its top-left corner. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Footprint extends Box {
  readonly flags: number;
  /** Id of the map object it belongs to; cover is passed or not per object. */
  readonly object?: number;
  /**
   * Cover only: chance in percent (0 to 100) that a projectile passes it when the shooter's
   * weapon does not reach over it. Missing means 0.
   */
  readonly bulletPassPercent?: number;
}

/** A placed object made of one picture, possibly larger than a tile (a tree, a hut). */
export interface MapObject {
  /** Identifier in the source (the Tiled object id), used in messages. */
  readonly id: number;
  /** Ground point: bottom center of the picture. Objects are depth-sorted by it. */
  readonly x: number;
  readonly y: number;
  readonly visual?: TileVisual;
  /**
   * Drawn just above the ground, below characters and projectiles, instead of being
   * depth-sorted: a low object such as sandbags. No gameplay effect.
   */
  readonly low?: boolean;
  /** Collision boxes in world coordinates. */
  readonly footprints: readonly Footprint[];
  /** Makes this object a map element. */
  readonly element?: ElementProperties;
  /** Picture left once destroyed; without it, the object disappears. */
  readonly destroyedVisual?: TileVisual;
}

/** An area where the members of a team appear at the start of a round (Q52). */
export interface SpawnArea extends Box {
  /** Team number, from 1. */
  readonly team: number;
}

export interface MapData {
  readonly id: string;
  /** Translation key of the map name. */
  readonly nameKey: string;
  /** Size in tiles. */
  readonly width: number;
  readonly height: number;
  /** Tile kinds referenced by layer cells. Index 0 is "no tile" and has no flags. */
  readonly tileTypes: readonly TileType[];
  /** Tile layers in drawing order. */
  readonly layers: readonly TileLayer[];
  readonly objects: readonly MapObject[];
  readonly spawns: readonly SpawnArea[];
}
