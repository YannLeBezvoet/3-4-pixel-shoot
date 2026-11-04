// Thrown: something the character throws to the cursor, up to a maximum range (Q30), with a
// count per life (Q61). Its projectile does the rest.
import { z } from 'zod';
import type { EntityId } from '../../core/entities';
import { Button, hasButton } from '../../core/input';
import { msToTicks } from '../../core/time';
import type { ThrownStats } from '../../world/catalog';
import type { Actor, ThrowableState, WorldState } from '../../world/state';
import { launchGrenade } from '../projectiles/grenade';
import type { BehaviorDefinition } from '../registry';

export const thrownParams = z.strictObject({
  count: z.int().min(1).max(20).default(2).describe('How many a character carries per life.'),
  maxRange: z
    .number()
    .positive()
    .max(2000)
    .describe('Farthest throw in pixels (one tile is 48 pixels); nearer targets are reached.'),
  cooldownMs: z.int().min(0).default(600).describe('Shortest time between two throws.'),
});

export type ThrownParams = z.infer<typeof thrownParams>;

export const thrown: BehaviorDefinition<ThrownParams> = {
  kind: 'weapon',
  id: 'thrown',
  description:
    'A throwable carried beside the primary weapon: thrown to the cursor up to a maximum range, one per press.',
  params: thrownParams,
};

/** A full stock at the start of a life. */
export function createThrowable(stats: ThrownStats): ThrowableState {
  return { weapon: stats.id, count: stats.params.count, cooldown: 0, buttonWasHeld: false };
}

function throwAtCursor(world: WorldState, id: EntityId, actor: Actor, stats: ThrownStats): void {
  const position = world.position.get(id);
  const character = world.catalog.characters.get(actor.character);
  const projectile = world.catalog.projectiles.get(stats.projectile);
  if (!position || !character || projectile?.behavior !== 'grenade') return;

  // The cursor is on the ground, and aim and distance are measured from the hands, drawn above
  // the ground point: `gunHeight` brings it back to the ground under the cursor.
  const { aim, input } = actor;
  const toX = Math.cos(aim) * input.aimDistance;
  const toY = Math.sin(aim) * input.aimDistance - character.gunHeight;
  const distance = Math.hypot(toX, toY);
  const reach = Math.min(1, stats.params.maxRange / Math.max(distance, 1));
  const entity = launchGrenade(world, {
    stats: projectile,
    owner: id,
    team: actor.team,
    weapon: stats.id,
    x: position.x,
    y: position.y,
    z: character.gunHeight,
    targetX: position.x + toX * reach,
    targetY: position.y + toY * reach,
  });
  world.events.push({
    type: 'thrown',
    thrower: id,
    weapon: stats.id,
    x: position.x,
    y: position.y,
    projectile: entity,
  });
}

/** Runs one tick of the throwable an actor carries. */
export function updateThrown(
  world: WorldState,
  id: EntityId,
  actor: Actor,
  state: ThrowableState,
  stats: ThrownStats,
): void {
  if (state.cooldown > 0) state.cooldown--;
  const held = hasButton(actor.input, Button.throw);
  const pressed = held && !state.buttonWasHeld;
  state.buttonWasHeld = held;
  if (!pressed || state.count === 0 || state.cooldown > 0) return;
  state.count--;
  state.cooldown = msToTicks(stats.params.cooldownMs);
  throwAtCursor(world, id, actor, stats);
}
