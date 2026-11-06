import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../core/events';
import type { InputCommand } from '../core/input';
import { Button, NEUTRAL_INPUT } from '../core/input';
import type { MapData } from '../map/map-data';
import { DamageFilter } from '../map/map-data';
import { asciiMap } from '../testing/ascii-map';
import type { TestCatalogOptions } from '../testing/test-catalog';
import { testCatalog } from '../testing/test-catalog';
import type { Simulation } from '../world/simulation';
import { createSimulation } from '../world/simulation';

const FIRE: InputCommand = { ...NEUTRAL_INPUT, aim: 0, buttons: Button.fire };
const BURN_TICKS = 300;

function world(
  map: MapData,
  options: { seed?: string; friendlyFire?: boolean; catalog?: TestCatalogOptions; x?: number } = {},
) {
  const sim = createSimulation({
    map,
    catalog: testCatalog(options.catalog),
    seed: options.seed ?? 'fire',
    rules: { friendlyFire: options.friendlyFire ?? false },
  });
  const flamer = sim.spawnActor({ team: 1, character: 'trooper', x: options.x ?? 72, y: 72 });
  return { sim, flamer };
}

function run(sim: Simulation, ticks: number, inputs?: ReadonlyMap<number, InputCommand>) {
  const events: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) events.push(...sim.step(inputs));
  return events;
}

const ofType = <T extends SimEvent['type']>(events: readonly SimEvent[], type: T) =>
  events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);

describe('flamethrower', () => {
  const room = asciiMap(`
    ##########
    #........#
    #........#
    ##########
  `);

  it('throws flames at its rate for as long as the tank lasts, then refills (Q70)', () => {
    const { sim, flamer } = world(room);
    expect(sim.actor(flamer)?.rounds).toBe(180);
    const inputs = new Map([[flamer, FIRE]]);
    const firing = run(sim, 180, inputs);
    expect(ofType(firing, 'shotFired')).toHaveLength(36);
    expect(sim.actor(flamer)?.rounds).toBe(0);
    expect(ofType(firing, 'reloadStarted')).toEqual([
      { type: 'reloadStarted', entity: flamer, weapon: 'flamer', ticks: 180 },
    ]);

    const waiting = run(sim, 179, inputs);
    expect(ofType(waiting, 'shotFired')).toEqual([]);
    const back = run(sim, 1, inputs);
    expect(ofType(back, 'reloaded')).toHaveLength(1);
    expect(ofType(back, 'shotFired')).toHaveLength(1);
    expect(sim.actor(flamer)?.rounds).toBe(179);
  });

  it('can refill before the tank is empty', () => {
    const { sim, flamer } = world(room);
    run(sim, 30, new Map([[flamer, FIRE]]));
    run(sim, 1, new Map([[flamer, { ...NEUTRAL_INPUT, buttons: Button.reload }]]));
    run(sim, 180);
    expect(sim.actor(flamer)?.rounds).toBe(180);
  });

  it('reaches its range and no farther (Q70)', () => {
    const { sim, flamer } = world(room);
    const near = sim.spawnActor({ team: 2, character: 'rifleman', x: 72 + 24 + 150, y: 72 });
    const far = sim.spawnActor({ team: 2, character: 'rifleman', x: 72 + 24 + 240, y: 72 });
    run(sim, 60, new Map([[flamer, FIRE]]));
    expect(sim.actor(near)?.hp).toBeLessThan(100);
    expect(sim.actor(far)?.hp).toBe(100);
  });

  it('hurts and ignites the character it hits', () => {
    const { sim, flamer } = world(room);
    const target = sim.spawnActor({ team: 2, character: 'rifleman', x: 140, y: 72 });
    const events = run(sim, 15, new Map([[flamer, FIRE]]));
    expect(ofType(events, 'hit')[0]).toMatchObject({ source: 'fire', damage: 10, target });
    expect(sim.actor(target)?.burning).toBe(true);
  });

  it('is stopped by walls and by cover', () => {
    for (const map of [
      asciiMap(`
        ##########
        #..#.....#
        ##########
      `),
      asciiMap(`
        ##########
        #..s.....#
        ##########
      `),
    ]) {
      const { sim, flamer } = world(map);
      const behind = sim.spawnActor({ team: 2, character: 'rifleman', x: 216, y: 72 });
      run(sim, 60, new Map([[flamer, FIRE]]));
      expect(sim.actor(behind)?.hp).toBe(100);
    }
  });

  it('reaches over cover it stands against (Q29)', () => {
    const map = asciiMap(`
      ##########
      #..s.....#
      ##########
    `);
    const sim = createSimulation({ map, catalog: testCatalog(), seed: 'fire' });
    const flamer = sim.spawnActor({ team: 1, character: 'trooper', x: 133, y: 72 });
    const behind = sim.spawnActor({ team: 2, character: 'rifleman', x: 216, y: 72 });
    run(sim, 60, new Map([[flamer, FIRE]]));
    expect(sim.actor(behind)?.hp).toBeLessThan(100);
  });
});

