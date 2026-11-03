// Public entry point. Only what is exported here may be imported by other packages.
export { createBehaviorRegistry } from './behaviors/registry';
export type { BehaviorDefinition, BehaviorKind, BehaviorRegistry } from './behaviors/registry';
export { builtInBehaviors } from './behaviors/built-in';
export { firearm, firearmParams } from './behaviors/weapons/firearm';
export type { FirearmParams } from './behaviors/weapons/firearm';
export { MAX_BULLET_SPEED, bullet, bulletParams } from './behaviors/projectiles/bullet';
export type { BulletParams } from './behaviors/projectiles/bullet';
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
export { testCatalog } from './testing/test-catalog';
export type { TestCatalogOptions } from './testing/test-catalog';
export { TICK_RATE, TICK_SECONDS, msToTicks, ticksToMs } from './core/time';
export { Button, NEUTRAL_INPUT, hasButton, sanitizeInput } from './core/input';
export type { InputCommand } from './core/input';
export type { EntityId } from './core/entities';
export type { SimEvent, SimEventType } from './core/events';
export { createCatalog } from './world/catalog';
export type { Catalog, CharacterStats, ProjectileStats, WeaponStats } from './world/catalog';
export { DEFAULT_RULES } from './world/state';
export type { Rules } from './world/state';
export { createSimulation } from './world/simulation';
export type {
  ActorSpec,
  ActorState,
  ProjectileState,
  Simulation,
  SimulationOptions,
} from './world/simulation';
export { circleBlocked, moveCircle } from './physics/move-circle';
export { castSegment, lineOfSight } from './physics/raycast';
export type { SegmentHit } from './physics/raycast';
export { nearestFreeSpot, spawnSpots } from './map/spawn';
export { mapSuitsMode } from './modes/game-mode';
export type {
  DisplayText,
  GameModeDefinition,
  GameModeInstance,
  MapRequirements,
  ModeApi,
  ModeState,
  ParticipantId,
  ParticipantInfo,
} from './modes/game-mode';
