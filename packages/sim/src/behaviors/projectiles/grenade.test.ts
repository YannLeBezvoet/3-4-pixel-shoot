import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../core/events';
import type { InputCommand } from '../../core/input';
import { Button, NEUTRAL_INPUT } from '../../core/input';
import type { MapData } from '../../map/map-data';
import { asciiMap } from '../../testing/ascii-map';
import type { TestCatalogOptions } from '../../testing/test-catalog';
import { testCatalog } from '../../testing/test-catalog';
import type { Simulation } from '../../world/simulation';
import { createSimulation } from '../../world/simulation';

const room = asciiMap(`
  ######################
  #....................#
  #....................#
  #....................#
  #....................#
  #....................#
  ######################
`);

const GUN_HEIGHT = 20;
const FUSE_TICKS = 150;

function setup(map: MapData = room, options: TestCatalogOptions = {}) {
  const sim = createSimulation({
    map,
    catalog: testCatalog({
      ...options,
      character: { gunHeight: GUN_HEIGHT, ...options.character },
    }),
    seed: 'grenade',
  });
  const thrower = sim.spawnActor({ team: 1, character: 'rifleman', x: 96, y: 168 });
  return { sim, thrower };
}

/** A press of the throw button toward a point on the ground. */
function throwAt(from: { x: number; y: number }, x: number, y: number): InputCommand {
  const dx = x - from.x;
  const dy = y - (from.y - GUN_HEIGHT);
  return {
    ...NEUTRAL_INPUT,
    aim: Math.atan2(dy, dx),
    aimDistance: Math.hypot(dx, dy),
    buttons: Button.throw,
  };
}

function press(sim: Simulation, thrower: number, input: InputCommand): SimEvent[] {
  return [...sim.step(new Map([[thrower, input]]))];
}

function stepUntilExplosion(sim: Simulation) {
  for (let tick = 0; tick < 2 * FUSE_TICKS; tick++) {
    const blast = sim.step().find((e) => e.type === 'exploded');
    if (blast) return blast;
  }
  throw new Error('The grenade never went off.');
}

describe('thrown weapons', () => {
  it('starts with its count and uses one per throw', () => {
    const { sim, thrower } = setup();
    expect(sim.actor(thrower)).toMatchObject({ throwable: 'frag', throwables: 2 });
    const events = press(sim, thrower, throwAt({ x: 96, y: 168 }, 288, 168));
    expect(events).toContainEqual({
      type: 'thrown',
      thrower,
      weapon: 'frag',
      x: 96,
      y: 168,
      projectile: sim.projectiles()[0]?.id,
    });
    expect(sim.actor(thrower)?.throwables).toBe(1);
  });

  it('throws once per press, with a pause between throws', () => {
    const { sim, thrower } = setup();
    const input = throwAt({ x: 96, y: 168 }, 288, 168);
    for (let i = 0; i < 20; i++) press(sim, thrower, input);
    expect(sim.actor(thrower)?.throwables).toBe(1);

    press(sim, thrower, NEUTRAL_INPUT);
    press(sim, thrower, input);
    expect(sim.actor(thrower)?.throwables).toBe(1);

    for (let i = 0; i < 40; i++) press(sim, thrower, NEUTRAL_INPUT);
    press(sim, thrower, input);
    expect(sim.actor(thrower)?.throwables).toBe(0);
  });

  it('has nothing left after its count', () => {
    const { sim, thrower } = setup(room, { thrown: { count: 1, cooldownMs: 0 } });
    const input = throwAt({ x: 96, y: 168 }, 288, 168);
    press(sim, thrower, input);
    press(sim, thrower, NEUTRAL_INPUT);
    const events = press(sim, thrower, input);
    expect(events.filter((e) => e.type === 'thrown')).toEqual([]);
  });

  it('lands on the cursor (Q30)', () => {
    const { sim, thrower } = setup();
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 288, 216));
    let landed: { x: number; y: number } | undefined;
    for (let i = 0; i < 90 && !landed; i++) {
      sim.step();
      const [grenade] = sim.projectiles();
      if (grenade && grenade.z === 0) landed = grenade;
    }
    expect(landed?.x).toBeCloseTo(288, -1);
    expect(landed?.y).toBeCloseTo(216, -1);
  });

  it('never flies farther than the maximum range (Q30)', () => {
    const { sim, thrower } = setup(room, { thrown: { maxRange: 192 } });
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 900, 168));
    let landed: { x: number } | undefined;
    for (let i = 0; i < 90 && !landed; i++) {
      sim.step();
      const [grenade] = sim.projectiles();
      if (grenade && grenade.z === 0) landed = grenade;
    }
    expect(landed?.x).toBeCloseTo(96 + 192, -1);
  });

  it('cannot be thrown while frozen', () => {
    const { sim, thrower } = setup();
    sim.frozen = true;
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 288, 168));
    expect(sim.projectiles()).toEqual([]);
  });
});

