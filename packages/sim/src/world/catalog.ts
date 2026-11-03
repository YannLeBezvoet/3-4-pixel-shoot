// The gameplay content a simulation runs with, already validated and converted to engine
// units. `content` builds it from a theme; tests build it by hand.
import type { BulletParams } from '../behaviors/projectiles/bullet';
import type { FirearmParams } from '../behaviors/weapons/firearm';

export interface CharacterStats {
  readonly id: string;
  /** Top speed, in world units per second. */
  readonly speed: number;
  /** Radius of the collider circle around the ground point, in world units. */
  readonly radius: number;
  readonly hitPoints: number;
  /** Default weapon (Q17). */
  readonly weapon: string;
  /** Height of the hands above the ground point: projectiles fly at this height. */
  readonly gunHeight: number;
  /** How far ahead of the ground point the hands hold the weapon, in world units. */
  readonly handReach: number;
}

export interface WeaponStats {
  readonly id: string;
  readonly behavior: 'firearm';
  /** Parameters validated by the behavior's schema, defaults applied. */
  readonly params: FirearmParams;
  readonly projectile: string;
  /** Distance from the grip to the muzzle, in world units. Shots start at hand reach + barrel. */
  readonly barrelLength: number;
}

export interface ProjectileStats {
  readonly id: string;
  readonly behavior: 'bullet';
  readonly params: BulletParams;
}

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
  for (const character of content.characters)
    if (!catalog.weapons.has(character.weapon))
      throw new Error(`Character "${character.id}" uses unknown weapon "${character.weapon}".`);
  for (const weapon of content.weapons)
    if (!catalog.projectiles.has(weapon.projectile))
      throw new Error(`Weapon "${weapon.id}" uses unknown projectile "${weapon.projectile}".`);
  return catalog;
}
