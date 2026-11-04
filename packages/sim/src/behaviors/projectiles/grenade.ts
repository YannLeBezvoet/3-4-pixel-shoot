// Grenade: flies in an arc in height `z` to land on its target, bounces off solid obstacles,
// flies over cover, rolls to a stop and goes off when its fuse ends, counted from the throw
// (Q30). Collision happens on the ground plane; `z` only says what it clears.
import { z } from 'zod';
import type { EntityId } from '../../core/entities';
import { TICK_RATE, msToTicks } from '../../core/time';
import { BLOCKS_PROJECTILES, TileFlag } from '../../map/map-data';
import { castSegment } from '../../physics/raycast';
import type { GrenadeStats } from '../../world/catalog';
import type { Grenade, Projectile, WorldState } from '../../world/state';
import { removeEntity } from '../../world/state';
import type { BehaviorDefinition } from '../registry';

/** Below this height, a grenade hits cover instead of flying over it. */
export const COVER_HEIGHT = 16;
/** A landing slower than this, in world units per second, ends the bouncing: it rolls. */
const SETTLE_SPEED = 30;
/** How far from an obstacle a bounce leaves the grenade, so it does not meet it again. */
const CLEARANCE = 0.01;

export const grenadeParams = z.strictObject({
  speed: z
    .number()
    .positive()
    .max(1500)
    .describe('Speed over the ground in pixels per second (one tile is 48 pixels).'),
  gravity: z.number().positive().default(900).describe('Pixels per second squared.'),
  restitution: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Share of its speed a bounce keeps: 0 stops dead, 1 loses nothing.'),
  friction: z
    .number()
    .min(0)
    .default(400)
    .describe('Slowdown while rolling, in pixels per second squared.'),
  fuseMs: z.int().positive().default(2500).describe('Time from the throw to the explosion.'),
  blastRadius: z
    .number()
    .positive()
    .max(1000)
    .describe('Pixels; nothing is hurt at this distance or beyond.'),
  blastDamage: z.int().positive().describe('Damage at the center, falling linearly to 0.'),
});

export type GrenadeParams = z.infer<typeof grenadeParams>;

export const grenade: BehaviorDefinition<GrenadeParams> = {
  kind: 'projectile',
  id: 'grenade',
  description:
    'A thrown explosive: an arc that lands on its target, bounces off solid obstacles, flies over cover, rolls to a stop and explodes at the end of its fuse.',
  params: grenadeParams,
};

export interface GrenadeLaunch {
  readonly stats: GrenadeStats;
  readonly owner: EntityId;
  readonly team: number;
  readonly weapon: string;
  /** Ground point and height it leaves from. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Where it first touches the ground. */
  readonly targetX: number;
  readonly targetY: number;
}

export function launchGrenade(world: WorldState, launch: GrenadeLaunch): EntityId {
  const { speed, gravity, fuseMs } = launch.stats.params;
  const dx = launch.targetX - launch.x;
  const dy = launch.targetY - launch.y;
  const distance = Math.hypot(dx, dy);
  const dirX = distance > 0 ? dx / distance : 1;
  const dirY = distance > 0 ? dy / distance : 0;
  // Flight time at the throw's ground speed, and the upward speed that lands it then.
  const flight = Math.max(distance / speed, 1 / TICK_RATE);
  const id = world.nextEntity++;
  world.position.set(id, { x: launch.x, y: launch.y });
  world.projectile.set(id, {
    kind: launch.stats.id,
    owner: launch.owner,
    team: launch.team,
    weapon: launch.weapon,
    dirX,
    dirY,
    speed: 0,
    damage: 0,
    z: launch.z,
    remaining: 0,
    passed: [],
  });
  world.grenade.set(id, {
    vx: (dx / flight) * (distance > 0 ? 1 : 0),
    vy: (dy / flight) * (distance > 0 ? 1 : 0),
    vz: (gravity * flight) / 2 - launch.z / flight,
    fuse: msToTicks(fuseMs),
  });
  return id;
}

/** Moves on the ground plane for one tick, bouncing off what stands in the way. */
function moveOnGround(
  world: WorldState,
  id: EntityId,
  grenade: Grenade,
  height: number,
  restitution: number,
): void {
  const position = world.position.get(id);
  if (!position) return;
  const toX = position.x + grenade.vx / TICK_RATE;
  const toY = position.y + grenade.vy / TICK_RATE;
  const mask = height < COVER_HEIGHT ? BLOCKS_PROJECTILES | TileFlag.cover : BLOCKS_PROJECTILES;
  const hit = castSegment(world.grid, position.x, position.y, toX, toY, mask);
  if (!hit) {
    position.x = toX;
    position.y = toY;
    return;
  }
  const along = grenade.vx * hit.normalX + grenade.vy * hit.normalY;
  grenade.vx = (grenade.vx - (1 + restitution) * along * hit.normalX) * restitution;
  grenade.vy = (grenade.vy - (1 + restitution) * along * hit.normalY) * restitution;
  position.x = hit.x + hit.normalX * CLEARANCE;
  position.y = hit.y + hit.normalY * CLEARANCE;
}

/** Vertical motion for one tick: falls, bounces on the ground, then rolls and slows down. */
function moveInHeight(grenade: Grenade, projectile: Projectile, stats: GrenadeStats): void {
  const { gravity, restitution, friction } = stats.params;
  if (projectile.z <= 0 && grenade.vz === 0) {
    const speed = Math.hypot(grenade.vx, grenade.vy);
    const slowed = Math.max(0, speed - friction / TICK_RATE);
    grenade.vx *= speed > 0 ? slowed / speed : 0;
    grenade.vy *= speed > 0 ? slowed / speed : 0;
    return;
  }
  // The mean of the speeds before and after is exact under constant gravity.
  const before = grenade.vz;
  grenade.vz -= gravity / TICK_RATE;
  projectile.z += (before + grenade.vz) / 2 / TICK_RATE;
  if (projectile.z > 0) return;
  projectile.z = 0;
  const bounce = -grenade.vz * restitution;
  grenade.vz = bounce < SETTLE_SPEED ? 0 : bounce;
  grenade.vx *= restitution;
  grenade.vy *= restitution;
}

/** Advances a grenade by one tick. */
export function updateGrenade(
  world: WorldState,
  id: EntityId,
  projectile: Projectile,
  stats: GrenadeStats,
): void {
  const grenade = world.grenade.get(id);
  const position = world.position.get(id);
  if (!grenade || !position) return;

  if (--grenade.fuse <= 0) {
    world.explosions.push({
      x: position.x,
      y: position.y,
      radius: stats.params.blastRadius,
      damage: stats.params.blastDamage,
      owner: projectile.owner,
      team: projectile.team,
      weapon: projectile.weapon,
      kind: projectile.kind,
    });
    removeEntity(world, id);
    return;
  }
  moveOnGround(world, id, grenade, projectile.z, stats.params.restitution);
  moveInHeight(grenade, projectile, stats);
  if (grenade.vx !== 0 || grenade.vy !== 0) {
    const speed = Math.hypot(grenade.vx, grenade.vy);
    projectile.dirX = grenade.vx / speed;
    projectile.dirY = grenade.vy / speed;
  }
}
