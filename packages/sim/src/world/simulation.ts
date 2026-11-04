// The public face of the engine: a world advanced one tick at a time by an external clock,
// driven by input commands, reporting what happened as events (decision 0002).
import { createRng } from '@pixel-shoot/shared';
import type { Rng } from '@pixel-shoot/shared';
import type { EntityId } from '../core/entities';
import type { SimEvent } from '../core/events';
import { StateHasher } from '../core/hash';
import type { InputCommand } from '../core/input';
import { NEUTRAL_INPUT } from '../core/input';
import { msToTicks } from '../core/time';
import { createFirearmState } from '../behaviors/weapons/firearm';
import { createFlamethrowerState } from '../behaviors/weapons/flamethrower';
import { createThrowable } from '../behaviors/weapons/thrown';
import type { CollisionGrid } from '../map/collision-grid';
import { buildCollisionGrid } from '../map/collision-grid';
import type { MapData } from '../map/map-data';
import { nearestFreeSpot, spawnSpots } from '../map/spawn';
import type { Catalog } from './catalog';
import type { ExplosionRequest, Rules, WorldState } from './state';
import {
  DEFAULT_RULES,
  STORES,
  createActorIndex,
  createStores,
  indexActors,
  removeEntity,
} from './state';
import type { ElementState } from './elements';
import { MapElements } from './elements';
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
  /** Velocity, world units per second. */
  readonly vx: number;
  readonly vy: number;
  readonly aim: number;
  readonly radius: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly alive: boolean;
  /** Weapon id in the catalog. */
  readonly weapon: string;
  /** Rounds in the magazine. */
  readonly rounds: number;
  /** Spare magazines; null means unlimited. */
  readonly spareMagazines: number | null;
  /** Ticks left in the current reload; 0 when not reloading. */
  readonly reloadLeft: number;
  /** Share of a flamethrower's tank left, from 0 to 1; undefined for other weapons. */
  readonly fuel: number | undefined;
  /** Thrown weapon carried (weapon id in the catalog), if any. */
  readonly throwable: string | undefined;
  /** How many are left in this life. */
  readonly throwables: number;
  /** Whether the character is on fire. */
  readonly burning: boolean;
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
   * Swaps the map in place (development hot reload): new tiles, collision and map elements,
   * reported by `mapReset`; living actors left inside an obstacle move to the nearest free spot.
   * Spawn areas apply from the next spawn.
   */
  replaceMap(map: MapData): void;
  /** While frozen (a countdown), actors may aim but neither move nor fire. */
  frozen: boolean;
  /**
   * Adds an actor. Its `actorSpawned` event is returned by the step that follows (or by the
   * current one when called during a step).
   */
  spawnActor(spec: ActorSpec): EntityId;
  removeActor(id: EntityId): void;
  /** Removes every actor (reported) and projectile (silently), and restores the map elements. */
  clear(): void;
  /** Free spots of a team's spawn areas for a character of `radius`, avoiding living actors. */
  freeSpawnSpots(team: number, radius: number): { x: number; y: number }[];
  /** Sets off an explosion during the next step (development scenes, tests). */
  explode(explosion: ExplosionRequest): void;
  /** Moves an actor at once (development scenes). */
  teleport(id: EntityId, x: number, y: number): void;
  /** Advances one tick. Actors missing from `inputs` stand still and keep their aim. */
  step(inputs?: ReadonlyMap<EntityId, InputCommand>): readonly SimEvent[];
  actor(id: EntityId): ActorState | undefined;
  actors(): readonly ActorState[];
  projectiles(): readonly ProjectileState[];
  /** Map elements still standing. */
  elements(): readonly ElementState[];
  /** Hash of the whole state: equal for equal seeds and inputs. */
  hash(): number;
}

