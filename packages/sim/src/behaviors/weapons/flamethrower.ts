// Flamethrower: a jet of short-lived flames for as long as the tank lasts, then a refill (Q70).
// The tank is counted in ticks of fire, in the weapon's `rounds`.
import { z } from 'zod';
import type { EntityId } from '../../core/entities';
import { Button, hasButton } from '../../core/input';
import { TICK_RATE, msToTicks } from '../../core/time';
import type { FlamethrowerStats } from '../../world/catalog';
import type { Actor, WeaponState, WorldState } from '../../world/state';
import type { BehaviorDefinition } from '../registry';
import { fireProjectile } from './muzzle';

export const flamethrowerParams = z.strictObject({
  flamesPerSecond: z.number().positive().max(60).describe('Flames thrown while firing.'),
  damage: z.int().positive().describe('Hit points removed by one flame.'),
  spreadDeg: z
    .number()
    .min(0)
    .max(45)
    .default(0)
    .describe('Random deviation of each flame, in degrees on each side of the aim.'),
  tankMs: z.int().positive().describe('How long a full tank fires, in milliseconds.'),
  refillMs: z.int().min(0).describe('How long a refill takes, in milliseconds.'),
});

export type FlamethrowerParams = z.infer<typeof flamethrowerParams>;

export const flamethrower: BehaviorDefinition<FlamethrowerParams> = {
  kind: 'weapon',
  id: 'flamethrower',
  description:
    'A jet of flames while the fire button is held, for as long as the tank lasts; it refills on the reload button or by itself when empty.',
  params: flamethrowerParams,
};

/** A full tank at the start of a life. */
export function createFlamethrowerState(stats: FlamethrowerStats): WeaponState {
  return {
    weapon: stats.id,
    rounds: msToTicks(stats.params.tankMs),
    spareMagazines: null,
    cooldown: 0,
    reloadLeft: 0,
    triggerWasHeld: false,
  };
}

function startRefill(
  world: WorldState,
  id: EntityId,
  state: WeaponState,
  stats: FlamethrowerStats,
): void {
  if (state.reloadLeft > 0 || state.rounds >= msToTicks(stats.params.tankMs)) return;
  const ticks = Math.max(1, msToTicks(stats.params.refillMs));
  state.reloadLeft = ticks;
  world.events.push({ type: 'reloadStarted', entity: id, weapon: stats.id, ticks });
}

/** Runs one tick of a flamethrower held by an actor. */
export function updateFlamethrower(
  world: WorldState,
  id: EntityId,
  actor: Actor,
  state: WeaponState,
  stats: FlamethrowerStats,
): void {
  const { flamesPerSecond, tankMs, damage, spreadDeg } = stats.params;

  if (state.reloadLeft > 0 && --state.reloadLeft === 0) {
    state.rounds = msToTicks(tankMs);
    world.events.push({ type: 'reloaded', entity: id, weapon: stats.id });
  }
  if (hasButton(actor.input, Button.reload)) startRefill(world, id, state, stats);

  const firing = hasButton(actor.input, Button.fire) && state.reloadLeft === 0 && state.rounds > 0;
  if (firing) {
    state.rounds--;
    if (state.cooldown <= 0) {
      state.cooldown += TICK_RATE / flamesPerSecond;
      const projectile = world.catalog.projectiles.get(stats.projectile);
      if (projectile?.behavior === 'flame')
        fireProjectile(world, id, actor, stats, {
          projectile: projectile.id,
          spreadDeg,
          damage,
          speed: projectile.params.speed,
          range: projectile.params.range,
          source: 'fire',
        });
    }
  }
  state.cooldown -= 1;
  if (state.cooldown < 0 && !firing) state.cooldown = 0;

  if (state.rounds === 0) startRefill(world, id, state, stats);
}