describe('fire on the map', () => {
  it('ignites what the flames touch and burns out into the burnt variant (Q31)', () => {
    const { sim, flamer } = world(
      asciiMap(`
        ##########
        #...g....#
        ##########
      `),
    );
    const firing = run(sim, 30, new Map([[flamer, FIRE]]));
    expect(ofType(firing, 'fireStarted')).toEqual([
      { type: 'fireStarted', element: 14, x: 216, y: 72 },
    ]);
    expect(sim.elements()[0]?.burning).toBeGreaterThan(0);

    const after = run(sim, BURN_TICKS);
    expect(ofType(after, 'fireEnded')).toEqual([{ type: 'fireEnded', element: 14 }]);
    expect(ofType(after, 'tileChanged')).toEqual([
      { type: 'tileChanged', layer: 0, tileX: 4, tileY: 1, tile: 6 },
    ]);
    expect(sim.elements()).toEqual([]);
  });

  it('burns a flammable wall down, opening the way', () => {
    const { sim, flamer } = world(
      asciiMap(`
        ##########
        #..w.....#
        ##########
      `),
    );
    run(sim, 20, new Map([[flamer, FIRE]]));
    expect(sim.grid.flagsAt(3, 1)).not.toBe(0);
    const events = run(sim, BURN_TICKS);
    expect(sim.grid.flagsAt(3, 1)).toBe(0);
    expect(ofType(events, 'elementDestroyed')[0]).toMatchObject({ burnt: true, object: undefined });
  });

  it('burns objects down', () => {
    const { sim, flamer } = world(
      asciiMap(`
        ##########
        #..c.....#
        ##########
      `),
    );
    run(sim, 20, new Map([[flamer, FIRE]]));
    const events = run(sim, BURN_TICKS);
    expect(ofType(events, 'elementDestroyed')[0]).toMatchObject({ burnt: true, object: 1 });
    expect(sim.grid.footprintsAt(3, 1)).toEqual([]);
  });

  const fence = { hp: 40, damageFilter: DamageFilter.bullet | DamageFilter.explosion };

  it('burns down cover that fire cannot hurt: the flame stops against it (Q79)', () => {
    const map = asciiMap(`
      ##########
      #..s.....#
      ##########
    `);
    const { sim, flamer } = world({
      ...map,
      objects: map.objects.map((o) => ({ ...o, element: { ...fence, flammable: true } })),
    });
    const firing = run(sim, 60, new Map([[flamer, FIRE]]));
    expect(ofType(firing, 'fireStarted')).toHaveLength(1);
    expect(ofType(firing, 'elementDestroyed')).toEqual([]);
    const events = run(sim, BURN_TICKS);
    expect(ofType(events, 'elementDestroyed')[0]).toMatchObject({ burnt: true, object: 1 });
    expect(sim.grid.footprintsAt(3, 1)).toEqual([]);
  });

  it('lights the cover it is fired over, whose far side the muzzle reaches (Q79)', () => {
    const map = asciiMap(`
      ##########
      #.s......#
      ##########
    `);
    const { sim, flamer } = world({
      ...map,
      objects: map.objects.map((o) => ({
        ...o,
        element: { ...fence, flammable: true },
        footprints: o.footprints.map((f) => ({ ...f, x: 84, width: 6 })),
      })),
    });
    const firing = run(sim, 5, new Map([[flamer, FIRE]]));
    expect(ofType(firing, 'fireStarted')).toMatchObject([{ x: 87 }]);
  });

  it('lights the obstacle it stands against, though no flame leaves the nozzle (Q79)', () => {
    const map = asciiMap(`
      ##########
      #.c......#
      ##########
    `);
    const { sim, flamer } = world(
      {
        ...map,
        objects: map.objects.map((o) => ({ ...o, element: { ...fence, flammable: true } })),
      },
      { x: 93 },
    );
    const firing = run(sim, 30, new Map([[flamer, FIRE]]));
    expect(ofType(firing, 'shotFired').every((e) => e.projectile === undefined)).toBe(true);
    expect(ofType(firing, 'fireStarted')).toHaveLength(1);
    expect(ofType(firing, 'elementDestroyed')).toEqual([]);
    const events = run(sim, BURN_TICKS);
    expect(ofType(events, 'elementDestroyed')[0]).toMatchObject({ burnt: true, object: 1 });
  });

  it('does not ignite what is not flammable', () => {
    const { sim, flamer } = world(
      asciiMap(`
        ##########
        #..x.....#
        ##########
      `),
      { catalog: { flamethrower: { damage: 1 } } },
    );
    const events = run(sim, 5 * 12, new Map([[flamer, FIRE]]));
    expect(ofType(events, 'fireStarted')).toEqual([]);
  });

  it('hurts a destructible through its damage filter', () => {
    const { sim, flamer } = world(
      asciiMap(`
        ##########
        #..x.....#
        ##########
      `),
    );
    const events = run(sim, 60, new Map([[flamer, FIRE]]));
    expect(ofType(events, 'exploded')).toHaveLength(1);
    expect(ofType(events, 'exploded')[0]?.owner).toBe(flamer);
  });

  it('spreads across adjacent flammable tiles only, then dies out (C2.4)', () => {
    const map = asciiMap(`
      ##############
      #...gggg.gggg#
      #...gggg.gggg#
      ##############
    `);
    const { sim, flamer } = world(map, {
      catalog: {
        fire: {
          burnTicks: 300,
          spreadChance: 1,
          characterBurnTicks: 180,
          characterDamagePerSecond: 8,
        },
      },
    });
    run(sim, 30, new Map([[flamer, FIRE]]));
    const events = run(sim, 2000);
    const started = ofType(events, 'fireStarted').map((e) => Math.floor(e.x / 48));
    expect(Math.max(...started)).toBeLessThanOrEqual(7);
    // The first patch is gone; the second one, beyond the gap, never caught fire.
    expect(sim.elements().every((e) => e.tileX >= 9)).toBe(true);
    expect(sim.elements()).toHaveLength(8);
    expect(sim.elements().every((e) => e.burning === 0)).toBe(true);
  });

  it('never lights an element again as it burns out beside another fire', () => {
    let fires = 0;
    for (let seed = 0; seed < 20; seed++) {
      const { sim, flamer } = world(
        asciiMap(`
          ##############
          #.....ggggggg#
          ##############
        `),
        { seed: `relight-${seed}` },
      );
      const events = [...run(sim, 40, new Map([[flamer, FIRE]])), ...run(sim, 3600)];
      const started = ofType(events, 'fireStarted').map((e) => e.element);
      expect(new Set(started).size, `seed ${seed}`).toBe(started.length);
      expect(ofType(events, 'fireEnded'), `seed ${seed}`).toHaveLength(started.length);
      fires += started.length;
    }
    expect(fires).toBeGreaterThan(40);
  });

  it('spreads through objects next to tiles', () => {
    const map = asciiMap(`
      ##########
      #...gc...#
      ##########
    `);
    const { sim, flamer } = world(map, {
      catalog: {
        flame: { range: 120 },
        fire: {
          burnTicks: 300,
          spreadChance: 1,
          characterBurnTicks: 180,
          characterDamagePerSecond: 8,
        },
      },
    });
    run(sim, 30, new Map([[flamer, FIRE]]));
    const events = run(sim, 120);
    expect(ofType(events, 'fireStarted').length).toBeGreaterThanOrEqual(1);
    expect(sim.elements().find((e) => e.object === 1)?.burning).toBeGreaterThan(0);
  });

  it('is deterministic for a given seed (C2.4)', () => {
    const play = (seed: string) => {
      const { sim, flamer } = world(
        asciiMap(`
          ##############
          #...gggggggggg
          #...gggggggggg
          #...gggggggggg
          ##############
        `),
        { seed },
      );
      const events = [...run(sim, 30, new Map([[flamer, FIRE]])), ...run(sim, 1500)];
      return { hash: sim.hash(), fires: ofType(events, 'fireStarted').map((e) => e.element) };
    };
    expect(play('a')).toEqual(play('a'));
    expect(play('a').fires).not.toEqual(play('b').fires);
  });

  it('stops with a new round', () => {
    const { sim, flamer } = world(
      asciiMap(`
        ##########
        #...g....#
        ##########
      `),
    );
    run(sim, 30, new Map([[flamer, FIRE]]));
    sim.clear();
    expect(sim.step()).toContainEqual({ type: 'mapReset' });
    expect(sim.elements()).toEqual([
      { key: 14, object: undefined, tileX: 4, tileY: 1, hp: undefined, burning: 0 },
    ]);
    expect(ofType(run(sim, 400), 'tileChanged')).toEqual([]);
  });
});