describe('grenade', () => {
  it('goes off at the end of its fuse, counted from the throw (Q30)', () => {
    const { sim, thrower } = setup();
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 288, 168));
    const events: SimEvent[] = [];
    for (let i = 0; i < FUSE_TICKS - 2; i++) events.push(...sim.step());
    expect(events.filter((e) => e.type === 'exploded')).toEqual([]);
    expect(sim.projectiles()).toHaveLength(1);
    const after = [...sim.step(), ...sim.step()];
    expect(after.filter((e) => e.type === 'exploded')).toHaveLength(1);
    expect(sim.projectiles()).toEqual([]);
  });

  it('rises then falls', () => {
    const { sim, thrower } = setup();
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 480, 168));
    const heights: number[] = [];
    for (let i = 0; i < 40; i++) {
      sim.step();
      heights.push(sim.projectiles()[0]?.z ?? 0);
    }
    const top = Math.max(...heights);
    expect(top).toBeGreaterThan(GUN_HEIGHT + 30);
    expect(heights[heights.length - 1]).toBeLessThan(top);
  });

  it('rolls to a stop', () => {
    const { sim, thrower } = setup();
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 288, 168));
    for (let i = 0; i < 130; i++) sim.step();
    const a = sim.projectiles()[0];
    sim.step();
    const b = sim.projectiles()[0];
    expect(a?.z).toBe(0);
    expect(b?.x).toBe(a?.x);
    expect(b?.y).toBe(a?.y);
  });

  it('bounces back from a wall (C2.2)', () => {
    const map = asciiMap(`
      ######################
      #....................#
      #....................#
      #.......#............#
      #.......#............#
      #.......#............#
      ######################
    `);
    const { sim, thrower } = setup(map, { grenade: { speed: 600 } });
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 460, 168));
    const blast = stepUntilExplosion(sim);
    if (blast.type !== 'exploded') throw new Error('unreachable');
    // The wall starts at x = 384: the grenade stays on the thrower's side, away from it.
    expect(blast.x).toBeLessThan(370);
    expect(blast.y).toBeCloseTo(168, 0);
  });

  it('bounces off a solid object', () => {
    const map = asciiMap(`
      ######################
      #....................#
      #....................#
      #.......o............#
      #....................#
      #....................#
      ######################
    `);
    const { sim, thrower } = setup(map, { grenade: { speed: 600 } });
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 460, 168));
    const blast = stepUntilExplosion(sim);
    if (blast.type !== 'exploded') throw new Error('unreachable');
    expect(blast.x).toBeLessThan(400);
  });

  it('flies over cover in its arc (Q65)', () => {
    const map = asciiMap(`
      ######################
      #.....s..............#
      #.....s..............#
      #.....s..............#
      #.....s..............#
      #.....s..............#
      ######################
    `);
    const { sim, thrower } = setup(map);
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 480, 168));
    const blast = stepUntilExplosion(sim);
    if (blast.type !== 'exploded') throw new Error('unreachable');
    expect(blast.x).toBeGreaterThan(336);
  });

  it('stops against cover when it rolls into it', () => {
    const map = asciiMap(`
      ######################
      #.....s..............#
      #.....s..............#
      #.....s..............#
      #.....s..............#
      #.....s..............#
      ######################
    `);
    const { sim, thrower } = setup(map, { grenade: { speed: 500, friction: 0 } });
    // Lands in front of the sandbags, then bounces and rolls into them.
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 250, 168));
    const blast = stepUntilExplosion(sim);
    if (blast.type !== 'exploded') throw new Error('unreachable');
    expect(blast.x).toBeLessThan(288);
  });

  it('hurts by its blast (C2.2)', () => {
    const { sim, thrower } = setup();
    const target = sim.spawnActor({ team: 2, character: 'rifleman', x: 340, y: 168 });
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 288, 168));
    for (let i = 0; i < FUSE_TICKS; i++) sim.step();
    const hp = sim.actor(target)?.hp ?? 100;
    expect(hp).toBeLessThan(100);
  });

  it('still hurts for its thrower after the thrower died', () => {
    const { sim, thrower } = setup();
    const target = sim.spawnActor({ team: 2, character: 'rifleman', x: 288, y: 168 });
    press(sim, thrower, throwAt({ x: 96, y: 168 }, 288, 168));
    sim.removeActor(thrower);
    const events: SimEvent[] = [];
    for (let i = 0; i < FUSE_TICKS; i++) events.push(...sim.step());
    expect(events.some((e) => e.type === 'damaged' && e.target === target)).toBe(true);
  });

  it('gives the same flight for the same seed and inputs', () => {
    const play = () => {
      const { sim, thrower } = setup();
      press(sim, thrower, throwAt({ x: 96, y: 168 }, 288, 216));
      for (let i = 0; i < FUSE_TICKS; i++) sim.step();
      return sim.hash();
    };
    expect(play()).toBe(play());
  });
});
