// 6. Explosions: each one hurts the characters and map elements around it, the damage falling
// linearly from its center to its radius. Solid obstacles and cover stop the blast (Q65). The
// owner is always hurt, teammates only with friendly fire on (Q64).
import { TileFlag } from '../map/map-data';
import { BLOCKS_PROJECTILES } from '../map/map-data';
import { castSegment } from '../physics/raycast';
import type { MapElement } from '../world/elements';
import type { ExplosionRequest, WorldState } from '../world/state';

const STOPS_BLASTS = BLOCKS_PROJECTILES | TileFlag.cover;
/** A cast stopped this close to its end reached the point it aimed for. */
const REACHED = 0.999;

/** Whether an obstacle stands between a blast's center and a point. */
function shielded(world: WorldState, blast: ExplosionRequest, x: number, y: number): boolean {
  // A grenade may go off in the air above cover: what it is inside of does not stop its blast.
  return (
    castSegment(world.grid, blast.x, blast.y, x, y, STOPS_BLASTS, (_, t) => t === 0) !== undefined
  );
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Hurts an element in the blast, unless another obstacle shields it. */
function hurtElement(world: WorldState, blast: ExplosionRequest, element: MapElement): void {
  const { x, y, radius, damage, owner, team, weapon } = blast;
  if (element.hp === undefined) return;
  const { box } = element;
  const nearX = clamp(x, box.x, box.x + box.width);
  const nearY = clamp(y, box.y, box.y + box.height);
  const distance = Math.hypot(nearX - x, nearY - y);
  if (distance >= radius) return;
  const hit = castSegment(world.grid, x, y, nearX, nearY, STOPS_BLASTS, (_, t) => t === 0);
  // The cast ends on the element's side, so meeting the element itself is the expected end.
  if (hit && hit.t < REACHED && world.elements.at(hit) !== element) return;
  const amount = Math.round(damage * (1 - distance / radius));
  if (amount <= 0) return;
  world.elementDamage.push({
    element: element.key,
    attacker: owner,
    team,
    weapon,
    amount,
    source: 'explosion',
  });
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
    for (const element of world.elements.near(x, y, radius)) hurtElement(world, blast, element);
  }
}
