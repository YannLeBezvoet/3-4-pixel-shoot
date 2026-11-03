// Public entry point. Only what is exported here may be imported by other packages.
export { createBehaviorRegistry } from './behaviors/registry';
export type { BehaviorDefinition, BehaviorKind, BehaviorRegistry } from './behaviors/registry';
export { builtInBehaviors } from './behaviors/built-in';
export { firearm, firearmParams } from './behaviors/weapons/firearm';
export type { FirearmParams } from './behaviors/weapons/firearm';
export {
  BLOCKS_MOVEMENT,
  BLOCKS_PROJECTILES,
  BLOCKS_SIGHT,
  TILE_SIZE,
  TileFlag,
} from './map/map-data';
export type {
  Box,
  Footprint,
  MapData,
  MapObject,
  SpawnArea,
  TileLayer,
  TileType,
  TileVisual,
} from './map/map-data';
export { OUTSIDE_FLAGS, buildCollisionGrid, tileOf } from './map/collision-grid';
export type { CollisionGrid } from './map/collision-grid';
export { asciiMap } from './testing/ascii-map';
