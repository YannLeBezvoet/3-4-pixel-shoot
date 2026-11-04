// 7. Damage and deaths: applies the damage queued during the tick (Q15: hit points, no
// regeneration, no armor). A character at 0 hit points dies and stays as a corpse (Q28).
import type { WorldState } from '../world/state';
import { indexActors } from '../world/state';

export function damage(world: WorldState): void {
  if (world.damage.length === 0) return;
  let deaths = false;
  for (const request of world.damage.splice(0)) {
    const actor = world.actor.get(request.target);
    const health = world.health.get(request.target);
    if (!actor?.alive || !health) continue;
    health.hp = Math.max(0, health.hp - request.amount);
    world.events.push({
      type: 'damaged',
      target: request.target,
      attacker: request.attacker,
      weapon: request.weapon,
      source: request.source,
      amount: request.amount,
      hp: health.hp,
    });
    if (health.hp > 0) continue;

    actor.alive = false;
    deaths = true;
    const velocity = world.velocity.get(request.target);
    if (velocity) {
      velocity.x = 0;
      velocity.y = 0;
    }
    const weapon = world.weapon.get(request.target);
    if (weapon) weapon.reloadLeft = 0;
    const position = world.position.get(request.target);
    world.events.push({
      type: 'killed',
      victim: request.target,
      killer: request.attacker,
      weapon: request.weapon,
      source: request.source,
      x: position?.x ?? 0,
      y: position?.y ?? 0,
    });
  }
  if (deaths) indexActors(world);
}
