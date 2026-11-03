import { describe, expect, it } from 'vitest';
import { createRng } from '@pixel-shoot/shared';
import type { InputCommand } from '../core/input';
import { Button } from '../core/input';
import { asciiMap } from '../testing/ascii-map';
import { testCatalog } from '../testing/test-catalog';
import { createSimulation } from './simulation';

const catalog = testCatalog();
const map = asciiMap(`
  #####
  #1.2#
  #####
`);
const create = (seed: number | string = 1) => createSimulation({ map, catalog, seed });

describe('createSimulation', () => {
  it('starts at tick 0 with the default rules', () => {
    const sim = create();
    expect(sim.tick).toBe(0);
    expect(sim.rules).toEqual({ friendlyFire: false });
    expect(sim.map).toBe(map);
    expect(sim.grid.width).toBe(5);
    expect(
      createSimulation({ map, catalog, seed: 1, rules: { friendlyFire: true } }).rules,
    ).toEqual({ friendlyFire: true });
  });

  it('spawns actors with their character stats and reports it in the next step', () => {
    const sim = create();
    const id = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 80, aim: 1 });
    expect(sim.actor(id)).toEqual({
      id,
      team: 1,
      character: 'rifleman',
      x: 72,
      y: 80,
      aim: 1,
      radius: 10,
      hp: 100,
      maxHp: 100,
      alive: true,
      weapon: 'rifle',
      rounds: 20,
      spareMagazines: null,
      reloadLeft: 0,
    });
    expect(sim.step()).toEqual([
      { type: 'actorSpawned', entity: id, team: 1, character: 'rifleman' },
    ]);
    expect(sim.step()).toEqual([]);
    expect(sim.tick).toBe(2);
  });

  it('refuses unknown characters and invalid teams', () => {
    const sim = create();
    expect(() => sim.spawnActor({ team: 1, character: 'tank', x: 0, y: 0 })).toThrow(
      'Unknown character "tank".',
    );
    expect(() => sim.spawnActor({ team: 0, character: 'rifleman', x: 0, y: 0 })).toThrow(
      'Teams are numbered from 1; got 0.',
    );
  });

  it('removes actors', () => {
    const sim = create();
    const a = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 72 });
    const b = sim.spawnActor({ team: 2, character: 'rifleman', x: 168, y: 72 });
    sim.step();
    sim.removeActor(a);
    sim.removeActor(a);
    expect(sim.actor(a)).toBeUndefined();
    expect(sim.actors().map((actor) => actor.id)).toEqual([b]);
    expect(sim.step()).toEqual([{ type: 'actorRemoved', entity: a }]);
  });

  it('applies sanitized inputs; actors without input keep their aim', () => {
    const sim = create();
    const a = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 72 });
    const b = sim.spawnActor({ team: 2, character: 'rifleman', x: 168, y: 72, aim: 2 });
    sim.step(new Map([[a, { move: { x: 0, y: 0 }, aim: 3 * Math.PI, buttons: Button.fire }]]));
    expect(sim.actor(a)?.aim).toBeCloseTo(Math.PI, 12);
    expect(sim.actor(b)?.aim).toBe(2);
    sim.step();
    expect(sim.actor(a)?.aim).toBeCloseTo(Math.PI, 12);
  });

  it('is deterministic: same seed and inputs give the same hash', () => {
    const run = (seed: number, inputSeed: number) => {
      const sim = create(seed);
      const ids = [
        sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 72 }),
        sim.spawnActor({ team: 2, character: 'rifleman', x: 168, y: 72 }),
      ];
      const rng = createRng(inputSeed);
      for (let tick = 0; tick < 600; tick++) {
        const inputs = new Map<number, InputCommand>(
          ids.map((id) => [
            id,
            {
              move: { x: rng.range(-1, 1), y: rng.range(-1, 1) },
              aim: rng.range(-Math.PI, Math.PI),
              buttons: rng.int(0, 3),
            },
          ]),
        );
        sim.step(inputs);
      }
      return sim.hash();
    };
    expect(run(1, 7)).toBe(run(1, 7));
    expect(run(1, 7)).not.toBe(run(1, 8));
  });
});
