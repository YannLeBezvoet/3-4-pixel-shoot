import { createRng } from '@pixel-shoot/shared';
import type { InputCommand, MapData, SimEvent } from '@pixel-shoot/sim';
import { TICK_RATE, asciiMap, createSimulation, lineOfSight, testCatalog } from '@pixel-shoot/sim';
import { describe, expect, it } from 'vitest';
import { BotBrain } from './brain';
import { DIFFICULTIES } from './difficulty';
import { NavGrid } from './navigation';

/** A bot (team 1) against a motionless enemy (team 2), for `seconds`. */
function duel(
  map: MapData,
  botAt: { x: number; y: number },
  enemyAt: { x: number; y: number },
  seconds: number,
) {
  const sim = createSimulation({ map, catalog: testCatalog(), seed: 'duel' });
  const bot = sim.spawnActor({ team: 1, character: 'rifleman', ...botAt });
  const enemy = sim.spawnActor({ team: 2, character: 'rifleman', ...enemyAt });
  const brain = new BotBrain({
    difficulty: DIFFICULTIES.normal,
    random: createRng('bot'),
    catalog: testCatalog(),
    map,
    grid: sim.grid,
    nav: new NavGrid(sim.grid),
    thinkOffset: 0,
  });
  const shots: { tick: number; seesEnemy: boolean }[] = [];
  let events: readonly SimEvent[] = [];
  let killedAt: number | undefined;
  for (let i = 0; i < seconds * TICK_RATE && killedAt === undefined; i++) {
    const actors = sim.actors();
    const self = actors.find((a) => a.id === bot)!;
    const input: InputCommand = brain.update({ self, actors, events, tick: sim.tick });
    events = sim.step(new Map([[bot, input]]));
    for (const event of events) {
      if (event.type === 'shotFired') {
        const shooter = sim.actor(bot)!;
        const target = sim.actor(enemy)!;
        shots.push({
          tick: sim.tick,
          seesEnemy: lineOfSight(sim.grid, shooter.x, shooter.y, target.x, target.y),
        });
      }
      if (event.type === 'killed') killedAt = sim.tick;
    }
  }
  return { sim, brain, shots, killedAt };
}

