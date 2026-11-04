// 4. Weapons and 5. projectiles: each runs the behavior chosen by the theme for the weapon or
// projectile (decision 0006). Adding a behavior means adding its case here.
import { updateBullet } from '../behaviors/projectiles/bullet';
import { updateGrenade } from '../behaviors/projectiles/grenade';
import { updateFirearm } from '../behaviors/weapons/firearm';
import { updateThrown } from '../behaviors/weapons/thrown';
import type { WorldState } from '../world/state';

export function weapons(world: WorldState): void {
  for (const [id, state] of world.weapon.entries()) {
    const actor = world.actor.get(id);
    const stats = world.catalog.weapons.get(state.weapon);
    if (!actor?.alive || !stats) continue;
    if (stats.behavior === 'firearm') updateFirearm(world, id, actor, state, stats);
    const throwable = world.throwable.get(id);
    const thrown = throwable && world.catalog.weapons.get(throwable.weapon);
    if (thrown?.behavior === 'thrown') updateThrown(world, id, actor, throwable!, thrown);
  }
}

export function projectiles(world: WorldState): void {
  // Projectiles removed during the loop are skipped by the Map iterator.
  for (const [id, projectile] of world.projectile.entries()) {
    const stats = world.catalog.projectiles.get(projectile.kind);
    if (stats?.behavior === 'bullet') updateBullet(world, id, projectile);
    else if (stats?.behavior === 'grenade') updateGrenade(world, id, projectile, stats);
  }
}
