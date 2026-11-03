// What a bot knows (decision 0011): what it could see, limited to a screen-sized rectangle
// around it (what a player sees, ARCHITECTURE §11) and to line of sight, plus gunfire it
// heard, remembered for a while. This module is the only bot code that reads every actor;
// the decisions only receive what it lets through.
import type { ActorState, CollisionGrid, EntityId, SimEvent } from '@pixel-shoot/sim';
import { TICK_RATE, lineOfSight } from '@pixel-shoot/sim';

/** Half the screen: a bot sees as far as a player whose character is centered. */
export const VIEW_HALF_WIDTH = 480;
export const VIEW_HALF_HEIGHT = 270;
/** Distance at which gunfire is heard, in world pixels. */
export const HEARING_RADIUS = 900;
/** How long an enemy's last known position is kept, in ticks. */
export const MEMORY_TICKS = 8 * TICK_RATE;

export interface Sighting {
  readonly id: EntityId;
  readonly x: number;
  readonly y: number;
  readonly distance: number;
}

export interface Clue {
  readonly x: number;
  readonly y: number;
  /** Tick at which the enemy was seen or heard there. */
  readonly tick: number;
}

/** Whether `self` can see the point (inside its view and in line of sight). */
export function canSee(self: ActorState, x: number, y: number, grid: CollisionGrid): boolean {
  return (
    Math.abs(x - self.x) <= VIEW_HALF_WIDTH &&
    Math.abs(y - self.y) <= VIEW_HALF_HEIGHT &&
    lineOfSight(grid, self.x, self.y, x, y)
  );
}

/** Living enemies `self` can see, nearest first. */
export function visibleEnemies(
  self: ActorState,
  actors: readonly ActorState[],
  grid: CollisionGrid,
): Sighting[] {
  return actors
    .filter((a) => a.alive && a.team !== self.team && canSee(self, a.x, a.y, grid))
    .map((a) => ({ id: a.id, x: a.x, y: a.y, distance: Math.hypot(a.x - self.x, a.y - self.y) }))
    .sort((a, b) => a.distance - b.distance || a.id - b.id);
}

/** A bot's memory of where enemies were last seen or heard. */
export class Memory {
  #clue: Clue | undefined;

  get clue(): Clue | undefined {
    return this.#clue;
  }

  /** Remembers the nearest visible enemy, or enemy gunfire heard this tick. */
  update(
    self: ActorState,
    seen: readonly Sighting[],
    events: readonly SimEvent[],
    actors: readonly ActorState[],
    tick: number,
  ): void {
    const nearest = seen[0];
    if (nearest) {
      this.#clue = { x: nearest.x, y: nearest.y, tick };
    } else {
      for (const event of events) {
        if (event.type !== 'shotFired') continue;
        const shooter = actors.find((a) => a.id === event.shooter);
        if (!shooter || shooter.team === self.team) continue;
        if (Math.hypot(shooter.x - self.x, shooter.y - self.y) > HEARING_RADIUS) continue;
        this.#clue = { x: shooter.x, y: shooter.y, tick };
      }
    }
    if (this.#clue && tick - this.#clue.tick > MEMORY_TICKS) this.#clue = undefined;
  }

  /** Forgets a clue once the place has been checked. */
  forget(): void {
    this.#clue = undefined;
  }
}
