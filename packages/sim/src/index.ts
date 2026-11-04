// Public entry point. Only what is exported here may be imported by other packages.
export { createBehaviorRegistry } from './behaviors/registry';
export type { BehaviorDefinition, BehaviorKind, BehaviorRegistry } from './behaviors/registry';
export { builtInBehaviors } from './behaviors/built-in';
export { firearm, firearmParams } from './behaviors/weapons/firearm';
export type { FirearmParams } from './behaviors/weapons/firearm';
export { thrown, thrownParams } from './behaviors/weapons/thrown';
export type { ThrownParams } from './behaviors/weapons/thrown';
export { MAX_BULLET_SPEED, bullet, bulletParams } from './behaviors/projectiles/bullet';
export type { BulletParams } from './behaviors/projectiles/bullet';
export { grenade, grenadeParams } from './behaviors/projectiles/grenade';
export type { GrenadeParams } from './behaviors/projectiles/grenade';
export {
  ANY_DAMAGE,
  BLOCKS_MOVEMENT,
  BLOCKS_PROJECTILES,
  BLOCKS_SIGHT,
  DamageFilter,
  TILE_SIZE,
  TileFlag,
} from './map/map-data';
export type {
  Box,
  ElementBlast,
  ElementProperties,
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
export type { DamageSource, SimEvent, SimEventType } from './core/events';
export { PROJECTILE_OF_WEAPON, createCatalog } from './world/catalog';
export type {
  Catalog,
  CharacterStats,
  FirearmStats,
  ProjectileStats,
  ThrownStats,
  WeaponStats,
} from './world/catalog';
export type { ElementState } from './world/elements';
export { DEFAULT_RULES } from './world/state';
export type { ExplosionRequest, Rules } from './world/state';
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