describe('BotBrain', () => {
  it('engages and kills a visible enemy', () => {
    const map = asciiMap(`
      ################
      #..............#
      #..............#
      #..............#
      ################
    `);
    const { killedAt, shots } = duel(map, { x: 72, y: 120 }, { x: 600, y: 120 }, 10);
    expect(killedAt).toBeDefined();
    // It waits for its reaction time before the first shot.
    expect(shots[0]!.tick).toBeGreaterThanOrEqual(DIFFICULTIES.normal.reactionTicks);
  });

  it('never fires at an enemy it cannot see, then finds it', () => {
    const map = asciiMap(`
      ####################
      #1........#.......2#
      #.........#........#
      #.........#........#
      #..................#
      ####################
    `);
    const { killedAt, shots } = duel(map, { x: 72, y: 72 }, { x: 870, y: 72 }, 40);
    expect(shots.length).toBeGreaterThan(0);
    expect(shots.every((s) => s.seesEnemy)).toBe(true);
    // It wanders toward the enemy's spawn area, around the wall, and wins.
    expect(killedAt).toBeDefined();
  });

  it('chases gunfire it hears', () => {
    const map = asciiMap(`
      ##########################
      #........................#
      #.#####################..#
      #........................#
      ##########################
    `);
    const sim = createSimulation({ map, catalog: testCatalog(), seed: 'hear' });
    const bot = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 72 });
    const enemy = sim.spawnActor({ team: 2, character: 'rifleman', x: 600, y: 168, aim: 0 });
    const brain = new BotBrain({
      difficulty: DIFFICULTIES.normal,
      random: createRng('hear'),
      catalog: testCatalog(),
      map,
      grid: sim.grid,
      nav: new NavGrid(sim.grid),
      thinkOffset: 0,
    });
    let events: readonly SimEvent[] = [];
    const actions = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const actors = sim.actors();
      const input = brain.update({
        self: actors.find((a) => a.id === bot)!,
        actors,
        events,
        tick: sim.tick,
      });
      events = sim.step(
        new Map([
          [bot, input],
          [enemy, { move: { x: 0, y: 0 }, aim: 0, aimDistance: 0, buttons: 1 }],
        ]),
      );
      actions.add(brain.action);
    }
    expect(actions.has('chase')).toBe(true);
  });

  it('stands still when dead', () => {
    const map = asciiMap('#1..2#');
    const sim = createSimulation({ map, catalog: testCatalog(), seed: 'dead' });
    const bot = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 24 });
    const brain = new BotBrain({
      difficulty: DIFFICULTIES.easy,
      random: createRng('dead'),
      catalog: testCatalog(),
      map,
      grid: sim.grid,
      nav: new NavGrid(sim.grid),
      thinkOffset: 0,
    });
    const self = { ...sim.actor(bot)!, alive: false };
    expect(brain.update({ self, actors: [self], events: [], tick: 0 })).toEqual({
      move: { x: 0, y: 0 },
      aim: 0,
      aimDistance: 0,
      buttons: 0,
    });
  });

  describe('with a flamethrower (Q67)', () => {
    function flamer(enemyX: number) {
      const map = asciiMap(`
        ####################
        #..................#
        #..................#
        #..................#
        ####################
      `);
      const catalog = testCatalog({ character: { hitPoints: 100000 } });
      const sim = createSimulation({ map, catalog, seed: 'flamer' });
      const bot = sim.spawnActor({ team: 1, character: 'trooper', x: 72, y: 120 });
      const enemy = sim.spawnActor({ team: 2, character: 'rifleman', x: enemyX, y: 120 });
      const brain = new BotBrain({
        difficulty: DIFFICULTIES.normal,
        random: createRng('flamer'),
        catalog,
        map,
        grid: sim.grid,
        nav: new NavGrid(sim.grid),
        thinkOffset: 0,
      });
      const distances: number[] = [];
      let events: readonly SimEvent[] = [];
      for (let i = 0; i < 6 * TICK_RATE; i++) {
        const actors = sim.actors();
        const self = actors.find((a) => a.id === bot)!;
        const input = brain.update({ self, actors, events, tick: sim.tick });
        events = sim.step(new Map([[bot, input]]));
        if (events.some((e) => e.type === 'shotFired'))
          distances.push(Math.abs(sim.actor(enemy)!.x - sim.actor(bot)!.x));
      }
      return { distances, sim, enemy };
    }

    it('closes in and fires only within reach', () => {
      const { distances, sim, enemy } = flamer(420);
      expect(distances.length).toBeGreaterThan(0);
      // The test flamethrower reaches 192 pixels from a 24-pixel barrel.
      expect(Math.max(...distances)).toBeLessThanOrEqual(216);
      expect(sim.actor(enemy)?.hp).toBeLessThan(100000);
    });
  });

  describe('with grenades (Q67)', () => {
    const BEHIND_SANDBAGS = asciiMap(`
      ####################
      #..................#
      #.........s........#
      #.........s........#
      #.........s........#
      #..................#
      ####################
    `);

    function throwing(map: MapData, friendAt?: { x: number; y: number }, enemyX = 576) {
      const catalog = testCatalog({ character: { hitPoints: 100000 } });
      const sim = createSimulation({ map, catalog, seed: 'throw' });
      const bot = sim.spawnActor({ team: 1, character: 'rifleman', x: 300, y: 168 });
      sim.spawnActor({ team: 2, character: 'rifleman', x: enemyX, y: 168 });
      if (friendAt) sim.spawnActor({ team: 1, character: 'rifleman', ...friendAt });
      const brain = new BotBrain({
        difficulty: DIFFICULTIES.normal,
        random: createRng('throw'),
        catalog,
        map,
        grid: sim.grid,
        nav: new NavGrid(sim.grid),
        thinkOffset: 0,
      });
      const throws: number[] = [];
      let events: readonly SimEvent[] = [];
      for (let i = 0; i < 10 * TICK_RATE; i++) {
        const actors = sim.actors();
        const self = actors.find((a) => a.id === bot)!;
        const input = brain.update({ self, actors, events, tick: sim.tick });
        events = sim.step(new Map([[bot, input]]));
        if (events.some((e) => e.type === 'thrown')) throws.push(sim.tick);
      }
      return throws;
    }

    it('throws at an enemy behind cover, a few seconds apart', () => {
      const throws = throwing(BEHIND_SANDBAGS);
      expect(throws).toHaveLength(2);
      expect(throws[1]! - throws[0]!).toBeGreaterThanOrEqual(6 * TICK_RATE);
    });

    it('keeps its grenades for an enemy in the open', () => {
      const open = asciiMap(`
        ####################
        #..................#
        #..................#
        #..................#
        #..................#
        #..................#
        ####################
      `);
      expect(throwing(open)).toEqual([]);
    });

    it('never throws where a teammate stands', () => {
      expect(throwing(BEHIND_SANDBAGS, { x: 520, y: 168 })).toEqual([]);
    });

    it('never throws close enough to be caught in the blast', () => {
      const close = asciiMap(`
        ####################
        #..................#
        #..................#
        #......s...........#
        #..................#
        #..................#
        ####################
      `);
      expect(throwing(close, undefined, 400)).toEqual([]);
    });
  });
});
