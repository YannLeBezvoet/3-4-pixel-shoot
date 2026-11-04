import type { ActorState, SimEvent } from '@pixel-shoot/sim';
import { asciiMap, buildCollisionGrid } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import {
  BLAST_HEARING_RADIUS,
  HEARING_RADIUS,
  MEMORY_TICKS,
  Memory,
  canSee,
  visibleEnemies,
} from './perception';

const grid = buildCollisionGrid(
  asciiMap(`
    ......................
    ..........#...........
    ..........#...........
    ..........#...........
    ......................
  `),
);

function actor(id: number, team: number, x: number, y: number, alive = true): ActorState {
  return {
    id,
    team,
    x,
    y,
    alive,
    character: 'rifleman',
    vx: 0,
    vy: 0,
    aim: 0,
    radius: 10,
    hp: alive ? 100 : 0,
    maxHp: 100,
    weapon: 'rifle',
    rounds: 20,
    spareMagazines: null,
    reloadLeft: 0,
    fuel: undefined,
    throwable: undefined,
    throwables: 0,
    burning: false,
  };
}

describe('perception', () => {
  const self = actor(1, 1, 72, 120);

  it('sees enemies in the open, nearest first, but not through walls', () => {
    const near = actor(2, 2, 200, 120);
    const far = actor(3, 2, 300, 30);
    const hidden = actor(4, 2, 600, 120);
    const seen = visibleEnemies(self, [self, far, hidden, near], grid);
    expect(seen.map((s) => s.id)).toEqual([2, 3]);
    expect(seen[0]?.distance).toBeCloseTo(128, 9);
  });

  it('sees no further than a screen, and ignores teammates and the dead', () => {
    expect(canSee(self, 72 + 480, 230, grid)).toBe(true);
    expect(canSee(self, 72 + 481, 230, grid)).toBe(false);
    expect(canSee(self, 72, 120 + 271, grid)).toBe(false);
    const seen = visibleEnemies(self, [actor(5, 1, 150, 120), actor(6, 2, 160, 120, false)], grid);
    expect(seen).toEqual([]);
  });

  it('hears explosions from far away, but not its own', () => {
    const blast = (owner: number, x: number): SimEvent => ({
      type: 'exploded',
      x,
      y: 120,
      radius: 144,
      owner,
      weapon: 'frag',
      kind: undefined,
    });
    const memory = new Memory();
    memory.update(self, [], [blast(self.id, 1000)], [self], 10);
    expect(memory.clue).toBeUndefined();
    memory.update(self, [], [blast(2, 72 + BLAST_HEARING_RADIUS + 1)], [self], 11);
    expect(memory.clue).toBeUndefined();
    memory.update(self, [], [blast(2, 1000)], [self], 12);
    expect(memory.clue).toEqual({ x: 1000, y: 120, tick: 12 });
  });

  it('remembers the last enemy seen or heard, and forgets it after a while', () => {
    const memory = new Memory();
    const enemy = actor(2, 2, 600, 120);
    const shot: SimEvent = {
      type: 'shotFired',
      shooter: 2,
      weapon: 'rifle',
      x: 590,
      y: 120,
      z: 20,
      angle: Math.PI,
      projectile: 9,
    };
    memory.update(self, [], [shot], [self, enemy], 10);
    expect(memory.clue).toEqual({ x: 600, y: 120, tick: 10 });
    // A teammate's shot or a shot too far away is not a clue.
    const other = new Memory();
    const mate = actor(7, 1, 300, 120);
    const distant = actor(8, 2, 72 + HEARING_RADIUS + 50, 120);
    other.update(
      self,
      [],
      [
        { ...shot, shooter: 7 },
        { ...shot, shooter: 8 },
      ],
      [self, mate, distant],
      10,
    );
    expect(other.clue).toBeUndefined();
    // Seeing someone replaces the clue; time erases it.
    memory.update(self, [{ id: 3, x: 200, y: 100, distance: 130 }], [], [], 20);
    expect(memory.clue).toEqual({ x: 200, y: 100, tick: 20 });
    memory.update(self, [], [], [], 20 + MEMORY_TICKS + 1);
    expect(memory.clue).toBeUndefined();
  });
});
