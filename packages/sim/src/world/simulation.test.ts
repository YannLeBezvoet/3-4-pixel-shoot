import { describe, expect, it } from 'vitest';
import { createRng } from '@pixel-shoot/shared';
import type { InputCommand } from '../core/input';
import { Button } from '../core/input';
import { BLOCKS_MOVEMENT } from '../map/map-data';
import { circleBlocked } from '../physics/move-circle';
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
      vx: 0,
      vy: 0,
      aim: 1,
      radius: 10,
      hp: 100,
      maxHp: 100,
      alive: true,
      weapon: 'rifle',
      rounds: 20,
      spareMagazines: null,
      reloadLeft: 0,
      throwable: 'frag',
      throwables: 2,
      burning: false,
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
    sim.step(
      new Map([
        [a, { move: { x: 0, y: 0 }, aim: 3 * Math.PI, aimDistance: 0, buttons: Button.fire }],
      ]),
    );
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
              aimDistance: 0,
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

  it('lets frozen actors aim but neither move nor fire', () => {
    const sim = create();
    const a = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 72 });
    sim.frozen = true;
    const events = sim.step(
      new Map([[a, { move: { x: 1, y: 0 }, aim: 2, aimDistance: 0, buttons: Button.fire }]]),
    );
    expect(events.filter((e) => e.type === 'shotFired')).toEqual([]);
    expect(sim.actor(a)).toMatchObject({ x: 72, aim: 2 });
    sim.frozen = false;
    sim.step(new Map([[a, { move: { x: 1, y: 0 }, aim: 2, aimDistance: 0, buttons: 0 }]]));
    expect(sim.actor(a)!.x).toBeGreaterThan(72);
  });

  it('clears every actor and projectile', () => {
    const sim = create();
    const a = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 72 });
    sim.step(
      new Map([[a, { move: { x: 0, y: 0 }, aim: 0, aimDistance: 0, buttons: Button.fire }]]),
    );
    expect(sim.projectiles()).toHaveLength(1);
    sim.clear();
    expect(sim.actors()).toEqual([]);
    expect(sim.projectiles()).toEqual([]);
    expect(sim.step()).toEqual([{ type: 'actorRemoved', entity: a }]);
  });

  it('finds free spawn spots, avoiding living actors', () => {
    const arena = asciiMap(`
      ######
      #11#2#
      #1o..#
      ######
    `);
    const sim = createSimulation({ map: arena, catalog, seed: 1 });
    expect(sim.freeSpawnSpots(1, 10)).toEqual([
      { x: 72, y: 72 },
      { x: 120, y: 72 },
      { x: 72, y: 120 },
    ]);
    sim.spawnActor({ team: 1, character: 'rifleman', x: 75, y: 72 });
    expect(sim.freeSpawnSpots(1, 10)).toEqual([
      { x: 120, y: 72 },
      { x: 72, y: 120 },
    ]);
    expect(sim.freeSpawnSpots(3, 10)).toEqual([]);
  });

  it('swaps the map in place and moves actors out of new obstacles', () => {
    const before = asciiMap(`
      ######
      #1...#
      #....#
      ######
    `);
    const after = asciiMap(`
      ######
      ##...#
      #....#
      ######
    `);
    const sim = createSimulation({ map: before, catalog, seed: 1 });
    const id = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 72 });
    sim.replaceMap(after);
    expect(sim.map).toBe(after);
    expect(sim.grid.flagsAt(1, 1)).toBe(1);
    const moved = sim.actor(id)!;
    expect(circleBlocked(sim.grid, moved.x, moved.y, moved.radius, BLOCKS_MOVEMENT)).toBe(false);
    expect(Math.hypot(moved.x - 72, moved.y - 72)).toBeLessThanOrEqual(48);
  });
});
