// A bot's mind (decision 0011): every few ticks it scores candidate actions and keeps the
// best (utility AI); every tick it steers along its path, turns its aim smoothly toward its
// target and fires only at an enemy it sees right now. It produces an InputCommand, like a
// keyboard: same rules as a player.
import type { Rng } from '@pixel-shoot/shared';
import { normalizeAngle } from '@pixel-shoot/shared';
import type {
  ActorState,
  CollisionGrid,
  EntityId,
  InputCommand,
  MapData,
  SimEvent,
} from '@pixel-shoot/sim';
import { Button, NEUTRAL_INPUT, TICK_RATE, TILE_SIZE } from '@pixel-shoot/sim';
import type { Difficulty } from './difficulty';
import type { NavGrid, Point } from './navigation';
import { findPath, smoothPath } from './navigation';
import type { Sighting } from './perception';
import { Memory, canSee, visibleEnemies } from './perception';

/** Distance under which an engaged bot stops walking toward its target. */
const ENGAGE_STOP_DISTANCE = 360;
/** Aim must be this close to the target's direction before firing, in radians. */
const FIRE_TOLERANCE = 0.2;
/** Waypoints count as reached within this distance. */
const ARRIVED = 10;
/** Without progress for this long, the bot gives up its destination. */
const STUCK_TICKS = TICK_RATE;

export interface BotSurroundings {
  readonly self: ActorState;
  /** Every actor: the brain only uses what perception lets through. */
  readonly actors: readonly ActorState[];
  /** Events of the previous tick (gunfire to hear). */
  readonly events: readonly SimEvent[];
  readonly tick: number;
}

interface Context extends BotSurroundings {
  readonly seen: readonly Sighting[];
}

type ActionId = 'engage' | 'reload' | 'chase' | 'wander';

interface Action {
  readonly id: ActionId;
  /** How much this action is worth now, from 0 to 1. */
  score(context: Context): number;
}

export class BotBrain {
  readonly #difficulty: Difficulty;
  readonly #random: Rng;
  #map: MapData;
  #grid: CollisionGrid;
  #nav: NavGrid;
  readonly #thinkOffset: number;
  readonly #memory = new Memory();
  #action: ActionId = 'wander';
  #target: EntityId | undefined;
  /** Tick at which the current target was first seen. */
  #targetSince = 0;
  #aimError = 0;
  #aim: number | undefined;
  #destination: Point | undefined;
  #path: Point[] = [];
  #progress = { x: 0, y: 0, tick: 0 };

