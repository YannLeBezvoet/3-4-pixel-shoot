import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../core/events';
import type { InputCommand } from '../core/input';
import { Button, NEUTRAL_INPUT } from '../core/input';
import { BLOCKS_MOVEMENT } from '../map/map-data';
import type { MapData } from '../map/map-data';
import { circleBlocked } from '../physics/move-circle';
import { lineOfSight } from '../physics/raycast';
import { asciiMap } from '../testing/ascii-map';
import { testCatalog } from '../testing/test-catalog';
import type { Simulation } from '../world/simulation';
import { createSimulation } from '../world/simulation';

const fire: InputCommand = { ...NEUTRAL_INPUT, aim: 0, buttons: Button.fire };

function world(map: MapData, damage = 20) {
  const sim = createSimulation({
    map,
    catalog: testCatalog({ weapon: { damage, fireMode: 'semi', roundsPerMinute: 600 } }),
    seed: 'elements',
  });
  const shooter = sim.spawnActor({ team: 1, character: 'rifleman', x: 72, y: 72 });
  return { sim, shooter };
}

/** One bullet: a press, then enough ticks for it to arrive. */
function shoot(sim: Simulation, shooter: number): SimEvent[] {
  const events = [...sim.step(new Map([[shooter, fire]]))];
  for (let i = 0; i < 12; i++) events.push(...sim.step());
  return events;
}

const blast = (x: number, y: number, damage = 120) => ({
  x,
  y,
  radius: 144,
  damage,
  owner: 999,
  team: 3,
  weapon: 'rifle',
  kind: undefined,
});

const WALL = `
  ########
  #..w...#
  ########
`;

describe('destructible tiles', () => {
  it('is destroyed by exactly the damage that reaches its hit points (C2.3)', () => {
    const { sim, shooter } = world(asciiMap(WALL));
    expect(sim.elements()).toEqual([{ key: 11, object: undefined, tileX: 3, tileY: 1, hp: 60 }]);
    shoot(sim, shooter);
    shoot(sim, shooter);
    expect(sim.elements()[0]?.hp).toBe(20);
    expect(sim.grid.flagsAt(3, 1)).not.toBe(0);
    const events = shoot(sim, shooter);
    expect(events).toContainEqual({
      type: 'tileChanged',
      layer: 0,
      tileX: 3,
      tileY: 1,
      tile: 4,
    });
    expect(events).toContainEqual({
      type: 'elementDestroyed',
      object: undefined,
      box: { x: 144, y: 48, width: 48, height: 48 },
      attacker: shooter,
    });
    expect(sim.elements()).toEqual([]);
  });

  it('stops blocking movement, bullets and sight once destroyed (C2.3)', () => {
    const { sim, shooter } = world(asciiMap(WALL), 60);
    expect(lineOfSight(sim.grid, 72, 72, 264, 72)).toBe(false);
    shoot(sim, shooter);
    expect(sim.grid.flagsAt(3, 1)).toBe(0);
    expect(lineOfSight(sim.grid, 72, 72, 264, 72)).toBe(true);
    expect(circleBlocked(sim.grid, 168, 72, 10, BLOCKS_MOVEMENT)).toBe(false);
    const target = sim.spawnActor({ team: 2, character: 'rifleman', x: 264, y: 72 });
    shoot(sim, shooter);
    expect(sim.actor(target)?.hp).toBe(40);
  });

  it('takes the damage of a blast, less with distance', () => {
    const { sim } = world(asciiMap(WALL));
    sim.explode(blast(96, 72, 80));
    sim.step();
    sim.step();
    // The wall's near side is 48 pixels from the blast: two thirds of 80.
    expect(sim.elements()[0]?.hp).toBe(60 - 53);
  });

  it('is shielded from a blast by a wall', () => {
    const { sim } = world(
      asciiMap(`
        #########
        #..#w...#
        #########
      `),
    );
    sim.explode(blast(96, 72));
    sim.step();
    expect(sim.elements()[0]?.hp).toBe(60);
  });
});

describe('destructible objects', () => {
  const CRATE = `
    ########
    #..c...#
    ########
  `;

  it('takes bullets and loses its collision when destroyed (C2.3)', () => {
    const { sim, shooter } = world(asciiMap(CRATE), 40);
    shoot(sim, shooter);
    expect(sim.elements()[0]?.hp).toBe(40);
    const events = shoot(sim, shooter);
    expect(events).toContainEqual({
      type: 'elementDestroyed',
      object: 1,
      box: { x: 152, y: 56, width: 32, height: 32 },
      attacker: shooter,
    });
    expect(sim.grid.footprintsAt(3, 1)).toEqual([]);
    expect(circleBlocked(sim.grid, 168, 72, 10, BLOCKS_MOVEMENT)).toBe(false);
  });

  it('respects its damage filter (Q33): sandbags only take explosions', () => {
    const { sim, shooter } = world(
      asciiMap(`
        ########
        #..S...#
        ########
      `),
      300,
    );
    for (let i = 0; i < 12; i++) shoot(sim, shooter);
    expect(sim.elements()[0]?.hp).toBe(200);
    sim.explode(blast(100, 72));
    sim.step();
    sim.step();
    expect(sim.elements()[0]?.hp).toBeLessThan(200);
  });
});

describe('explosive elements', () => {
  const BARRELS = `
    ###########
    #..x.x....#
    ###########
  `;

  it('goes off when destroyed, hurting what stands around for the one who shot it', () => {
    const { sim, shooter } = world(
      asciiMap(`
        ###########
        #..x......#
        ###########
      `),
      30,
    );
    const target = sim.spawnActor({ team: 2, character: 'rifleman', x: 260, y: 72 });
    const events = shoot(sim, shooter);
    expect(events).toContainEqual({
      type: 'exploded',
      x: 168,
      y: 72,
      radius: 144,
      owner: shooter,
      weapon: 'rifle',
      kind: undefined,
    });
    expect(
      events.some((e) => e.type === 'damaged' && e.target === target && e.attacker === shooter),
    ).toBe(true);
  });

  it('sets off its neighbors in a chain', () => {
    const { sim, shooter } = world(asciiMap(BARRELS), 30);
    const events = shoot(sim, shooter);
    expect(events.filter((e) => e.type === 'exploded')).toHaveLength(2);
    expect(sim.elements()).toEqual([]);
  });
});

describe('a new round', () => {
  it('brings the map back and says so, once', () => {
    const { sim, shooter } = world(asciiMap(WALL), 60);
    shoot(sim, shooter);
    expect(sim.grid.flagsAt(3, 1)).toBe(0);
    sim.clear();
    expect(sim.step()).toContainEqual({ type: 'mapReset' });
    expect(sim.elements()).toHaveLength(1);
    expect(sim.grid.flagsAt(3, 1)).not.toBe(0);
    sim.clear();
    expect(sim.step()).toEqual([]);
  });

  it('brings objects back with their collision', () => {
    const { sim, shooter } = world(
      asciiMap(`
        ########
        #..c...#
        ########
      `),
      80,
    );
    shoot(sim, shooter);
    sim.clear();
    expect(sim.grid.footprintsAt(3, 1)).toHaveLength(1);
  });
});

describe('determinism', () => {
  it('hashes what happened to map elements', () => {
    const { sim: a, shooter } = world(asciiMap(WALL));
    const { sim: b } = world(asciiMap(WALL));
    shoot(a, shooter);
    for (let i = 0; i < 13; i++) b.step();
    expect(a.hash()).not.toBe(b.hash());
  });
});
