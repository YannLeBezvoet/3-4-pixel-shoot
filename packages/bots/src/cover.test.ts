import { createRng } from '@pixel-shoot/shared';
import type { InputCommand, MapData, SimEvent } from '@pixel-shoot/sim';
import {
  Button,
  NEUTRAL_INPUT,
  TICK_RATE,
  asciiMap,
  buildCollisionGrid,
  createSimulation,
  testCatalog,
} from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { BotBrain } from './brain';
import { findCover, shielded } from './cover';
import { DIFFICULTIES } from './difficulty';
import { NavGrid } from './navigation';

const tile = (x: number, y: number) => ({ x: x * 48 + 24, y: y * 48 + 24 });

describe('findCover', () => {
  const map = asciiMap(`
    ###############
    #.............#
    #.....#.......#
    #.....#.......#
    #.............#
    #.....sss.....#
    #.............#
    ###############
  `);
  const grid = buildCollisionGrid(map);
  const nav = new NavGrid(grid);

  it('says what stops a bullet: solid obstacles and cover', () => {
    expect(shielded(grid, tile(3, 2), tile(9, 2))).toBe(true);
    expect(shielded(grid, tile(7, 4), tile(7, 6))).toBe(true);
    expect(shielded(grid, tile(1, 1), tile(13, 1))).toBe(false);
  });

  it('finds the nearest spot the attacker cannot reach, walking around obstacles', () => {
    const spot = findCover(nav, grid, tile(5, 2), tile(1, 2));
    expect(spot).toBeDefined();
    expect(shielded(grid, tile(1, 2), spot!)).toBe(true);
    expect(Math.hypot(spot!.x - tile(5, 2).x, spot!.y - tile(5, 2).y)).toBeLessThan(5 * 48);
  });

  it('finds nothing in the open', () => {
    const open = buildCollisionGrid(
      asciiMap(`
        #########
        #.......#
        #.......#
        #########
      `),
    );
    expect(findCover(new NavGrid(open), open, tile(4, 1), tile(1, 1))).toBeUndefined();
  });
});

/** Seconds a bot under fire takes to reach a shielded spot, or undefined if it never does. */
function runUnderFire(map: MapData, seed: string, limitSeconds = 3): number | undefined {
  const catalog = testCatalog({ character: { hitPoints: 100000 } });
  const sim = createSimulation({ map, catalog, seed });
  // Both on the top row, in the open: the attacker has a clear shot.
  const bot = sim.spawnActor({ team: 1, character: 'rifleman', ...tile(8, 1) });
  const attacker = sim.spawnActor({ team: 2, character: 'rifleman', ...tile(1, 1) });
  const rng = createRng(seed);
  const brain = new BotBrain({
    difficulty: DIFFICULTIES.normal,
    random: rng,
    catalog,
    map,
    grid: sim.grid,
    nav: new NavGrid(sim.grid),
    thinkOffset: rng.int(0, 5),
  });
  let events: readonly SimEvent[] = [];
  let hit = false;
  let start = 0;
  for (let i = 0; i < 12 * TICK_RATE; i++) {
    const actors = sim.actors();
    const self = actors.find((a) => a.id === bot)!;
    const enemy = actors.find((a) => a.id === attacker)!;
    if (!hit && events.some((e) => e.type === 'damaged' && e.target === bot)) {
      hit = true;
      start = sim.tick;
    }
    if (hit && shielded(sim.grid, enemy, self)) return (sim.tick - start) / TICK_RATE;
    if (hit && sim.tick - start > limitSeconds * TICK_RATE) return undefined;
    const aim = Math.atan2(self.y - enemy.y, self.x - enemy.x);
    const fire: InputCommand = { ...NEUTRAL_INPUT, aim, buttons: Button.fire };
    const input = brain.update({ self, actors, events, tick: sim.tick });
    events = sim.step(
      new Map([
        [attacker, fire],
        [bot, input],
      ]),
    );
  }
  return undefined;
}

describe('taking cover (C2.5)', () => {
  const SANDBAGS = asciiMap(`
    ################
    #..............#
    #..........s...#
    #..........s...#
    #..........s...#
    #..............#
    ################
  `);
  const WALL = asciiMap(`
    ################
    #..............#
    #.....#........#
    #.....#........#
    #.....#........#
    #..............#
    ################
  `);

  for (const [name, map] of [
    ['cover', SANDBAGS],
    ['a solid obstacle', WALL],
  ] as const)
    it(`a bot under fire reaches ${name} within 3 seconds in at least 90 % of runs`, () => {
      const runs = Array.from({ length: 30 }, (_, i) => runUnderFire(map, `cover-${i}`));
      const safe = runs.filter((seconds) => seconds !== undefined);
      expect(safe.length / runs.length).toBeGreaterThanOrEqual(0.9);
    });

  it('holds its ground behind cover and fights back', () => {
    const map = asciiMap(`
      ################
      #..............#
      #..............#
      #.....s........#
      #..............#
      #..............#
      ################
    `);
    const catalog = testCatalog({ character: { hitPoints: 100000 } });
    const sim = createSimulation({ map, catalog, seed: 'hold' });
    const bot = sim.spawnActor({ team: 1, character: 'rifleman', ...tile(7, 3) });
    const attacker = sim.spawnActor({ team: 2, character: 'rifleman', ...tile(1, 3) });
    const brain = new BotBrain({
      difficulty: DIFFICULTIES.normal,
      random: createRng('hold'),
      catalog,
      map,
      grid: sim.grid,
      nav: new NavGrid(sim.grid),
      thinkOffset: 0,
    });
    let shots = 0;
    let events: readonly SimEvent[] = [
      {
        type: 'damaged',
        target: bot,
        attacker,
        weapon: 'rifle',
        source: 'bullet',
        amount: 1,
        hp: 99999,
      },
    ];
    for (let i = 0; i < 2 * TICK_RATE; i++) {
      const actors = sim.actors();
      const self = actors.find((a) => a.id === bot)!;
      const input = brain.update({ self, actors, events, tick: sim.tick });
      events = sim.step(new Map([[bot, input]]));
      shots += events.filter((e) => e.type === 'shotFired').length;
    }
    expect(shots).toBeGreaterThan(0);
    expect(sim.actor(bot)?.x).toBeCloseTo(tile(7, 3).x, -1);
  });
});
