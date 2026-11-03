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
          [enemy, { move: { x: 0, y: 0 }, aim: 0, buttons: 1 }],
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
      map,
      grid: sim.grid,
      nav: new NavGrid(sim.grid),
      thinkOffset: 0,
    });
    const self = { ...sim.actor(bot)!, alive: false };
    expect(brain.update({ self, actors: [self], events: [], tick: 0 })).toEqual({
      move: { x: 0, y: 0 },
      aim: 0,
      buttons: 0,
    });
  });
});
