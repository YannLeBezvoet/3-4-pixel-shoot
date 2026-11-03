import { describe, expect, it } from 'vitest';
import { createRng } from '@pixel-shoot/shared';
import type { InputCommand } from '../core/input';
import { NEUTRAL_INPUT } from '../core/input';
import { BLOCKS_MOVEMENT } from '../map/map-data';
import { circleBlocked } from '../physics/move-circle';
import { asciiMap } from '../testing/ascii-map';
import { createCatalog } from '../world/catalog';
import { createSimulation } from '../world/simulation';

const catalog = createCatalog({
  characters: [{ id: 'rifleman', speed: 180, radius: 10, hitPoints: 100 }],
});
const open = asciiMap(`
  ##########
  #........#
  #........#
  #........#
  ##########
`);
const move = (x: number, y: number): InputCommand => ({ ...NEUTRAL_INPUT, move: { x, y } });

describe('movement', () => {
  it('reaches full speed in about 0.08 s and stops as fast (Q19)', () => {
    const sim = createSimulation({ map: open, catalog, seed: 1 });
    const id = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 120 });
    const xs: number[] = [];
    for (let i = 0; i < 8; i++) {
      sim.step(new Map([[id, move(1, 0)]]));
      xs.push(sim.actor(id)!.x);
    }
    // Velocity per tick: 37.5, 75, 112.5, 150, then full speed from the 5th tick (0.083 s).
    expect(xs[0]! - 72).toBeCloseTo(37.5 / 60, 9);
    const speeds = xs.slice(1).map((x, i) => (x - xs[i]!) * 60);
    [75, 112.5, 150, 180, 180, 180, 180].forEach((speed, i) =>
      expect(speeds[i]).toBeCloseTo(speed, 9),
    );
    const before = sim.actor(id)!.x;
    for (let i = 0; i < 5; i++) sim.step();
    const after = sim.actor(id)!.x;
    sim.step();
    expect(sim.actor(id)!.x).toBe(after);
    expect(after - before).toBeLessThan(8);
  });

  it('keeps actors apart, teammates included (Q48)', () => {
    const sim = createSimulation({ map: open, catalog, seed: 1 });
    const a = sim.spawnActor({ team: 1, character: 'rifleman', x: 150, y: 120 });
    const b = sim.spawnActor({ team: 1, character: 'rifleman', x: 250, y: 120 });
    for (let i = 0; i < 60; i++)
      sim.step(
        new Map([
          [a, move(1, 0)],
          [b, move(-1, 0)],
        ]),
      );
    // Both push at full speed; after each step they just touch (radius 10 + 10).
    expect(sim.actor(b)!.x - sim.actor(a)!.x).toBeCloseTo(20, 9);
    expect(sim.actor(a)!.y).toBeCloseTo(120, 9);
  });

  it('separates actors placed exactly on the same point', () => {
    const sim = createSimulation({ map: open, catalog, seed: 1 });
    const a = sim.spawnActor({ team: 1, character: 'rifleman', x: 200, y: 120 });
    const b = sim.spawnActor({ team: 2, character: 'rifleman', x: 200, y: 120 });
    for (let i = 0; i < 5; i++) sim.step();
    expect(sim.actor(a)!.x).toBeLessThan(200);
    expect(sim.actor(b)!.x).toBeGreaterThan(200);
  });

  it('never lets a character overlap an obstacle over 10,000 random-input ticks (C1.4)', () => {
    const map = asciiMap(`
      ##############
      #..o....#....#
      #.##..~~~..o.#
      #..#..~1~....#
      #.....~~~.#..#
      #.o..2....#..#
      #....#.o.....#
      ##############
    `);
    const sim = createSimulation({ map, catalog, seed: 'walls' });
    const starts = [
      ...map.spawns.map((area) => ({ x: area.x + 24, y: area.y + 24 })),
      ...[72, 120, 264, 312, 456, 600].map((x) => ({ x, y: 72 })),
    ];
    const ids = starts.map((start, i) =>
      sim.spawnActor({ team: (i % 2) + 1, character: 'rifleman', ...start }),
    );
    const rng = createRng('random inputs');
    const current = new Map<number, InputCommand>();
    let contacts = 0;
    for (let tick = 0; tick < 10_000; tick++) {
      for (const id of ids) {
        // Change direction every 30 ticks on average, sometimes standing still.
        if (!current.has(id) || rng.chance(1 / 30)) {
          const angle = rng.range(-Math.PI, Math.PI);
          const length = rng.chance(0.15) ? 0 : 1;
          current.set(id, move(Math.cos(angle) * length, Math.sin(angle) * length));
        }
      }
      sim.step(current);
      for (const actor of sim.actors()) {
        expect(circleBlocked(sim.grid, actor.x, actor.y, actor.radius, BLOCKS_MOVEMENT)).toBe(
          false,
        );
        if (circleBlocked(sim.grid, actor.x, actor.y, actor.radius + 0.5, BLOCKS_MOVEMENT))
          contacts++;
      }
    }
    // The test is meaningful only if characters spent a lot of time against obstacles.
    expect(contacts).toBeGreaterThan(10_000);
  });
});
