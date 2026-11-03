// 4. Weapons and 5. projectiles: each runs the behavior chosen by the theme for the weapon or
// projectile (decision 0006). Adding a behavior means adding its updater here.
import { updateBullet } from '../behaviors/projectiles/bullet';
import { updateFirearm } from '../behaviors/weapons/firearm';
import type { EntityId } from '../core/entities';
import type { ProjectileStats, WeaponStats } from '../world/catalog';
import type { Actor, Projectile, WeaponState, WorldState } from '../world/state';

type WeaponUpdater = (
  world: WorldState,
  id: EntityId,
  actor: Actor,
  state: WeaponState,
  stats: WeaponStats,
) => void;
type ProjectileUpdater = (world: WorldState, id: EntityId, projectile: Projectile) => void;

const WEAPON_UPDATERS: Record<WeaponStats['behavior'], WeaponUpdater> = {
  firearm: updateFirearm,
};
const PROJECTILE_UPDATERS: Record<ProjectileStats['behavior'], ProjectileUpdater> = {
  bullet: updateBullet,
};

export function weapons(world: WorldState): void {
  for (const [id, state] of world.weapon.entries()) {
    const actor = world.actor.get(id);
    const stats = world.catalog.weapons.get(state.weapon);
    if (actor?.alive && stats) WEAPON_UPDATERS[stats.behavior](world, id, actor, state, stats);
  }
}

export function projectiles(world: WorldState): void {
  // Projectiles removed during the loop are skipped by the Map iterator.
  for (const [id, projectile] of world.projectile.entries()) {
    const stats = world.catalog.projectiles.get(projectile.kind);
    if (stats) PROJECTILE_UPDATERS[stats.behavior](world, id, projectile);
  }
}