  readonly #actions: readonly Action[] = [
    { id: 'engage', score: (c) => (c.seen.length > 0 ? 1 : 0) },
    {
      id: 'reload',
      score: (c) =>
        c.self.rounds === 0 && c.self.reloadLeft === 0
          ? 0.9
          : c.seen.length === 0 && c.self.rounds < 8
            ? 0.5
            : 0,
    },
    { id: 'chase', score: () => (this.#memory.clue ? 0.6 : 0) },
    { id: 'wander', score: () => 0.2 },
  ];

  constructor(options: {
    difficulty: Difficulty;
    random: Rng;
    map: MapData;
    grid: CollisionGrid;
    nav: NavGrid;
    /** Spreads the decisions of several bots over different ticks. */
    thinkOffset: number;
  }) {
    this.#difficulty = options.difficulty;
    this.#random = options.random;
    this.#map = options.map;
    this.#grid = options.grid;
    this.#nav = options.nav;
    this.#thinkOffset = options.thinkOffset;
  }

  /** Uses a new map (development hot reload): current paths are dropped. */
  setWorld(world: { map: MapData; grid: CollisionGrid; nav: NavGrid }): void {
    this.#map = world.map;
    this.#grid = world.grid;
    this.#nav = world.nav;
    this.#path = [];
    this.#destination = undefined;
  }

  /** The action chosen at the last decision, for tests and debugging. */
  get action(): ActionId {
    return this.#action;
  }

  update(surroundings: BotSurroundings): InputCommand {
    const { self, tick } = surroundings;
    if (!self.alive) return NEUTRAL_INPUT;
    this.#aim ??= self.aim;
    if ((tick + this.#thinkOffset) % this.#difficulty.thinkTicks === 0) this.#think(surroundings);
    else this.#memory.update(self, [], surroundings.events, surroundings.actors, tick);

    let move = { x: 0, y: 0 };
    let buttons = 0;
    const target =
      this.#target === undefined
        ? undefined
        : surroundings.actors.find((a) => a.id === this.#target);
    if (
      this.#action === 'engage' &&
      target?.alive &&
      canSee(self, target.x, target.y, this.#grid)
    ) {
      const toTarget = Math.atan2(target.y - self.y, target.x - self.x);
      this.#turnToward(toTarget + this.#aimError);
      const distance = Math.hypot(target.x - self.x, target.y - self.y);
      if (distance > ENGAGE_STOP_DISTANCE) move = this.#steer(self, tick);
      const aimed = Math.abs(normalizeAngle(this.#aim - toTarget)) < FIRE_TOLERANCE;
      if (aimed && tick - this.#targetSince >= this.#difficulty.reactionTicks && self.rounds > 0)
        buttons |= Button.fire;
    } else {
      move = this.#steer(self, tick);
      if (move.x !== 0 || move.y !== 0) this.#turnToward(Math.atan2(move.y, move.x));
      if (this.#action === 'reload') buttons |= Button.reload;
    }
    return { move, aim: this.#aim, aimDistance: 0, buttons };
  }

  #think(surroundings: BotSurroundings): void {
    const { self, tick } = surroundings;
    const seen = visibleEnemies(self, surroundings.actors, this.#grid);
    this.#memory.update(self, seen, surroundings.events, surroundings.actors, tick);
    const context: Context = { ...surroundings, seen };
    let best = this.#actions[0]!;
    for (const action of this.#actions)
      if (action.score(context) > best.score(context)) best = action;
    this.#action = best.id;
    this.#aimError = this.#random.range(-this.#difficulty.aimError, this.#difficulty.aimError);

    if (best.id === 'engage') {
      const nearest = seen[0]!;
      if (nearest.id !== this.#target) this.#targetSince = tick;
      this.#target = nearest.id;
      this.#goTo(self, { x: nearest.x, y: nearest.y }, tick);
      return;
    }
    this.#target = undefined;
    if (best.id === 'chase') {
      const clue = this.#memory.clue!;
      if (Math.hypot(clue.x - self.x, clue.y - self.y) < TILE_SIZE) this.#memory.forget();
      else this.#goTo(self, clue, tick);
    } else if (!this.#destination || this.#path.length === 0) {
      this.#goTo(self, this.#wanderPoint(self), tick);
    }
  }

  /** Somewhere to explore: an enemy spawn area most of the time, any walkable tile otherwise. */
  #wanderPoint(self: ActorState): Point {
    const enemyAreas = this.#map.spawns.filter((s) => s.team !== self.team);
    for (let attempt = 0; attempt < 20; attempt++) {
      const area =
        enemyAreas.length > 0 && this.#random.chance(0.6)
          ? this.#random.pick(enemyAreas)
          : undefined;
      const x = area
        ? this.#random.range(area.x, area.x + area.width)
        : this.#random.range(0, this.#map.width * TILE_SIZE);
      const y = area
        ? this.#random.range(area.y, area.y + area.height)
        : this.#random.range(0, this.#map.height * TILE_SIZE);
      if (this.#nav.walkable(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE))) return { x, y };
    }
    return { x: self.x, y: self.y };
  }

  #goTo(self: ActorState, destination: Point, tick: number): void {
    const same =
      this.#destination &&
      Math.floor(this.#destination.x / TILE_SIZE) === Math.floor(destination.x / TILE_SIZE) &&
      Math.floor(this.#destination.y / TILE_SIZE) === Math.floor(destination.y / TILE_SIZE);
    if (same && this.#path.length > 0) return;
    this.#destination = destination;
    const tiles = findPath(this.#nav, self, destination);
    this.#path = tiles ? smoothPath(this.#nav, self, tiles, destination, self.radius) : [];
    this.#progress = { x: self.x, y: self.y, tick };
  }

  /** Movement toward the next waypoint; gives up a destination it cannot get closer to. */
  #steer(self: ActorState, tick: number): { x: number; y: number } {
    while (this.#path.length > 0) {
      const next = this.#path[0]!;
      if (Math.hypot(next.x - self.x, next.y - self.y) > ARRIVED) break;
      this.#path.shift();
    }
    const next = this.#path[0];
    if (!next) {
      this.#destination = undefined;
      return { x: 0, y: 0 };
    }
    if (Math.hypot(self.x - this.#progress.x, self.y - this.#progress.y) > TILE_SIZE / 2) {
      this.#progress = { x: self.x, y: self.y, tick };
    } else if (tick - this.#progress.tick > STUCK_TICKS) {
      this.#path = [];
      this.#destination = undefined;
      return { x: 0, y: 0 };
    }
    const dx = next.x - self.x;
    const dy = next.y - self.y;
    const length = Math.hypot(dx, dy);
    return { x: dx / length, y: dy / length };
  }

  /** Turns the aim toward an angle, no faster than the difficulty allows. */
  #turnToward(angle: number): void {
    const current = this.#aim ?? angle;
    const delta = normalizeAngle(angle - current);
    const step = Math.max(-this.#difficulty.turnRate, Math.min(this.#difficulty.turnRate, delta));
    this.#aim = normalizeAngle(current + step);
  }
}
