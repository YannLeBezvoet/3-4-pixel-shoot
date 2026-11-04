// Flame: a short-lived particle of a flamethrower's jet. It hurts and ignites the character it
// hits, ignites what it flies over and what it stops against (Q31), and stops at obstacles.
// Cover stops it, unless the flamethrower reaches over that cover (Q29).
import { z } from 'zod';
import type { EntityId } from '../../core/entities';
import { igniteActor, igniteElement } from '../../systems/fire';
import type { Footprint } from '../../map/map-data';
import type { FireOrigin, Projectile, WorldState } from '../../world/state';
import { removeEntity } from '../../world/state';
import { resolveTrace, traceProjectile } from '../../world/trace';
import type { BehaviorDefinition } from '../registry';

export const flameParams = z.strictObject({
  speed: z
    .number()
    .positive()
    .max(1200)
    .describe('Speed in pixels per second (one tile is 48 pixels).'),
  range: z
    .number()
    .positive()
    .max(1000)
    .describe('Distance in pixels from the muzzle after which the flame disappears.'),
});

export type FlameParams = z.infer<typeof flameParams>;

export const flame: BehaviorDefinition<FlameParams> = {
  kind: 'projectile',
  id: 'flame',
  description:
    'A short-lived particle of fire: it hurts and ignites the character it hits, ignites flammable tiles and objects it touches, and stops at obstacles.',
  params: flameParams,
};

/** Ignites what burns at a point. */
function igniteAt(world: WorldState, x: number, y: number, origin: FireOrigin): void {
  for (const element of world.elements.atPoint(x, y)) igniteElement(world, element, origin);
}

/** Advances a flame by one tick. */
export function updateFlame(world: WorldState, id: EntityId, flame: Projectile): void {
  const position = world.position.get(id);
  if (!position) return;
  const { owner, team, weapon } = flame;
  const origin = { owner, team, weapon };
  const distance = Math.min(flame.speed, flame.remaining);
  const toX = position.x + flame.dirX * distance;
  const toY = position.y + flame.dirY * distance;
  const passes = ({ object }: Footprint) => object !== undefined && flame.passed.includes(object);
  const result = traceProjectile(world, owner, team, position.x, position.y, toX, toY, passes);
  if (result) {
    resolveTrace(world, result, {
      projectile: id,
      kind: flame.kind,
      owner,
      team,
      weapon,
      damage: flame.damage,
      source: 'fire',
      z: flame.z,
      angle: Math.atan2(flame.dirY, flame.dirX),
    });
    if (result.kind === 'actor') igniteActor(world, result.target, origin);
    else if (result.element) igniteElement(world, result.element, origin);
    igniteAt(world, result.x, result.y, origin);
    removeEntity(world, id);
    return;
  }
  position.x = toX;
  position.y = toY;
  flame.remaining -= distance;
  igniteAt(world, toX, toY, origin);
  if (flame.remaining <= 0) removeEntity(world, id);
}
