// The public face of the engine: a world advanced one tick at a time by an external clock,
// driven by input commands, reporting what happened as events (decision 0002).
import { createRng } from '@pixel-shoot/shared';
import type { Rng } from '@pixel-shoot/shared';
import type { EntityId } from '../core/entities';
import type { SimEvent } from '../core/events';
import { StateHasher } from '../core/hash';
import type { InputCommand } from '../core/input';
import { NEUTRAL_INPUT } from '../core/input';
import { createFirearmState } from '../behaviors/weapons/firearm';
import type { CollisionGrid } from '../map/collision-grid';
import { buildCollisionGrid } from '../map/collision-grid';
import type { MapData } from '../map/map-data';
import type { Catalog } from './catalog';
import type { Rules, WorldState } from './state';
import {
  DEFAULT_RULES,
  STORES,
  createActorIndex,
  createStores,
  indexActors,
  removeEntity,
} from './state';
import { SYSTEMS, applyInputs } from './systems';

export interface SimulationOptions {
  readonly map: MapData;
  readonly catalog: Catalog;
  /** Seed of every random draw in the world. */
  readonly seed: number | string;
  readonly rules?: Partial<Rules>;
}

export interface ActorSpec {
  readonly team: number;
  /** Character id in the catalog. */
  readonly character: string;
  /** Ground point, in world units. */
  readonly x: number;
  readonly y: number;
  readonly aim?: number;
}

/** A read-only copy of an actor's state. */
export interface ActorState {
  readonly id: EntityId;
  readonly team: number;
  readonly character: string;
  readonly x: number;
  readonly y: number;
  readonly aim: number;
  readonly radius: number;
  readonly hp: number;
  readonly maxHp: number;
  /** Weapon id in the catalog. */
  readonly weapon: string;
  /** Rounds in the magazine. */
  readonly rounds: number;
  /** Spare magazines; null means unlimited. */
  readonly spareMagazines: number | null;
  /** Ticks left in the current reload; 0 when not reloading. */
  readonly reloadLeft: number;
}

/** A read-only copy of a projectile's state. */
export interface ProjectileState {
  readonly id: EntityId;
  /** Projectile id in the catalog. */
  readonly kind: string;
  readonly owner: EntityId;
  readonly x: number;
  readonly y: number;
  /** Height above the ground point, for drawing. */
  readonly z: number;
  readonly angle: number;
}

export interface Simulation {
  /** Number of steps done. */
  readonly tick: number;
  readonly map: MapData;
  readonly grid: CollisionGrid;
  readonly rules: Rules;
  /**
   * Adds an actor. Its `actorSpawned` event is returned by the step that follows (or by the
   * current one when called during a step).
   */
  spawnActor(spec: ActorSpec): EntityId;
  removeActor(id: EntityId): void;
  /** Advances one tick. Actors missing from `inputs` stand still and keep their aim. */
  step(inputs?: ReadonlyMap<EntityId, InputCommand>): readonly SimEvent[];
  actor(id: EntityId): ActorState | undefined;
  actors(): readonly ActorState[];
  projectiles(): readonly ProjectileState[];
  /** Hash of the whole state: equal for equal seeds and inputs. */
  hash(): number;
}

export function createSimulation(options: SimulationOptions): Simulation {
  const root = createRng(options.seed);
  const streams = new Map<string, Rng>();
  const world: WorldState = {
    tick: 0,
    nextEntity: 1,
    map: options.map,
    grid: buildCollisionGrid(options.map),
    catalog: options.catalog,
    rules: { ...DEFAULT_RULES, ...options.rules },
    random: (stream) => {
      let rng = streams.get(stream);
      if (!rng) streams.set(stream, (rng = root.fork(stream)));
      return rng;
    },
    events: [],
    actorIndex: createActorIndex(),
    maxActorRadius: 0,
    ...createStores(),
  };

  const actorState = (id: EntityId): ActorState | undefined => {
    const actor = world.actor.get(id);
    const position = world.position.get(id);
    const body = world.body.get(id);
    const health = world.health.get(id);
    const weapon = world.weapon.get(id);
    if (!actor || !position || !body || !health || !weapon) return undefined;
    const { team, character, aim } = actor;
    return {
      id,
      team,
      character,
      x: position.x,
      y: position.y,
      aim,
      radius: body.radius,
      hp: health.hp,
      maxHp: health.max,
      weapon: weapon.weapon,
      rounds: weapon.rounds,
      spareMagazines: weapon.spareMagazines,
      reloadLeft: weapon.reloadLeft,
    };
  };

  return {
    get tick() {
      return world.tick;
    },
    map: world.map,
    grid: world.grid,
    rules: world.rules,

    spawnActor(spec) {
      const stats = world.catalog.characters.get(spec.character);
      if (!stats) throw new Error(`Unknown character "${spec.character}".`);
      const weapon = world.catalog.weapons.get(stats.weapon);
      if (!weapon) throw new Error(`Unknown weapon "${stats.weapon}".`);
      if (!Number.isInteger(spec.team) || spec.team < 1)
        throw new Error(`Teams are numbered from 1; got ${spec.team}.`);
      const id = world.nextEntity++;
      const aim = spec.aim ?? 0;
      world.position.set(id, { x: spec.x, y: spec.y });
      world.velocity.set(id, { x: 0, y: 0 });
      world.body.set(id, { radius: stats.radius });
      world.actor.set(id, {
        team: spec.team,
        character: stats.id,
        speed: stats.speed,
        aim,
        input: { ...NEUTRAL_INPUT, aim },
      });
      world.health.set(id, { hp: stats.hitPoints, max: stats.hitPoints });
      world.weapon.set(id, createFirearmState(weapon));
      world.maxActorRadius = Math.max(world.maxActorRadius, stats.radius);
      indexActors(world);
      world.events.push({ type: 'actorSpawned', entity: id, team: spec.team, character: stats.id });
      return id;
    },

    removeActor(id) {
      if (!world.actor.has(id)) return;
      removeEntity(world, id);
      indexActors(world);
      world.events.push({ type: 'actorRemoved', entity: id });
    },

    step(inputs = new Map()) {
      world.tick++;
      applyInputs(world, inputs);
      for (const system of SYSTEMS) system(world);
      return world.events.splice(0);
    },

    actor: actorState,
    actors: () => [...world.actor.ids()].map((id) => actorState(id) as ActorState),
    projectiles: () =>
      [...world.projectile.entries()].map(([id, projectile]) => {
        const position = world.position.get(id) ?? { x: 0, y: 0 };
        return {
          id,
          kind: projectile.kind,
          owner: projectile.owner,
          x: position.x,
          y: position.y,
          z: projectile.z,
          angle: Math.atan2(projectile.dirY, projectile.dirX),
        };
      }),

    hash() {
      const hasher = new StateHasher().number(world.tick).number(world.nextEntity);
      for (const name of STORES) {
        const store = world[name];
        hasher.string(name).number(store.size);
        for (const [id, component] of store.entries()) hasher.number(id).value(component);
      }
      return hasher.result;
    },
  };
}
