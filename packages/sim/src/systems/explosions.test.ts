import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../core/events';
import { asciiMap } from '../testing/ascii-map';
import { testCatalog } from '../testing/test-catalog';
import type { Simulation } from '../world/simulation';
import { createSimulation } from '../world/simulation';
import type { ExplosionRequest } from '../world/state';

const room = asciiMap(`
  ##################
  #................#
  #................#
  #................#
  ##################
`);

const THROWER = 1;

function blastAt(x: number, y: number, owner = THROWER): ExplosionRequest {
  return { x, y, radius: 144, damage: 120, owner, team: 1, weapon: 'rifle', kind: undefined };
}

function world(map = room, friendlyFire = false) {
  return createSimulation({
    map,
    catalog: testCatalog({ character: { hitPoints: 200 } }),
    seed: 'blast',
    rules: { friendlyFire },
  });
}

const spawn = (sim: Simulation, team: number, x: number, y = 120) =>
  sim.spawnActor({ team, character: 'rifleman', x, y });

const damaged = (events: readonly SimEvent[]) => events.filter((e) => e.type === 'damaged');

describe('explosions', () => {
  it('reports the explosion', () => {
    const sim = world();
    sim.explode(blastAt(240, 120));
    expect(sim.step()).toContainEqual({
      type: 'exploded',
      x: 240,
      y: 120,
      radius: 144,
      owner: THROWER,
      weapon: 'rifle',
      kind: undefined,
    });
  });

  it('hurts less with distance, linearly down to nothing at the radius (C2.2)', () => {
    const sim = world();
    const thrower = spawn(sim, 1, 60);
    const center = spawn(sim, 2, 240);
    const half = spawn(sim, 2, 312);
    const edge = spawn(sim, 2, 384);
    sim.explode(blastAt(240, 120, thrower));
    sim.step();
    expect(sim.actor(center)?.hp).toBe(80);
    expect(sim.actor(half)?.hp).toBe(140);
    expect(sim.actor(edge)?.hp).toBe(200);
  });

  it('tags the damage with its source', () => {
    const sim = world();
    const thrower = spawn(sim, 1, 60);
    const target = spawn(sim, 2, 240);
    sim.explode(blastAt(240, 120, thrower));
    expect(damaged(sim.step())).toEqual([
      {
        type: 'damaged',
        target,
        attacker: thrower,
        weapon: 'rifle',
        source: 'explosion',
        amount: 120,
        hp: 80,
      },
    ]);
  });

  it('is stopped by a wall (C2.2)', () => {
    const sim = world(
      asciiMap(`
        ##################
        #.......#........#
        #.......#........#
        #.......#........#
        ##################
      `),
    );
    const behind = spawn(sim, 2, 456);
    sim.explode(blastAt(360, 120));
    sim.step();
    expect(sim.actor(behind)?.hp).toBe(200);
  });

  it('is stopped by cover, unless it went off above it (Q65)', () => {
    const map = asciiMap(`
      ##################
      #.......s........#
      #.......s........#
      #.......s........#
      ##################
    `);
    const sim = world(map);
    const behind = spawn(sim, 2, 456);
    sim.explode(blastAt(360, 120));
    sim.step();
    expect(sim.actor(behind)?.hp).toBe(200);

    sim.explode(blastAt(408, 120));
    sim.step();
    expect(sim.actor(behind)?.hp).toBeLessThan(200);
  });

  it('hurts its owner, and teammates only with friendly fire on (Q64)', () => {
    const off = world();
    const thrower = spawn(off, 1, 240);
    const mate = spawn(off, 1, 280);
    off.explode(blastAt(240, 120, thrower));
    off.step();
    expect(off.actor(thrower)?.hp).toBe(80);
    expect(off.actor(mate)?.hp).toBe(200);

    const on = world(room, true);
    const thrower2 = spawn(on, 1, 240);
    const mate2 = spawn(on, 1, 280);
    on.explode(blastAt(240, 120, thrower2));
    on.step();
    expect(on.actor(mate2)?.hp).toBeLessThan(200);
  });

  it('kills, naming the explosion as the source', () => {
    const sim = world();
    const thrower = spawn(sim, 1, 60);
    const target = spawn(sim, 2, 240);
    for (let i = 0; i < 2; i++) sim.explode(blastAt(240, 120, thrower));
    expect(sim.step()).toContainEqual({
      type: 'killed',
      victim: target,
      killer: thrower,
      weapon: 'rifle',
      source: 'explosion',
      x: 240,
      y: 120,
    });
  });
});
