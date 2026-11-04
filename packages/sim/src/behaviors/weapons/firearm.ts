// Firearm: a gun that fires projectiles from a magazine, with a rate of fire, spread and a
// reload. Reloading starts on the reload button or by itself when the magazine is empty (Q53).
import { z } from 'zod';
import type { EntityId } from '../../core/entities';
import { Button, hasButton } from '../../core/input';
import { TICK_RATE, msToTicks } from '../../core/time';
import type { FirearmStats } from '../../world/catalog';
import type { Actor, WeaponState, WorldState } from '../../world/state';
import type { BehaviorDefinition } from '../registry';
import { fireProjectile } from './muzzle';

export const firearmParams = z.strictObject({
  fireMode: z
    .enum(['auto', 'semi'])
    .describe('"auto" fires while the button is held; "semi" fires once per click.'),
  roundsPerMinute: z.number().positive().max(3000).describe('Maximum rate of fire.'),
  damage: z.int().positive().describe('Hit points removed by one projectile.'),
  spreadDeg: z
    .number()
    .min(0)
    .max(45)
    .default(0)
    .describe('Random deviation of each shot, in degrees on each side of the aim.'),
  magazine: z.int().min(1).describe('Rounds per magazine.'),
  reloadMs: z.int().min(0).describe('Reload duration in milliseconds.'),
  reserveMagazines: z
    .int()
    .min(0)
    .nullable()
    .default(null)
    .describe(
      'Spare magazines per life; null means unlimited. A reload uses one, and the rounds left in the old magazine are lost.',
    ),
});

export type FirearmParams = z.infer<typeof firearmParams>;

export const firearm: BehaviorDefinition<FirearmParams> = {
  kind: 'weapon',
  id: 'firearm',
  description:
    'A gun firing projectiles from a magazine, with a rate of fire, spread and reload time.',
  params: firearmParams,
};

/** A full weapon at the start of a life. */
export function createFirearmState(stats: FirearmStats): WeaponState {
  return {
    weapon: stats.id,
    rounds: stats.params.magazine,
    spareMagazines: stats.params.reserveMagazines,
    cooldown: 0,
    reloadLeft: 0,
    triggerWasHeld: false,
  };
}

function startReload(world: WorldState, id: EntityId, state: WeaponState, stats: FirearmStats) {
  const { magazine, reloadMs } = stats.params;
  if (state.reloadLeft > 0 || state.rounds >= magazine || state.spareMagazines === 0) return;
  const ticks = Math.max(1, msToTicks(reloadMs));
  state.reloadLeft = ticks;
  world.events.push({ type: 'reloadStarted', entity: id, weapon: stats.id, ticks });
}

/** Runs one tick of a firearm held by an actor. */
export function updateFirearm(
  world: WorldState,
  id: EntityId,
  actor: Actor,
  state: WeaponState,
  stats: FirearmStats,
): void {
  const { fireMode, magazine, roundsPerMinute } = stats.params;

  if (state.reloadLeft > 0 && --state.reloadLeft === 0) {
    state.rounds = magazine;
    if (state.spareMagazines !== null) state.spareMagazines--;
    world.events.push({ type: 'reloaded', entity: id, weapon: stats.id });
  }
  if (hasButton(actor.input, Button.reload)) startReload(world, id, state, stats);

  const held = hasButton(actor.input, Button.fire);
  const wantsToFire = held && (fireMode === 'auto' || !state.triggerWasHeld);
  state.triggerWasHeld = held;
  const canFire = state.reloadLeft === 0 && state.rounds > 0;
  if (wantsToFire && canFire && state.cooldown <= 0) {
    state.rounds--;
    // Fractional cooldown: the average interval is exact for any rate of fire.
    state.cooldown += (60 * TICK_RATE) / roundsPerMinute;
    const projectile = world.catalog.projectiles.get(stats.projectile);
    if (projectile?.behavior === 'bullet')
      fireProjectile(world, id, actor, stats, {
        projectile: projectile.id,
        spreadDeg: stats.params.spreadDeg,
        damage: stats.params.damage,
        speed: projectile.params.speed,
        range: projectile.params.range,
        source: 'bullet',
      });
  }
  state.cooldown -= 1;
  // Firing cannot be saved up: the carry-over only applies while shooting continues.
  if (state.cooldown < 0 && !(wantsToFire && canFire)) state.cooldown = 0;

  if (state.rounds === 0) startReload(world, id, state, stats);
}
