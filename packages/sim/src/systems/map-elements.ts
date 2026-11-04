// 8. Map elements (Q33): applies the damage they took during the tick, within their damage
// filter, and consumes what finished burning (Q31). An element at 0 hit points is destroyed: a
// tile becomes its destroyed variant and the collision grid follows; an object loses its
// collision and leaves its destroyed picture, if any. An element burnt out goes the same way
// to its burnt variant. An explosive element then goes off, during the next tick's step 6.
import type { DamageSource } from '../core/events';
import { DamageFilter } from '../map/map-data';
import type { MapElement } from '../world/elements';
import type { FireOrigin, WorldState } from '../world/state';

const hurtBy = (element: MapElement, source: DamageSource) =>
  (element.damageFilter & DamageFilter[source]) !== 0;

function replaceTiles(world: WorldState, element: MapElement, burnt: boolean): void {
  const { map, elements } = world;
  const { tileX, tileY, key } = element;
  map.layers.forEach((layer, index) => {
    const type = map.tileTypes[elements.tileIn(index, key)];
    if (!type?.element) return;
    const affected = burnt
      ? type.element.flammable
      : layer.role === 'ground' && type.element.hp !== undefined;
    if (!affected) return;
    const tile = (burnt ? type.burntTile : undefined) ?? type.destroyedTile ?? 0;
    elements.setTile(index, tileX, tileY, tile);
    world.events.push({ type: 'tileChanged', layer: index, tileX, tileY, tile });
  });
  elements.refreshTile(element);
}

function destroy(world: WorldState, element: MapElement, cause: FireOrigin, burnt: boolean): void {
  if (element.burning > 0 || burnt) {
    world.elements.extinguish(element);
    world.events.push({ type: 'fireEnded', element: element.key });
  }
  if (element.object) world.elements.removeObject(element);
  else replaceTiles(world, element, burnt);
  const { box } = element;
  world.events.push({
    type: 'elementDestroyed',
    object: element.object?.id,
    box,
    attacker: cause.owner,
    burnt,
  });
  if (element.explosive)
    world.explosions.push({
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      ...element.explosive,
      owner: cause.owner,
      team: cause.team,
      weapon: cause.weapon,
      kind: undefined,
    });
}

export function mapElements(world: WorldState): void {
  for (const request of world.elementDamage.splice(0)) {
    const element = world.elements.get(request.element);
    if (element?.hp === undefined || !hurtBy(element, request.source)) continue;
    element.hp = Math.max(0, element.hp - request.amount);
    if (element.hp > 0) continue;
    const { attacker: owner, team, weapon } = request;
    destroy(world, element, { owner, team, weapon }, false);
  }
  for (const key of world.burntOut.splice(0)) {
    const element = world.elements.get(key);
    if (element?.fire) destroy(world, element, element.fire, true);
  }
}