describe('burning characters', () => {
  const room = asciiMap(`
    ##########
    #........#
    #........#
    ##########
  `);
  const oneFlame = { flamethrower: { damage: 1, tankMs: 20, refillMs: 60000 } };

  function ignited() {
    const { sim, flamer } = world(room, { catalog: oneFlame });
    const target = sim.spawnActor({ team: 2, character: 'rifleman', x: 140, y: 72 });
    run(sim, 2, new Map([[flamer, FIRE]]));
    let ticks = 0;
    while (!sim.actor(target)?.burning && ticks++ < 60) sim.step();
    return { sim, flamer, target };
  }

  it('takes the configured damage over about 3 seconds (Q31, C2.4)', () => {
    const { sim, flamer, target } = ignited();
    const start = sim.actor(target)?.hp ?? 0;
    const events = run(sim, 180);
    const burns = ofType(events, 'damaged').filter((e) => e.source === 'fire');
    expect(burns.reduce((sum, e) => sum + e.amount, 0)).toBe(24);
    expect(burns.every((e) => e.attacker === flamer)).toBe(true);
    expect(sim.actor(target)?.hp).toBe(start - 24);
    sim.step();
    expect(sim.actor(target)?.burning).toBe(false);
    expect(ofType(run(sim, 60), 'damaged')).toEqual([]);
  });

  it('can die of it, the kill going to whoever started the fire', () => {
    const { sim, flamer } = world(room, {
      catalog: { ...oneFlame, character: { hitPoints: 10 } },
    });
    const target = sim.spawnActor({ team: 2, character: 'rifleman', x: 140, y: 72 });
    const events = [...run(sim, 2, new Map([[flamer, FIRE]])), ...run(sim, 200)];
    expect(ofType(events, 'killed')).toEqual([
      expect.objectContaining({ victim: target, killer: flamer, source: 'fire' }),
    ]);
    expect(sim.actor(target)?.burning).toBe(false);
  });

  const GRASS = asciiMap(`
    ##########
    #...ggg..#
    #...ggg..#
    ##########
  `);

  it('catches fire standing in it, even from its own fire (Q63, Q64)', () => {
    const { sim, flamer } = world(GRASS);
    const enemy = sim.spawnActor({ team: 2, character: 'rifleman', x: 240, y: 72 });
    run(sim, 30, new Map([[flamer, FIRE]]));
    run(sim, 60);
    expect(sim.actor(enemy)?.burning).toBe(true);

    const self = world(GRASS);
    const walking = { ...NEUTRAL_INPUT, move: { x: 1, y: 0 } };
    run(self.sim, 30, new Map([[self.flamer, FIRE]]));
    run(self.sim, 60, new Map([[self.flamer, walking]]));
    expect(self.sim.actor(self.flamer)?.burning).toBe(true);
  });

  it('spares teammates unless friendly fire is on (Q64)', () => {
    const off = world(GRASS);
    const mate = off.sim.spawnActor({ team: 1, character: 'rifleman', x: 216, y: 72 });
    run(off.sim, 30, new Map([[off.flamer, FIRE]]));
    run(off.sim, 60);
    expect(off.sim.actor(mate)?.burning).toBe(false);

    const on = world(GRASS, { friendlyFire: true });
    const mate2 = on.sim.spawnActor({ team: 1, character: 'rifleman', x: 216, y: 120 });
    run(on.sim, 30, new Map([[on.flamer, FIRE]]));
    run(on.sim, 240);
    expect(on.sim.actor(mate2)?.burning).toBe(true);
  });
});
