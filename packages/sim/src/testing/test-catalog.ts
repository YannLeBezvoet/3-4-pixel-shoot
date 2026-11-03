// A small catalog for the tests of every package: one rifleman, one rifle, one bullet, with
// the initial gameplay values of Q54. Parameters can be overridden per test.
import type { BulletParams } from '../behaviors/projectiles/bullet';
import type { FirearmParams } from '../behaviors/weapons/firearm';
import type { Catalog, CharacterStats } from '../world/catalog';
import { createCatalog } from '../world/catalog';

export interface TestCatalogOptions {
  readonly character?: Partial<Omit<CharacterStats, 'id' | 'weapon'>>;
  readonly weapon?: Partial<FirearmParams>;
  /** Grip-to-muzzle length; the test character's hand reach is 0 unless overridden. */
  readonly barrelLength?: number;
  readonly bullet?: Partial<BulletParams>;
}

/** Character "rifleman" carrying weapon "rifle", which fires projectile "bullet". */
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
    ],
    projectiles: [
      { id: 'bullet', behavior: 'bullet', params: { speed: 1500, range: 900, ...options.bullet } },
    ],
  });
}
