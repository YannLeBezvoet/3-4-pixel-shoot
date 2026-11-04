// A small catalog for the tests of every package: one rifleman with a rifle and grenades, with
// the initial gameplay values of Q54 and Q70. Parameters can be overridden per test.
import type { BulletParams } from '../behaviors/projectiles/bullet';
import type { GrenadeParams } from '../behaviors/projectiles/grenade';
import type { FirearmParams } from '../behaviors/weapons/firearm';
import type { ThrownParams } from '../behaviors/weapons/thrown';
import type { Catalog, CharacterStats } from '../world/catalog';
import { createCatalog } from '../world/catalog';

export interface TestCatalogOptions {
  readonly character?: Partial<Omit<CharacterStats, 'id' | 'weapon'>>;
  readonly weapon?: Partial<FirearmParams>;
  /** Grip-to-muzzle length; the test character's hand reach is 0 unless overridden. */
  readonly barrelLength?: number;
  readonly bullet?: Partial<BulletParams>;
  readonly thrown?: Partial<ThrownParams>;
  readonly grenade?: Partial<GrenadeParams>;
}

/**
 * Character "rifleman" carrying weapon "rifle", which fires projectile "bullet", and throwable
 * "frag", which throws projectile "grenade".
 */
export function testCatalog(options: TestCatalogOptions = {}): Catalog {
  return createCatalog({
    characters: [
      {
        id: 'rifleman',
        speed: 180,
        radius: 10,
        hitPoints: 100,
        gunHeight: 20,
        handReach: 0,
        ...options.character,
        weapon: 'rifle',
        throwable: 'frag',
      },
    ],
    weapons: [
      {
        id: 'rifle',
        behavior: 'firearm',
        params: {
          fireMode: 'auto',
          roundsPerMinute: 750,
          damage: 28,
          spreadDeg: 0,
          magazine: 20,
          reloadMs: 2200,
          reserveMagazines: null,
          ...options.weapon,
        },
        projectile: 'bullet',
        barrelLength: options.barrelLength ?? 24,
      },
      {
        id: 'frag',
        behavior: 'thrown',
        params: { count: 2, maxRange: 384, cooldownMs: 600, ...options.thrown },
        projectile: 'grenade',
        barrelLength: 0,
      },
    ],
    projectiles: [
      { id: 'bullet', behavior: 'bullet', params: { speed: 1500, range: 900, ...options.bullet } },
      {
        id: 'grenade',
        behavior: 'grenade',
        params: {
          speed: 420,
          gravity: 900,
          restitution: 0.4,
          friction: 400,
          fuseMs: 2500,
          blastRadius: 144,
          blastDamage: 120,
          ...options.grenade,
        },
      },
    ],
  });
}
