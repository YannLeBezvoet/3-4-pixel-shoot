// The gameplay content a simulation runs with, already validated and converted to engine
// units. `content` builds it from a theme; tests build it by hand.
import type { BulletParams } from '../behaviors/projectiles/bullet';
import type { GrenadeParams } from '../behaviors/projectiles/grenade';
import type { FirearmParams } from '../behaviors/weapons/firearm';
import type { ThrownParams } from '../behaviors/weapons/thrown';

export interface CharacterStats {
  readonly id: string;
  /** Top speed, in world units per second. */
  readonly speed: number;
  /** Radius of the collider circle around the ground point, in world units. */
  readonly radius: number;
  readonly hitPoints: number;
  /** Primary weapon (Q17, Q61). */
  readonly weapon: string;
  /** Thrown weapon carried along with the primary one, if any (Q61). */
  readonly throwable?: string;
  /** Height of the hands above the ground point: projectiles fly at this height. */
  readonly gunHeight: number;
  /** How far ahead of the ground point the hands hold the weapon, in world units. */
  readonly handReach: number;
}

interface WeaponCommon {
  readonly id: string;
  readonly projectile: string;
  /** Distance from the grip to the muzzle, in world units. Shots start at hand reach + barrel. */
  readonly barrelLength: number;
}

/** Parameters are validated by the behavior's schema, defaults applied. */
export interface FirearmStats extends WeaponCommon {
  readonly behavior: 'firearm';
  readonly params: FirearmParams;
}

export interface ThrownStats extends WeaponCommon {
  readonly behavior: 'thrown';
  readonly params: ThrownParams;
}

export type WeaponStats = FirearmStats | ThrownStats;

export interface BulletStats {
  readonly id: string;
  readonly behavior: 'bullet';
  readonly params: BulletParams;
}

export interface GrenadeStats {
  readonly id: string;
  readonly behavior: 'grenade';
  readonly params: GrenadeParams;
}

export type ProjectileStats = BulletStats | GrenadeStats;

/** The projectile behavior each weapon behavior fires. */
export const PROJECTILE_OF_WEAPON = {
  firearm: 'bullet',
  thrown: 'grenade',
} as const satisfies Record<WeaponStats['behavior'], ProjectileStats['behavior']>;

export interface Catalog {
  readonly characters: ReadonlyMap<string, CharacterStats>;
  readonly weapons: ReadonlyMap<string, WeaponStats>;
  readonly projectiles: ReadonlyMap<string, ProjectileStats>;
}

/** Builds a catalog from lists, checking references. For tests, tools and content loading. */
export function createCatalog(content: {
  characters: readonly CharacterStats[];
  weapons: readonly WeaponStats[];
  projectiles: readonly ProjectileStats[];
}): Catalog {
  const byId = <T extends { id: string }>(items: readonly T[]) =>
    new Map(items.map((item) => [item.id, item]));
  const catalog: Catalog = {
    characters: byId(content.characters),
    weapons: byId(content.weapons),
    projectiles: byId(content.projectiles),
  };
  for (const character of content.characters) {
    const weapon = catalog.weapons.get(character.weapon);
    if (!weapon)
      throw new Error(`Character "${character.id}" uses unknown weapon "${character.weapon}".`);
    if (weapon.behavior === 'thrown')
      throw new Error(`Character "${character.id}" has a thrown weapon as its primary weapon.`);
    if (character.throwable === undefined) continue;
    const throwable = catalog.weapons.get(character.throwable);
    if (throwable?.behavior !== 'thrown')
      throw new Error(
        `Character "${character.id}" carries "${character.throwable}", which is not a thrown weapon.`,
      );
  }
  for (const weapon of content.weapons) {
    const projectile = catalog.projectiles.get(weapon.projectile);
    if (!projectile)
      throw new Error(`Weapon "${weapon.id}" uses unknown projectile "${weapon.projectile}".`);
    if (projectile.behavior !== PROJECTILE_OF_WEAPON[weapon.behavior])
      throw new Error(
        `Weapon "${weapon.id}" (${weapon.behavior}) cannot fire "${projectile.id}" (${projectile.behavior}).`,
      );
  }
  return catalog;
}
