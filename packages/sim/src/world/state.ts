// The world's internal state: component stores and what systems share. Only the simulation
// and its systems see it; other packages go through `Simulation` (world/simulation.ts).
import type { Rng } from '@pixel-shoot/shared';
import type { EntityId } from '../core/entities';
import { ComponentStore } from '../core/entities';
import type { SimEvent } from '../core/events';
import type { InputCommand } from '../core/input';
import type { CollisionGrid } from '../map/collision-grid';
import type { MapData } from '../map/map-data';
import { TILE_SIZE } from '../map/map-data';
import { SpatialHash } from '../physics/spatial-hash';
import type { Catalog } from './catalog';

/** Ground point, in world units. */
export interface Position {
  x: number;
  y: number;
}

/** World units per second. */
export interface Velocity {
  x: number;
  y: number;
}

export interface Body {
  radius: number;
}

/** Something driven by input commands: a player's or a bot's character. */
export interface Actor {
  /** Team number, from 1. */
  readonly team: number;
  /** Character id in the catalog. */
  readonly character: string;
  /** World units per second. */
  readonly speed: number;
  aim: number;
  /** The input applied during the current tick. */
  input: InputCommand;
  /** False once killed: a corpse ignores input, blocks nothing and cannot be hit (Q28). */
  alive: boolean;
}

/** Damage waiting for the damage system (7) of the current tick. */
export interface DamageRequest {
  readonly target: EntityId;
  readonly attacker: EntityId;
  readonly weapon: string;
  readonly amount: number;
}

export interface Health {
  hp: number;
  readonly max: number;
}

/** The weapon an actor holds and its state. */
export interface WeaponState {
  /** Weapon id in the catalog. */
  readonly weapon: string;
  /** Rounds in the magazine. */
  rounds: number;
  /** Spare magazines; null means unlimited. */
  spareMagazines: number | null;
  /** Ticks before the next shot may be fired; fractional, so any rate of fire is exact. */
  cooldown: number;
  /** Ticks left in the current reload; 0 when not reloading. */
  reloadLeft: number;
  /** Whether fire was held during the previous tick (semi-automatic weapons). */
  triggerWasHeld: boolean;
}

/** A projectile in flight. Its position is in the position store. */
export interface Projectile {
  /** Projectile id in the catalog. */
  readonly kind: string;
  readonly owner: EntityId;
  readonly team: number;
  /** Weapon that fired it. */
  readonly weapon: string;
  /** Unit direction. */
  readonly dirX: number;
  readonly dirY: number;
  /** World units per tick. */
  readonly speed: number;
  readonly damage: number;
  /** Height above the ground, for drawing; collision happens on the ground plane. */
  readonly z: number;
  /** Distance it may still travel. */
  remaining: number;
}

/** Match rules the simulation applies. */
export interface Rules {
  /** Whether bullets hit and hurt teammates (Q21, Q49). */
  readonly friendlyFire: boolean;
}

export const DEFAULT_RULES: Rules = { friendlyFire: false };

export interface WorldState {
  /** Number of steps done. */
  tick: number;
  nextEntity: EntityId;
  /** While frozen (a countdown), actors may aim but neither move nor fire. */
  frozen: boolean;
  /** Replaced in place by hot reload (development). */
  map: MapData;
  grid: CollisionGrid;
  readonly catalog: Catalog;
  readonly rules: Rules;
  /** A named random stream, independent of the others (decision 0011). */
  readonly random: (stream: string) => Rng;
  /** Events waiting to be returned by the next step. */
  readonly events: SimEvent[];
  readonly damage: DamageRequest[];
  /** Actors by position; current after the movement system. */
  readonly actorIndex: SpatialHash;
  /** Largest collider radius among actors, to size neighbor queries. */
  maxActorRadius: number;
  readonly position: ComponentStore<Position>;
  readonly velocity: ComponentStore<Velocity>;
  readonly body: ComponentStore<Body>;
  readonly actor: ComponentStore<Actor>;
  readonly health: ComponentStore<Health>;
  readonly weapon: ComponentStore<WeaponState>;
  readonly projectile: ComponentStore<Projectile>;
}

/** Every component store, in the fixed order used for hashing and removal. */
export const STORES = [
  'position',
  'velocity',
  'body',
  'actor',
  'health',
  'weapon',
  'projectile',
] as const;

export function createStores() {
  return {
    position: new ComponentStore<Position>(),
    velocity: new ComponentStore<Velocity>(),
    body: new ComponentStore<Body>(),
    actor: new ComponentStore<Actor>(),
    health: new ComponentStore<Health>(),
    weapon: new ComponentStore<WeaponState>(),
    projectile: new ComponentStore<Projectile>(),
  } satisfies Record<(typeof STORES)[number], ComponentStore<unknown>>;
}

export function removeEntity(world: WorldState, id: EntityId): void {
  for (const store of STORES) world[store].delete(id);
}

/** Cell size of the actor index: one tile. */
export const ACTOR_INDEX_CELL = TILE_SIZE;

/** Rebuilds the index of living actors from current positions. */
export function indexActors(world: WorldState): void {
  world.actorIndex.clear();
  for (const [id, actor] of world.actor.entries()) {
    const position = world.position.get(id);
    const body = world.body.get(id);
    if (actor.alive && position && body)
      world.actorIndex.insert(id, position.x, position.y, body.radius);
  }
}

export function createActorIndex(): SpatialHash {
  return new SpatialHash(ACTOR_INDEX_CELL);
}
