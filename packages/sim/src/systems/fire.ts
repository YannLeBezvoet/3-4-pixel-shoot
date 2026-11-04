// 6. Fire (Q31, Q63): burning tiles and objects spread to adjacent flammable ones and burn out;
// characters standing in a fire catch it, and burning characters lose hit points for a while.
// The fire's origin stays with it as it spreads: its damage counts for whoever started it,
// who is hurt by it too, teammates only with friendly fire on (Q64).
import type { EntityId } from '../core/entities';
import { TICK_RATE } from '../core/time';
import type { MapElement } from '../world/elements';
import type { FireOrigin, WorldState } from '../world/state';

/** Sets a map element on fire, if it burns. */
export function igniteElement(world: WorldState, element: MapElement, origin: FireOrigin): void {
  const { burnTicks } = world.catalog.fire;
  if (!world.elements.ignite(element, burnTicks, TICK_RATE, origin)) return;
  const { box } = element;
  world.events.push({
    type: 'fireStarted',
    element: element.key,
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  });
}

/** Sets a character on fire, or keeps it burning for the full time from now on. */
export function igniteActor(world: WorldState, id: EntityId, origin: FireOrigin): void {
  const actor = world.actor.get(id);
  if (!actor?.alive) return;
  if (id !== origin.owner && actor.team === origin.team && !world.rules.friendlyFire) return;
  const { owner, team, weapon } = origin;
  const ticks = world.catalog.fire.characterBurnTicks;
  const carry = world.burning.get(id)?.carry ?? 0;
  world.burning.set(id, { owner, team, weapon, ticks, carry });
}

function burnElement(world: WorldState, element: MapElement): void {
  const { fire, box } = element;
  if (!fire) return;
  if (--element.spreadIn <= 0) {
    element.spreadIn = TICK_RATE;
    const random = world.random('fire');
    for (const other of world.elements.neighbors(element))
      if (other.flammable && other.burning === 0 && random.chance(world.catalog.fire.spreadChance))
        igniteElement(world, other, fire);
  }
  const { x, y, width, height } = box;
  for (const id of world.actorIndex.query(x, y, x + width, y + height)) {
    const position = world.position.get(id);
    if (!position) continue;
    const inside =
      position.x >= x && position.x <= x + width && position.y >= y && position.y <= y + height;
    if (inside) igniteActor(world, id, fire);
  }
  if (--element.burning <= 0) world.burntOut.push(element.key);
}

function burnActors(world: WorldState): void {
  const perTick = world.catalog.fire.characterDamagePerSecond / TICK_RATE;
  for (const [id, burning] of world.burning.entries()) {
    if (!world.actor.get(id)?.alive || burning.ticks <= 0) {
      world.burning.delete(id);
      continue;
    }
    burning.ticks--;
    burning.carry += perTick;
    // The small margin absorbs rounding, so that 8 per second over 3 seconds is exactly 24.
    const amount = Math.floor(burning.carry + 1e-9);
    if (amount <= 0) continue;
    burning.carry -= amount;
    const { owner: attacker, weapon } = burning;
    world.damage.push({ target: id, attacker, weapon, amount, source: 'fire' });
  }
}

export function fire(world: WorldState): void {
  for (const element of world.elements.burning()) burnElement(world, element);
  burnActors(world);
}
