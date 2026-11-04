// 6. Explosions: each one hurts the characters around it, the damage falling linearly from its
// center to its radius. Solid obstacles and cover stop the blast (Q65). The owner is always
// hurt, teammates only with friendly fire on (Q64).
import { TileFlag } from '../map/map-data';
import { BLOCKS_PROJECTILES } from '../map/map-data';
import { castSegment } from '../physics/raycast';
import type { ExplosionRequest, WorldState } from '../world/state';

const STOPS_BLASTS = BLOCKS_PROJECTILES | TileFlag.cover;

/** Whether an obstacle stands between a blast's center and a point. */
function shielded(world: WorldState, blast: ExplosionRequest, x: number, y: number): boolean {
  // A grenade may go off in the air above cover: what it is inside of does not stop its blast.
  return (
    castSegment(world.grid, blast.x, blast.y, x, y, STOPS_BLASTS, (_, t) => t === 0) !== undefined
  );
}

export function explosions(world: WorldState): void {
  for (const blast of world.explosions.splice(0)) {
    const { x, y, radius, damage, owner, team, weapon, kind } = blast;
    world.events.push({ type: 'exploded', x, y, radius, owner, weapon, kind });
    const reach = radius + world.maxActorRadius;
    for (const id of world.actorIndex.query(x - reach, y - reach, x + reach, y + reach)) {
      const actor = world.actor.get(id);
      const position = world.position.get(id);
      if (!actor?.alive || !position) continue;
      if (id !== owner && actor.team === team && !world.rules.friendlyFire) continue;
      const distance = Math.hypot(position.x - x, position.y - y);
      if (distance >= radius || shielded(world, blast, position.x, position.y)) continue;
      const amount = Math.round(damage * (1 - distance / radius));
      if (amount <= 0) continue;
      world.damage.push({ target: id, attacker: owner, weapon, amount, source: 'explosion' });
    }
  }
}
