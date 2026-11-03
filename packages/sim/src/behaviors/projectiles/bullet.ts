// Bullet: a fast projectile flying straight at the height of the gun. Each tick it sweeps the
// segment it travels, so it never crosses a wall or a character at any speed (decision 0010).
import { z } from 'zod';
import type { EntityId } from '../../core/entities';
import type { Projectile, WorldState } from '../../world/state';
import { removeEntity } from '../../world/state';
import { passesCover, resolveTrace, traceProjectile } from '../../world/trace';
import type { BehaviorDefinition } from '../registry';

/** Fastest bullet allowed: 100 world units per tick, about two tiles. */
export const MAX_BULLET_SPEED = 6000;

export const bulletParams = z.strictObject({
  speed: z
    .number()
    .positive()
    .max(MAX_BULLET_SPEED)
    .describe('Speed in pixels per second (one tile is 48 pixels).'),
  range: z
    .number()
    .positive()
    .max(5000)
    .describe('Distance in pixels from the muzzle after which the bullet disappears.'),
});

export type BulletParams = z.infer<typeof bulletParams>;

export const bullet: BehaviorDefinition<BulletParams> = {
  kind: 'projectile',
  id: 'bullet',
  description:
    'A projectile flying straight at gun height until it hits a character, a solid obstacle or cover it fails to pass, or reaches its range.',
  params: bulletParams,
};

/** Advances a bullet by one tick. */
export function updateBullet(world: WorldState, id: EntityId, bullet: Projectile): void {
  const position = world.position.get(id);
  if (!position) return;
  const distance = Math.min(bullet.speed, bullet.remaining);
  const toX = position.x + bullet.dirX * distance;
  const toY = position.y + bullet.dirY * distance;
  const result = traceProjectile(
    world,
    bullet.owner,
    bullet.team,
    position.x,
    position.y,
    toX,
    toY,
    (footprint) => passesCover(world, bullet, footprint),
  );
  if (result) {
    resolveTrace(world, result, {
      projectile: id,
      kind: bullet.kind,
      owner: bullet.owner,
      weapon: bullet.weapon,
      damage: bullet.damage,
      z: bullet.z,
      angle: Math.atan2(bullet.dirY, bullet.dirX),
    });
    removeEntity(world, id);
    return;
  }
  position.x = toX;
  position.y = toY;
  bullet.remaining -= distance;
  if (bullet.remaining <= 0) removeEntity(world, id);
}
