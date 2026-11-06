// What every gun does at each shot: a direction within its spread, a projectile leaving the
// muzzle, unless a wall the shooter stands against stops it first.
import { degToRad } from '@pixel-shoot/shared';
import type { DamageSource } from '../../core/events';
import type { EntityId } from '../../core/entities';
import { TICK_RATE } from '../../core/time';
import { igniteElement } from '../../systems/fire';
import type { WeaponStats } from '../../world/catalog';
import type { Actor, WorldState } from '../../world/state';
import { resolveTrace, traceProjectile } from '../../world/trace';

export interface Shot {
  /** Projectile id in the catalog. */
  readonly projectile: string;
  readonly spreadDeg: number;
  readonly damage: number;
  /** World units per second. */
  readonly speed: number;
  /** World units. */
  readonly range: number;
  readonly source: DamageSource;
}

/** Fires one projectile. Returns it, or undefined when it never left the muzzle. */
export function fireProjectile(
  world: WorldState,
  id: EntityId,
  actor: Actor,
  stats: WeaponStats,
  shot: Shot,
): EntityId | undefined {
  const position = world.position.get(id);
  const character = world.catalog.characters.get(actor.character);
  if (!position || !character) return undefined;

  const spread = degToRad(shot.spreadDeg);
  const angle = actor.aim + (spread > 0 ? world.random('weapons').range(-spread, spread) : 0);
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const muzzleDistance = character.handReach + stats.barrelLength;
  const muzzleX = position.x + dirX * muzzleDistance;
  const muzzleY = position.y + dirY * muzzleDistance;
  const z = character.gunHeight;

  // Between the body and the muzzle: nobody fires through a wall they stand against, but the
  // weapon reaches over cover, and every bullet it fires passes that cover (Q29).
  const over: number[] = [];
  const blocked = traceProjectile(
    world,
    id,
    actor.team,
    position.x,
    position.y,
    muzzleX,
    muzzleY,
    ({ object }) => {
      if (object !== undefined && !over.includes(object)) over.push(object);
      return true;
    },
  );
  let entity: EntityId | undefined;
  if (!blocked) {
    entity = world.nextEntity++;
    world.position.set(entity, { x: muzzleX, y: muzzleY });
    world.projectile.set(entity, {
      kind: shot.projectile,
      owner: id,
      team: actor.team,
      weapon: stats.id,
      dirX,
      dirY,
      speed: shot.speed / TICK_RATE,
      damage: shot.damage,
      z,
      remaining: shot.range,
      passed: over,
    });
  }
  world.events.push({
    type: 'shotFired',
    shooter: id,
    weapon: stats.id,
    x: muzzleX,
    y: muzzleY,
    z,
    angle,
    projectile: entity,
  });
  if (blocked) {
    resolveTrace(world, blocked, {
      projectile: undefined,
      kind: shot.projectile,
      owner: id,
      team: actor.team,
      weapon: stats.id,
      damage: shot.damage,
      source: shot.source,
      z,
      angle,
    });
    // No flame leaves the nozzle, but what it is pressed against catches all the same (Q79).
    if (shot.source === 'fire' && blocked.kind === 'obstacle' && blocked.element)
      igniteElement(world, blocked.element, { owner: id, team: actor.team, weapon: stats.id });
  }
  return entity;
}
