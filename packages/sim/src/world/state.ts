// The world's internal state: component stores and what systems share. Only the simulation
// and its systems see it; other packages go through `Simulation` (world/simulation.ts).
import type { Rng } from '@pixel-shoot/shared';
import type { EntityId } from '../core/entities';
import { ComponentStore } from '../core/entities';
import type { SimEvent } from '../core/events';
import type { InputCommand } from '../core/input';
import type { CollisionGrid } from '../map/collision-grid';
import type { MapData } from '../map/map-data';
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
}

export interface Health {
  hp: number;
  readonly max: number;
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
  readonly map: MapData;
  readonly grid: CollisionGrid;
  readonly catalog: Catalog;
  readonly rules: Rules;
  /** A named random stream, independent of the others (decision 0011). */
  readonly random: (stream: string) => Rng;
  /** Events waiting to be returned by the next step. */
  readonly events: SimEvent[];
  readonly position: ComponentStore<Position>;
  readonly velocity: ComponentStore<Velocity>;
  readonly body: ComponentStore<Body>;
  readonly actor: ComponentStore<Actor>;
  readonly health: ComponentStore<Health>;
}

/** Every component store, in the fixed order used for hashing and removal. */
export const STORES = ['position', 'velocity', 'body', 'actor', 'health'] as const;

export function createStores() {
  return {
    position: new ComponentStore<Position>(),
    velocity: new ComponentStore<Velocity>(),
    body: new ComponentStore<Body>(),
    actor: new ComponentStore<Actor>(),
    health: new ComponentStore<Health>(),
  } satisfies Record<(typeof STORES)[number], ComponentStore<unknown>>;
}

export function removeEntity(world: WorldState, id: EntityId): void {
  for (const store of STORES) world[store].delete(id);
}
