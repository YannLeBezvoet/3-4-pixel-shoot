import { describe, expect, it } from 'vitest';
import { MAX_BULLET_SPEED } from '../behaviors/projectiles/bullet';
import type { SimEvent } from '../core/events';
import type { InputCommand } from '../core/input';
import { Button, NEUTRAL_INPUT } from '../core/input';
import { tileOf } from '../map/collision-grid';
import { BLOCKS_PROJECTILES, TileFlag } from '../map/map-data';
import { castSegment } from '../physics/raycast';
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
  #................#
  ##################
`);

const aim = (angle: number, buttons = 0): InputCommand => ({
  ...NEUTRAL_INPUT,
  aim: angle,
  buttons,
});
const FIRE = Button.fire;

function setup(options: TestCatalogOptions = {}, friendlyFire = false, map = room) {
  const sim = createSimulation({
    map,
    catalog: testCatalog(options),
    seed: 'combat',
    rules: { friendlyFire },
  });
  const shooter = sim.spawnActor({ team: 1, character: 'rifleman', x: 96, y: 120 });
  return { sim, shooter };
}

/** Steps with the same input for `ticks` ticks and returns every event. */
function run(sim: Simulation, inputs: ReadonlyMap<number, InputCommand>, ticks: number) {
  const events: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) events.push(...sim.step(inputs));
  return events;
}
const ofType = <T extends SimEvent['type']>(events: SimEvent[], type: T) =>
  events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);

describe('firearm', () => {
  it('fires at its rate of fire while the trigger is held (auto)', () => {
    const { sim, shooter } = setup({ weapon: { magazine: 1000 } });
    const shots = ofType(run(sim, new Map([[shooter, aim(0, FIRE)]]), 600), 'shotFired');
    // 750 rounds per minute: one every 4.8 ticks, the first on the first tick.
    expect(shots).toHaveLength(125);
    expect(sim.actor(shooter)?.rounds).toBe(875);
  });

  it('fires once per press (semi), never faster than its rate', () => {
    const { sim, shooter } = setup({ weapon: { fireMode: 'semi', roundsPerMinute: 300 } });
    const held = new Map([[shooter, aim(0, FIRE)]]);
    const released = new Map([[shooter, aim(0)]]);
    // Holding the trigger fires once.
    expect(ofType(run(sim, held, 30), 'shotFired')).toHaveLength(1);
    run(sim, released, 1);
    expect(ofType(run(sim, held, 1), 'shotFired')).toHaveLength(1);
    // Pressing again 2 ticks later: still within the 12-tick interval, so no shot.
    run(sim, released, 1);
    expect(ofType(run(sim, held, 1), 'shotFired')).toHaveLength(0);
    run(sim, released, 12);
    expect(ofType(run(sim, held, 1), 'shotFired')).toHaveLength(1);
  });

  it('reloads by itself when the magazine is empty, then fires again', () => {
    const { sim, shooter } = setup({ weapon: { magazine: 3, reloadMs: 500 } });
    const events = run(sim, new Map([[shooter, aim(0, FIRE)]]), 60);
    const types = events.map((e) => e.type).filter((t) => t !== 'projectileImpact');
    expect(types.slice(0, 6)).toEqual([
      'actorSpawned',
      'shotFired',
      'shotFired',
      'shotFired',
      'reloadStarted',
      'reloaded',
    ]);
    expect(ofType(events, 'reloadStarted')[0]?.ticks).toBe(30);
    expect(ofType(events, 'shotFired')).toHaveLength(6);
  });

  it('reloads on the reload button, but not with a full magazine', () => {
    const { sim, shooter } = setup({ weapon: { reloadMs: 1000 } });
    expect(
      ofType(run(sim, new Map([[shooter, aim(0, Button.reload)]]), 1), 'reloadStarted'),
    ).toHaveLength(0);
    run(sim, new Map([[shooter, aim(0, FIRE)]]), 1);
    const started = run(sim, new Map([[shooter, aim(0, Button.reload | FIRE)]]), 1);
    expect(ofType(started, 'reloadStarted')).toHaveLength(1);
    expect(sim.actor(shooter)?.reloadLeft).toBe(60);
    // No shot while reloading.
    expect(ofType(run(sim, new Map([[shooter, aim(0, FIRE)]]), 59), 'shotFired')).toHaveLength(0);
    expect(ofType(run(sim, new Map(), 1), 'reloaded')).toHaveLength(1);
    expect(sim.actor(shooter)?.rounds).toBe(20);
  });

  it('uses spare magazines and stops reloading when none is left', () => {
    const { sim, shooter } = setup({ weapon: { magazine: 2, reloadMs: 100, reserveMagazines: 1 } });
    expect(sim.actor(shooter)?.spareMagazines).toBe(1);
    const shots = ofType(run(sim, new Map([[shooter, aim(0, FIRE)]]), 120), 'shotFired');
    expect(shots).toHaveLength(4);
    expect(sim.actor(shooter)).toMatchObject({ rounds: 0, spareMagazines: 0, reloadLeft: 0 });
  });

  it('drops the rounds left in the old magazine when reloading', () => {
    const { sim, shooter } = setup({ weapon: { magazine: 5, reloadMs: 100, reserveMagazines: 1 } });
    run(sim, new Map([[shooter, aim(0, FIRE)]]), 1);
    run(sim, new Map([[shooter, aim(0, Button.reload)]]), 10);
    expect(sim.actor(shooter)).toMatchObject({ rounds: 5, spareMagazines: 0 });
  });

  it('spreads shots randomly within the configured angle, reproducibly', () => {
    const angles = () => {
      const { sim, shooter } = setup({ weapon: { spreadDeg: 10, magazine: 1000 } });
      return ofType(run(sim, new Map([[shooter, aim(1, FIRE)]]), 200), 'shotFired').map(
        (shot) => shot.angle,
      );
    };
    const first = angles();
    const limit = (10 * Math.PI) / 180;
    for (const angle of first) expect(Math.abs(angle - 1)).toBeLessThanOrEqual(limit);
    expect(new Set(first).size).toBe(first.length);
    expect(angles()).toEqual(first);
  });

  it('starts the shot at the muzzle, at gun height', () => {
    const { sim, shooter } = setup({ muzzleDistance: 30, character: { gunHeight: 18 } });
    const [shot] = ofType(run(sim, new Map([[shooter, aim(Math.PI / 2, FIRE)]]), 1), 'shotFired');
    expect(shot).toMatchObject({ shooter, weapon: 'rifle', z: 18, angle: Math.PI / 2 });
    expect(shot?.x).toBeCloseTo(96, 9);
    expect(shot?.y).toBeCloseTo(150, 9);
    expect(shot?.projectile).toBeDefined();
  });
});

describe('bullet', () => {
  it('flies at its speed and hits the first enemy on its way', () => {
    const { sim, shooter } = setup();
    const near = sim.spawnActor({ team: 2, character: 'rifleman', x: 300, y: 120 });
    sim.spawnActor({ team: 2, character: 'rifleman', x: 500, y: 120 });
    const fired = run(sim, new Map([[shooter, aim(0, FIRE)]]), 1);
    const [shot] = ofType(fired, 'shotFired');
    // Fired from the muzzle (x 120), then moved 25 units in the same tick.
    expect(sim.projectiles()).toEqual([
      { id: shot?.projectile, kind: 'bullet', owner: shooter, x: 145, y: 120, z: 20, angle: 0 },
    ]);
    const hits = ofType(run(sim, new Map(), 10), 'hit');
    expect(hits).toEqual([
      {
        type: 'hit',
        projectile: shot?.projectile,
        kind: 'bullet',
        attacker: shooter,
        target: near,
        weapon: 'rifle',
        damage: 28,
        x: 290,
        y: 120,
        z: 20,
        angle: 0,
      },
    ]);
    expect(sim.projectiles()).toEqual([]);
  });

  it('passes through teammates when friendly fire is off, hits them when on (Q49)', () => {
    for (const friendlyFire of [false, true]) {
      const { sim, shooter } = setup({}, friendlyFire);
      const mate = sim.spawnActor({ team: 1, character: 'rifleman', x: 300, y: 120 });
      const enemy = sim.spawnActor({ team: 2, character: 'rifleman', x: 500, y: 120 });
      run(sim, new Map([[shooter, aim(0, FIRE)]]), 1);
      const [hit] = ofType(run(sim, new Map(), 30), 'hit');
      expect(hit?.target).toBe(friendlyFire ? mate : enemy);
    }
  });

  it('never hits its shooter', () => {
    const { sim, shooter } = setup();
    // Aiming straight at a wall a few pixels away, the shooter stays unharmed.
    const events = run(sim, new Map([[shooter, aim(Math.PI, FIRE)]]), 30);
    expect(ofType(events, 'hit')).toHaveLength(0);
  });

  it('disappears at the end of its range', () => {
    const { sim, shooter } = setup({ bullet: { range: 100 } });
    run(sim, new Map([[shooter, aim(0, FIRE)]]), 1);
    expect(sim.projectiles()).toHaveLength(1);
    const events = run(sim, new Map(), 4);
    expect(sim.projectiles()).toHaveLength(0);
    expect(events).toEqual([]);
  });

  it('stops at once when the muzzle is past a wall', () => {
    const { sim, shooter } = setup({ muzzleDistance: 40 });
    // Walk against the left wall: the muzzle, 40 units ahead, is then inside it.
    run(sim, new Map([[shooter, { move: { x: -1, y: 0 }, aim: Math.PI, buttons: 0 }]]), 30);
    expect(sim.actor(shooter)?.x).toBeCloseTo(58, 9);
    const events = run(sim, new Map([[shooter, aim(Math.PI, FIRE)]]), 1);
    const [shot] = ofType(events, 'shotFired');
    const [impact] = ofType(events, 'projectileImpact');
    expect(shot?.projectile).toBeUndefined();
    expect(impact).toMatchObject({ projectile: undefined, kind: 'bullet', x: 48, angle: Math.PI });
    expect(sim.projectiles()).toEqual([]);
  });

  it('never crosses an obstacle over a 360° sweep at the maximum speed (C1.4)', () => {
    const map = asciiMap(`
      ################
      #..............#
      #..#.#....o....#
      #...#..........#
      #..#.#...##....#
      #.o......#.....#
      #..............#
      ################
    `);
    const sim = createSimulation({
      map,
      seed: 'sweep',
      catalog: testCatalog({
        weapon: { roundsPerMinute: 3600, magazine: 100_000 },
        bullet: { speed: MAX_BULLET_SPEED, range: 5000 },
      }),
    });
    const solidAt = (x: number, y: number) =>
      (sim.grid.flagsAt(tileOf(x), tileOf(y)) & TileFlag.solid) !== 0 ||
      sim.grid
        .footprintsAt(tileOf(x), tileOf(y))
        .some((f) => x >= f.x && x <= f.x + f.width && y >= f.y && y <= f.y + f.height);

    let impacts = 0;
    for (const start of [
      { x: 72, y: 72 },
      { x: 330, y: 200 },
      { x: 600, y: 300 },
    ]) {
      const shooter = sim.spawnActor({ team: 1, character: 'rifleman', ...start });
      const previous = new Map<number, { x: number; y: number }>();
      const steps = 1440;
      for (let i = 0; i < steps + 20; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const buttons = i < steps ? FIRE : 0;
        for (const event of sim.step(new Map([[shooter, aim(angle, buttons)]]))) {
          if (event.type === 'shotFired' && event.projectile !== undefined)
            previous.set(event.projectile, { x: start.x, y: start.y });
          if (event.type !== 'projectileImpact') continue;
          impacts++;
          // The impact lies on an obstacle's edge (a grazed corner included).
          const near = [-0.01, 0.01].flatMap((dx) => [-0.01, 0.01].map((dy) => [dx, dy] as const));
          expect(near.some(([dx, dy]) => solidAt(event.x + dx, event.y + dy))).toBe(true);
          if (event.projectile !== undefined) previous.delete(event.projectile);
        }
        for (const projectile of sim.projectiles()) {
          const from = previous.get(projectile.id) ?? { x: start.x, y: start.y };
          expect(
            castSegment(sim.grid, from.x, from.y, projectile.x, projectile.y, BLOCKS_PROJECTILES),
          ).toBeUndefined();
          previous.set(projectile.id, { x: projectile.x, y: projectile.y });
        }
      }
      expect(sim.projectiles()).toEqual([]);
      sim.removeActor(shooter);
    }
    expect(impacts).toBe(3 * 1440);
  });
});
