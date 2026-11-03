// What a projectile's path meets first: an obstacle that stops projectiles, cover it fails to
// pass, or a character it may hit. Its owner is never hit; teammates only with friendly fire
// on (Q49).
import type { EntityId } from '../core/entities';
import type { Footprint } from '../map/map-data';
import { BLOCKS_PROJECTILES, TileFlag } from '../map/map-data';
import { segmentEntersCircle } from '../physics/geometry';
import { castSegment } from '../physics/raycast';
import type { Projectile, WorldState } from './state';

export type TraceResult =
  | { readonly kind: 'obstacle'; readonly x: number; readonly y: number }
  | { readonly kind: 'actor'; readonly target: EntityId; readonly x: number; readonly y: number };

/**
 * `passesCover` decides about each cover footprint met before any character, in path order;
 * true lets the projectile through.
 */
export function traceProjectile(
  world: WorldState,
  owner: EntityId,
  team: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  passesCover: (footprint: Footprint) => boolean,
): TraceResult | undefined {
  let bestT = Infinity;
  let target: EntityId | undefined;

  const reach = world.maxActorRadius;
  const candidates = world.actorIndex.query(
    Math.min(ax, bx) - reach,
    Math.min(ay, by) - reach,
    Math.max(ax, bx) + reach,
    Math.max(ay, by) + reach,
  );
  for (const id of candidates) {
    if (id === owner) continue;
    const actor = world.actor.get(id);
    const position = world.position.get(id);
    const body = world.body.get(id);
    if (!actor?.alive || !position || !body) continue;
    if (actor.team === team && !world.rules.friendlyFire) continue;
    const t = segmentEntersCircle(ax, ay, bx, by, position.x, position.y, body.radius);
    // Candidates come by increasing id, so a tie goes to the lowest id.
    if (t !== undefined && t < bestT) {
      bestT = t;
      target = id;
    }
  }

  // Cover beyond the character hit is never tried. An obstacle wins a tie with a character.
  const hitT = bestT;
  const obstacle = castSegment(
    world.grid,
    ax,
    ay,
    bx,
    by,
    BLOCKS_PROJECTILES | TileFlag.cover,
    (footprint, t) =>
      t > hitT || ((footprint.flags & BLOCKS_PROJECTILES) === 0 && passesCover(footprint)),
  );
  if (obstacle && obstacle.t <= bestT) {
    bestT = obstacle.t;
    target = undefined;
  }

  if (bestT === Infinity) return undefined;
  const x = ax + (bx - ax) * bestT;
  const y = ay + (by - ay) * bestT;
  return target === undefined ? { kind: 'obstacle', x, y } : { kind: 'actor', target, x, y };
}

/**
 * Whether a flying projectile passes a cover footprint (Q29): always when it was fired over that
 * object or already passed it, otherwise with the footprint's chance, drawn once per object.
 */
export function passesCover(
  world: WorldState,
  projectile: Projectile,
  footprint: Footprint,
): boolean {
  const { object } = footprint;
  if (object !== undefined && projectile.passed.includes(object)) return true;
  if (!world.random('cover').chance((footprint.bulletPassPercent ?? 0) / 100)) return false;
  if (object !== undefined) projectile.passed.push(object);
  return true;
}

/** What a projectile carries when it stops. */
export interface ShotInfo {
  /** The projectile entity, or undefined for a shot stopped before leaving the muzzle. */
  readonly projectile: EntityId | undefined;
  /** Projectile id in the catalog. */
  readonly kind: string;
  readonly owner: EntityId;
  readonly weapon: string;
  readonly damage: number;
  readonly z: number;
  readonly angle: number;
}

/**
 * Reports where a projectile stopped: a `hit` on a character, whose damage is applied by the
 * damage system later in the tick, or a `projectileImpact`.
 */
export function resolveTrace(world: WorldState, result: TraceResult, shot: ShotInfo): void {
  const { projectile, kind, z, angle } = shot;
  const { x, y } = result;
  if (result.kind === 'obstacle') {
    world.events.push({ type: 'projectileImpact', projectile, kind, x, y, z, angle });
    return;
  }
  world.damage.push({
    target: result.target,
    attacker: shot.owner,
    weapon: shot.weapon,
    amount: shot.damage,
  });
  world.events.push({
    type: 'hit',
    projectile,
    kind,
    attacker: shot.owner,
    target: result.target,
    weapon: shot.weapon,
    damage: shot.damage,
    x,
    y,
    z,
    angle,
  });
}
