import { describe, expect, it } from 'vitest';
import { createRng } from '@pixel-shoot/shared';
import type { SimEvent } from '../core/events';
import type { InputCommand } from '../core/input';
import { Button, NEUTRAL_INPUT } from '../core/input';
import { asciiMap } from '../testing/ascii-map';
import type { TestCatalogOptions } from '../testing/test-catalog';
import { testCatalog } from '../testing/test-catalog';
import type { Simulation } from '../world/simulation';
import { createSimulation } from '../world/simulation';

const room = asciiMap(`
  ##################
  #................#
  #................#
  #................#
  ##################
`);
const fireAt = (angle: number): InputCommand => ({
  ...NEUTRAL_INPUT,
  aim: angle,
  buttons: Button.fire,
});

function duel(options: TestCatalogOptions = {}) {
  const sim = createSimulation({ map: room, catalog: testCatalog(options), seed: 'duel' });
  const shooter = sim.spawnActor({ team: 1, character: 'rifleman', x: 96, y: 120 });
  const target = sim.spawnActor({ team: 2, character: 'rifleman', x: 400, y: 120 });
  return { sim, shooter, target };
}

function run(sim: Simulation, inputs: ReadonlyMap<number, InputCommand>, ticks: number) {
  const events: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) events.push(...sim.step(inputs));
  return events;
}

describe('damage and death', () => {
  it('removes the weapon damage from hit points at each hit (Q15)', () => {
    const { sim, shooter, target } = duel({ weapon: { fireMode: 'semi' } });
    const events = run(sim, new Map([[shooter, fireAt(0)]]), 30);
    expect(events.filter((e) => e.type === 'damaged')).toEqual([
      { type: 'damaged', target, attacker: shooter, weapon: 'rifle', amount: 28, hp: 72 },
    ]);
    expect(sim.actor(target)?.hp).toBe(72);
  });

  it('kills at 0 hit points: 4 rifle hits of 28 (C1.4)', () => {
    const { sim, shooter, target } = duel();
    const events = run(sim, new Map([[shooter, fireAt(0)]]), 60);
    const damaged = events.filter((e) => e.type === 'damaged').map((e) => e.hp);
    expect(damaged).toEqual([72, 44, 16, 0]);
    const killed = events.filter((e) => e.type === 'killed');
    expect(killed).toEqual([
      { type: 'killed', victim: target, killer: shooter, weapon: 'rifle', x: 400, y: 120 },
    ]);
    expect(sim.actor(target)).toMatchObject({ alive: false, hp: 0 });
  });

  it('leaves a corpse that ignores input, cannot be hit and blocks nothing (Q28)', () => {
    const { sim, shooter, target } = duel({ weapon: { damage: 100 } });
    run(sim, new Map([[shooter, fireAt(0)]]), 15);
    expect(sim.actor(target)?.alive).toBe(false);
    // The corpse neither moves nor fires.
    const events = run(
      sim,
      new Map([[target, { move: { x: -1, y: 0 }, aim: Math.PI, buttons: Button.fire }]]),
      30,
    );
    expect(events.filter((e) => e.type === 'shotFired' && e.shooter === target)).toEqual([]);
    expect(sim.actor(target)).toMatchObject({ x: 400, y: 120 });
    // Bullets fly over it and characters walk through it.
    const shots = run(sim, new Map([[shooter, fireAt(0)]]), 30);
    expect(shots.filter((e) => e.type === 'hit')).toEqual([]);
    const walker = sim.spawnActor({ team: 1, character: 'rifleman', x: 350, y: 120 });
    run(sim, new Map([[walker, { ...NEUTRAL_INPUT, move: { x: 1, y: 0 } }]]), 40);
    expect(sim.actor(walker)!.x).toBeGreaterThan(450);
  });

  it('hurts teammates only with friendly fire', () => {
    const sim = createSimulation({
      map: room,
      catalog: testCatalog(),
      seed: 'ff',
      rules: { friendlyFire: true },
    });
    const shooter = sim.spawnActor({ team: 1, character: 'rifleman', x: 96, y: 120 });
    const mate = sim.spawnActor({ team: 1, character: 'rifleman', x: 300, y: 120 });
    run(sim, new Map([[shooter, fireAt(0)]]), 60);
    expect(sim.actor(mate)?.alive).toBe(false);
  });

  it('applies hits on an already dead character only once', () => {
    const { sim, shooter, target } = duel({ weapon: { damage: 100 } });
    const other = sim.spawnActor({ team: 1, character: 'rifleman', x: 96, y: 72 });
    const events = run(
      sim,
      new Map([
        [shooter, fireAt(0)],
        [other, fireAt(Math.atan2(48, 304))],
      ]),
      20,
    );
    expect(events.filter((e) => e.type === 'killed' && e.victim === target)).toHaveLength(1);
  });
});

describe('determinism (C1.5)', () => {
  const map = asciiMap(`
    ####################
    #1.......#.........#
    #..##....#....o....#
    #..##.........##...#
    #.......o.....##..2#
    ####################
  `);

  function play(seed: string, inputSeed: string, ticks: number) {
    const sim = createSimulation({
      map,
      catalog: testCatalog({ weapon: { spreadDeg: 4, magazine: 10, reloadMs: 600 } }),
      seed,
    });
    const ids = Array.from({ length: 8 }, (_, i) =>
      sim.spawnActor({
        team: (i % 2) + 1,
        character: 'rifleman',
        x: i % 2 ? 840 - (i >> 1) * 24 : 72 + (i >> 1) * 24,
        y: i % 2 ? 216 : 72,
      }),
    );
    const rng = createRng(inputSeed);
    let kills = 0;
    let shots = 0;
    const current = new Map<number, InputCommand>();
    for (let tick = 0; tick < ticks; tick++) {
      for (const id of ids)
        if (!current.has(id) || rng.chance(0.05))
          current.set(id, {
            move: { x: rng.range(-1, 1), y: rng.range(-1, 1) },
            aim: rng.range(-Math.PI, Math.PI),
            buttons: rng.chance(0.6) ? Button.fire : rng.chance(0.1) ? Button.reload : 0,
          });
      for (const event of sim.step(current)) {
        if (event.type === 'killed') kills++;
        if (event.type === 'shotFired') shots++;
      }
    }
    return { hash: sim.hash(), kills, shots };
  }

  it('gives the same state hash after 10,000 ticks for the same seed and inputs', () => {
    const first = play('match', 'inputs', 10_000);
    expect(play('match', 'inputs', 10_000)).toEqual(first);
    // Meaningful only if the run had fights.
    expect(first.shots).toBeGreaterThan(1000);
    expect(first.kills).toBeGreaterThan(0);
  });

  it('changes with the seed (spread) and with the inputs', () => {
    const base = play('match', 'inputs', 2000).hash;
    expect(play('other seed', 'inputs', 2000).hash).not.toBe(base);
    expect(play('match', 'other inputs', 2000).hash).not.toBe(base);
  });
});