export function createSimulation(options: SimulationOptions): Simulation {
  const root = createRng(options.seed);
  const streams = new Map<string, Rng>();
  const grid = buildCollisionGrid(options.map);
  const world: WorldState = {
    tick: 0,
    nextEntity: 1,
    frozen: false,
    map: options.map,
    grid,
    elements: new MapElements(options.map, grid),
    catalog: options.catalog,
    rules: { ...DEFAULT_RULES, ...options.rules },
    random: (stream) => {
      let rng = streams.get(stream);
      if (!rng) streams.set(stream, (rng = root.fork(stream)));
      return rng;
    },
    events: [],
    damage: [],
    elementDamage: [],
    burntOut: [],
    explosions: [],
    actorIndex: createActorIndex(),
    maxActorRadius: 0,
    ...createStores(),
  };

  const actorState = (id: EntityId): ActorState | undefined => {
    const actor = world.actor.get(id);
    const position = world.position.get(id);
    const velocity = world.velocity.get(id);
    const body = world.body.get(id);
    const health = world.health.get(id);
    const weapon = world.weapon.get(id);
    if (!actor || !position || !velocity || !body || !health || !weapon) return undefined;
    const { team, character, aim } = actor;
    const throwable = world.throwable.get(id);
    const stats = world.catalog.weapons.get(weapon.weapon);
    return {
      id,
      team,
      character,
      x: position.x,
      y: position.y,
      vx: velocity.x,
      vy: velocity.y,
      aim,
      radius: body.radius,
      hp: health.hp,
      maxHp: health.max,
      alive: actor.alive,
      weapon: weapon.weapon,
      rounds: weapon.rounds,
      spareMagazines: weapon.spareMagazines,
      reloadLeft: weapon.reloadLeft,
      fuel:
        stats?.behavior === 'flamethrower'
          ? weapon.rounds / msToTicks(stats.params.tankMs)
          : undefined,
      throwable: throwable?.weapon,
      throwables: throwable?.count ?? 0,
      burning: world.burning.has(id),
    };
  };

  return {
    get tick() {
      return world.tick;
    },
    get map() {
      return world.map;
    },
    get grid() {
      return world.grid;
    },
    rules: world.rules,
    get frozen() {
      return world.frozen;
    },
    set frozen(value) {
      world.frozen = value;
    },

    spawnActor(spec) {
      const stats = world.catalog.characters.get(spec.character);
      if (!stats) throw new Error(`Unknown character "${spec.character}".`);
      const weapon = world.catalog.weapons.get(stats.weapon);
      if (!weapon || weapon.behavior === 'thrown')
        throw new Error(`Unknown weapon "${stats.weapon}".`);
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
        alive: true,
      });
      world.health.set(id, { hp: stats.hitPoints, max: stats.hitPoints });
      world.weapon.set(
        id,
        weapon.behavior === 'firearm'
          ? createFirearmState(weapon)
          : createFlamethrowerState(weapon),
      );
      const thrown = stats.throwable && world.catalog.weapons.get(stats.throwable);
      if (thrown && thrown.behavior === 'thrown') world.throwable.set(id, createThrowable(thrown));
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

    replaceMap(map) {
      world.map = map;
      world.grid = buildCollisionGrid(map);
      world.elements = new MapElements(map, world.grid);
      world.events.push({ type: 'mapReset' });
      for (const [id, actor] of world.actor.entries()) {
        const position = world.position.get(id);
        const body = world.body.get(id);
        if (!actor.alive || !position || !body) continue;
        const spot = nearestFreeSpot(world.grid, position.x, position.y, body.radius);
        if (spot) {
          position.x = spot.x;
          position.y = spot.y;
        }
      }
      indexActors(world);
    },

    clear() {
      for (const id of [...world.actor.ids()]) this.removeActor(id);
      for (const id of [...world.projectile.ids()]) removeEntity(world, id);
      world.explosions.length = 0;
      world.elementDamage.length = 0;
      world.burntOut.length = 0;
      if (world.elements.reset()) world.events.push({ type: 'mapReset' });
    },

    freeSpawnSpots(team, radius) {
      const living = [...world.actor.entries()].filter(([, actor]) => actor.alive);
      return spawnSpots(world.map, world.grid, team, radius).filter((spot) =>
        living.every(([id]) => {
          const position = world.position.get(id);
          const body = world.body.get(id);
          return (
            !position ||
            !body ||
            Math.hypot(position.x - spot.x, position.y - spot.y) >= radius + body.radius
          );
        }),
      );
    },

    explode(explosion) {
      world.explosions.push(explosion);
    },

    teleport(id, x, y) {
      const position = world.position.get(id);
      if (!position) return;
      position.x = x;
      position.y = y;
      indexActors(world);
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
    elements: () => world.elements.snapshot(),

    hash() {
      const hasher = new StateHasher().number(world.tick).number(world.nextEntity);
      for (const name of STORES) {
        const store = world[name];
        hasher.string(name).number(store.size);
        for (const [id, component] of store.entries()) hasher.number(id).value(component);
      }
      hasher.value(world.elements.snapshot());
      return hasher.result;
    },
  };
}
